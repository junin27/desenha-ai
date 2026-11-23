"""Previsão em lote e treino da CNN e da LSTM (spec treino-das-redes). Requer o extra `[treino]`.

As imagens chegam em 16 avos (uint8, ver `desenha_ml.dados`).
"""

import copy
import dataclasses
import math
import time
from collections.abc import Callable
from dataclasses import dataclass

import numpy as np
import torch
import torch.nn.functional as F  # noqa: N812 - convenção do PyTorch
from numpy.typing import NDArray
from torch import nn

from desenha_ml.dados import LoteDeExemplos
from desenha_ml.redes import (
    NIVEIS_DE_COBERTURA,
    RabiscoNet,
)

_ROTACAO_MAXIMA_GRAUS, _ESCALA_MINIMA, _ESCALA_MAXIMA, _TRANSLACAO_MAXIMA = 12.0, 0.9, 1.1, 2 / 14


# ------------------------------------------------------------------------------------------- previsão
def _imagens_em_tensor(imagens: NDArray[np.uint8], dispositivo: torch.device) -> torch.Tensor:
    return torch.as_tensor(imagens, device=dispositivo).float().unsqueeze(1) / NIVEIS_DE_COBERTURA


@torch.no_grad()
def prever_cnn(modelo: nn.Module, imagens: NDArray[np.uint8], lote: int = 2048) -> NDArray[np.float32]:
    modelo.eval()
    dispositivo = next(modelo.parameters()).device
    partes = [
        F.softmax(modelo(_imagens_em_tensor(imagens[i : i + lote], dispositivo)), dim=1).cpu()
        for i in range(0, len(imagens), lote)
    ]
    return torch.cat(partes).numpy().astype(np.float32)


@torch.no_grad()
def prever_lstm(
    modelo: nn.Module, sequencias: NDArray[np.float32], comprimentos: NDArray[np.int64], lote: int = 2048
) -> NDArray[np.float32]:
    modelo.eval()
    dispositivo = next(modelo.parameters()).device
    partes = []
    for i in range(0, len(sequencias), lote):
        x = torch.as_tensor(sequencias[i : i + lote], device=dispositivo)
        partes.append(F.softmax(modelo(x, torch.as_tensor(comprimentos[i : i + lote])), dim=1).cpu())
    return torch.cat(partes).numpy().astype(np.float32)


# --------------------------------------------------------------------------------------------- treino
@dataclass(frozen=True)
class ConfiguracaoDeTreino:
    epocas: int = 15
    taxa: float = 3e-3
    lote: int = 512
    suavizacao: float = 0.1
    proporcao_parcial: float = 0.5  # metade de cada lote com desenhos parciais
    semente: int = 42


@dataclass(frozen=True)
class DadosDeTreino:
    completo: LoteDeExemplos
    parcial: LoteDeExemplos
    validacao: LoteDeExemplos


@dataclass(frozen=True)
class _Otimizacao:
    otimizador: torch.optim.Optimizer
    agenda: torch.optim.lr_scheduler.LRScheduler


@dataclass(frozen=True)
class EpocaDoTreino:
    epoca: int
    perda_de_treino: float
    acuracia_de_treino: float
    perda_de_validacao: float
    acuracia_de_validacao: float
    segundos: float


class _DadosNoDispositivo:
    """Lotes completos e parciais já no dispositivo; `escolher` mistura os dois por exemplo."""

    def __init__(self, completo: LoteDeExemplos, parcial: LoteDeExemplos, dispositivo: torch.device) -> None:
        self.imagens = (
            _imagens_em_tensor(completo.imagens, dispositivo),
            _imagens_em_tensor(parcial.imagens, dispositivo),
        )
        self.sequencias = (torch.as_tensor(completo.sequencias, device=dispositivo),
                           torch.as_tensor(parcial.sequencias, device=dispositivo))  # fmt: skip
        self.comprimentos = (torch.as_tensor(completo.comprimentos), torch.as_tensor(parcial.comprimentos))
        self.rotulos = torch.as_tensor(completo.rotulos, device=dispositivo)

    def escolher(
        self, indices: torch.Tensor, parcial: torch.Tensor, eh_cnn: bool
    ) -> tuple[torch.Tensor, ...]:
        if eh_cnn:
            return (
                torch.where(parcial[:, None, None, None], self.imagens[1][indices], self.imagens[0][indices]),
            )
        indices_cpu, parcial_cpu = indices.cpu(), parcial.cpu()
        comprimentos = torch.where(
            parcial_cpu, self.comprimentos[1][indices_cpu], self.comprimentos[0][indices_cpu]
        )
        sequencias = torch.where(
            parcial[:, None, None], self.sequencias[1][indices], self.sequencias[0][indices]
        )
        return sequencias[:, : int(comprimentos.max())], comprimentos


def aumentar_imagens(imagens: torch.Tensor) -> torch.Tensor:
    """Rotação ±12°, escala 0,9–1,1 e translação ±2 px, sorteadas por imagem (só para a CNN)."""
    n, dispositivo = imagens.shape[0], imagens.device
    angulo = (torch.rand(n, device=dispositivo) * 2 - 1) * math.radians(_ROTACAO_MAXIMA_GRAUS)
    escala = _ESCALA_MINIMA + torch.rand(n, device=dispositivo) * (_ESCALA_MAXIMA - _ESCALA_MINIMA)
    dx, dy = ((torch.rand(n, device=dispositivo) * 2 - 1) * _TRANSLACAO_MAXIMA for _ in range(2))
    cos, sen = torch.cos(angulo) / escala, torch.sin(angulo) / escala
    matriz = torch.stack([torch.stack([cos, -sen, dx], 1), torch.stack([sen, cos, dy], 1)], 1)
    grade = F.affine_grid(matriz, list(imagens.shape), align_corners=False)
    return F.grid_sample(imagens, grade, align_corners=False)


def treinar(
    modelo: nn.Module,
    dados_de_treino: DadosDeTreino,
    configuracao: ConfiguracaoDeTreino,
    registrar: Callable[[EpocaDoTreino], None] = lambda _: None,
) -> list[EpocaDoTreino]:
    """AdamW + OneCycle, checkpoint pela acurácia de validação; devolve o histórico por época."""
    torch.manual_seed(configuracao.semente)
    dispositivo = next(modelo.parameters()).device
    dados = _DadosNoDispositivo(dados_de_treino.completo, dados_de_treino.parcial, dispositivo)
    otimizacao = _criar_otimizacao(modelo, configuracao, math.ceil(len(dados.rotulos) / configuracao.lote))
    historico: list[EpocaDoTreino] = []
    melhor_acuracia, melhores_pesos = -1.0, copy.deepcopy(modelo.state_dict())
    for epoca in range(1, configuracao.epocas + 1):
        registro = _uma_epoca(modelo, dados, configuracao, otimizacao, epoca)
        registro = _com_validacao(registro, modelo, dados_de_treino.validacao)
        historico.append(registro)
        registrar(registro)
        if registro.acuracia_de_validacao > melhor_acuracia:
            melhor_acuracia, melhores_pesos = (
                registro.acuracia_de_validacao,
                copy.deepcopy(modelo.state_dict()),
            )
    modelo.load_state_dict(melhores_pesos)
    return historico


def _criar_otimizacao(
    modelo: nn.Module, configuracao: ConfiguracaoDeTreino, passos_por_epoca: int
) -> _Otimizacao:
    otimizador = torch.optim.AdamW(modelo.parameters(), lr=configuracao.taxa, weight_decay=1e-4)
    total = configuracao.epocas * passos_por_epoca
    agenda = torch.optim.lr_scheduler.OneCycleLR(otimizador, configuracao.taxa, total_steps=total)
    return _Otimizacao(otimizador, agenda)


def _com_validacao(registro: EpocaDoTreino, modelo: nn.Module, validacao: LoteDeExemplos) -> EpocaDoTreino:
    perda, acuracia = _avaliar(modelo, validacao, isinstance(modelo, RabiscoNet))
    return dataclasses.replace(registro, perda_de_validacao=perda, acuracia_de_validacao=acuracia)


def _uma_epoca(
    modelo: nn.Module,
    dados: _DadosNoDispositivo,
    configuracao: ConfiguracaoDeTreino,
    otimizacao: _Otimizacao,
    epoca: int,
) -> EpocaDoTreino:
    inicio, eh_cnn = time.perf_counter(), isinstance(modelo, RabiscoNet)
    modelo.train()
    ordem = torch.randperm(len(dados.rotulos), device=dados.rotulos.device)
    soma_da_perda, acertos = 0.0, 0
    for i in range(0, len(ordem), configuracao.lote):
        indices = ordem[i : i + configuracao.lote]
        parcial = torch.rand(len(indices), device=indices.device) < configuracao.proporcao_parcial
        entradas = dados.escolher(indices, parcial, eh_cnn)
        logits = modelo(aumentar_imagens(entradas[0])) if eh_cnn else modelo(*entradas)
        perda = F.cross_entropy(logits, dados.rotulos[indices], label_smoothing=configuracao.suavizacao)
        _passo(modelo, otimizacao, perda)
        soma_da_perda += float(perda.detach()) * len(indices)
        acertos += int((logits.argmax(1) == dados.rotulos[indices]).sum())
    total = len(ordem)
    segundos = time.perf_counter() - inicio
    return EpocaDoTreino(epoca, soma_da_perda / total, acertos / total, math.nan, math.nan, segundos)


def _passo(modelo: nn.Module, otimizacao: _Otimizacao, perda: torch.Tensor) -> None:
    otimizacao.otimizador.zero_grad(set_to_none=True)
    perda.backward()  # type: ignore[no-untyped-call]
    nn.utils.clip_grad_norm_(modelo.parameters(), 1.0)  # protege a LSTM de exploding gradients
    otimizacao.otimizador.step()
    otimizacao.agenda.step()


def _avaliar(modelo: nn.Module, lote: LoteDeExemplos, eh_cnn: bool) -> tuple[float, float]:
    if eh_cnn:
        probabilidades = prever_cnn(modelo, lote.imagens)
    else:
        probabilidades = prever_lstm(modelo, lote.sequencias, lote.comprimentos)
    corretas = probabilidades[np.arange(len(lote.rotulos)), lote.rotulos]
    perda = float(-np.mean(np.log(corretas + 1e-9)))
    return perda, float(np.mean(probabilidades.argmax(1) == lote.rotulos))
