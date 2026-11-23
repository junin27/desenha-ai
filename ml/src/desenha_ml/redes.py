"""CNN e LSTM do jogo, treino, previsão em lote e exportação ONNX conferida (spec treino-das-redes).

Requer o extra `[treino]` (torch, onnx). As imagens chegam em 16 avos (uint8, ver `desenha_ml.dados`).

Exemplo (exige torch):
    >>> modelo = RabiscoNet()
    >>> sum(p.numel() for p in modelo.parameters()) > 100_000
    True
"""

import copy
import dataclasses
import math
import time
from collections.abc import Callable, Sequence
from dataclasses import dataclass
from pathlib import Path

import numpy as np
import onnx
import torch
import torch.nn.functional as F  # noqa: N812 - convenção do PyTorch
from numpy.typing import NDArray
from onnx.reference import ReferenceEvaluator
from torch import nn
from torch.nn.utils.rnn import pack_padded_sequence

from desenha_ml.categorias import CATEGORIAS
from desenha_ml.dados import LoteDeExemplos
from desenha_ml.rasterizacao import SUBAMOSTRAS

NUMERO_DE_CLASSES = len(CATEGORIAS)
_NIVEIS_DE_COBERTURA = float(SUBAMOSTRAS * SUBAMOSTRAS)
_MEDIA_DOS_PIXELS, _DESVIO_DOS_PIXELS = 0.1, 0.25  # normalização fixa dentro da CNN (o ONNX recebe [0, 1])
_ROTACAO_MAXIMA_GRAUS, _ESCALA_MINIMA, _ESCALA_MAXIMA, _TRANSLACAO_MAXIMA = 12.0, 0.9, 1.1, 2 / 14
OPSET_ONNX = 17


# ----------------------------------------------------------------------------------------- arquiteturas
class _BlocoResidual(nn.Module):
    def __init__(self, entrada: int, saida: int, passo: int = 1) -> None:
        super().__init__()
        self.conv1 = nn.Conv2d(entrada, saida, 3, passo, 1, bias=False)
        self.norm1 = nn.BatchNorm2d(saida)
        self.conv2 = nn.Conv2d(saida, saida, 3, 1, 1, bias=False)
        self.norm2 = nn.BatchNorm2d(saida)
        self.atalho: nn.Module = nn.Identity()
        if passo != 1 or entrada != saida:
            self.atalho = nn.Sequential(
                nn.Conv2d(entrada, saida, 1, passo, bias=False), nn.BatchNorm2d(saida)
            )

    def forward(self, x: torch.Tensor) -> torch.Tensor:
        y: torch.Tensor = self.norm2(self.conv2(F.relu(self.norm1(self.conv1(x)))))
        atalho: torch.Tensor = self.atalho(x)
        return F.relu(y + atalho)


class RabiscoNet(nn.Module):
    """CNN residual para a imagem 28×28: 32 → 64 → 128 canais, GAP e camada densa (logits)."""

    def __init__(self) -> None:
        super().__init__()
        self.entrada = nn.Sequential(nn.Conv2d(1, 32, 3, 1, 1, bias=False), nn.BatchNorm2d(32), nn.ReLU())
        self.blocos = nn.Sequential(
            _BlocoResidual(32, 32),
            _BlocoResidual(32, 64, 2),
            _BlocoResidual(64, 64),
            _BlocoResidual(64, 128, 2),
            _BlocoResidual(128, 128),
        )
        self.saida = nn.Sequential(
            nn.AdaptiveAvgPool2d(1), nn.Flatten(), nn.Dropout(0.3), nn.Linear(128, NUMERO_DE_CLASSES)
        )

    def forward(self, imagem: torch.Tensor) -> torch.Tensor:
        normalizada = (imagem - _MEDIA_DOS_PIXELS) / _DESVIO_DOS_PIXELS
        logits: torch.Tensor = self.saida(self.blocos(self.entrada(normalizada)))
        return logits


class TracoLSTM(nn.Module):
    """Conv1D sobre os traços + LSTM bidirecional de 2 camadas; usa os estados finais de ida e de volta."""

    def __init__(self, unidades: int = 128) -> None:
        super().__init__()
        self.conv1 = nn.Conv1d(3, 64, 5, padding=2)
        self.conv2 = nn.Conv1d(64, 96, 5, padding=2)
        self.lstm = nn.LSTM(96, unidades, num_layers=2, batch_first=True, bidirectional=True, dropout=0.3)
        self.saida = nn.Sequential(nn.Dropout(0.3), nn.Linear(2 * unidades, NUMERO_DE_CLASSES))

    def caracteristicas(self, sequencia: torch.Tensor, mascara: torch.Tensor | None = None) -> torch.Tensor:
        """Duas Conv1D. Com padding, a máscara zera as posições depois do fim de cada sequência: sem ela,
        o viés da 1ª convolução "vaza" para a borda da 2ª e o treino (com padding) diverge do jogo (sem)."""
        x = sequencia.transpose(1, 2)
        for convolucao in (self.conv1, self.conv2):
            x = F.relu(convolucao(x))
            if mascara is not None:
                x = x * mascara[:, None, :]
        return x.transpose(1, 2)

    def forward(self, sequencia: torch.Tensor, comprimentos: torch.Tensor) -> torch.Tensor:
        posicoes = torch.arange(sequencia.shape[1], device=sequencia.device)
        mascara = (posicoes[None, :] < comprimentos.to(sequencia.device)[:, None]).to(sequencia.dtype)
        empacotada = pack_padded_sequence(
            self.caracteristicas(sequencia, mascara),
            comprimentos.cpu(),
            batch_first=True,
            enforce_sorted=False,
        )
        _, (estados, _) = self.lstm(empacotada)
        logits: torch.Tensor = self.saida(torch.cat([estados[-2], estados[-1]], dim=1))
        return logits


class CNNComSoftmax(nn.Module):
    def __init__(self, cnn: RabiscoNet) -> None:
        super().__init__()
        self.cnn = cnn

    def forward(self, imagem: torch.Tensor) -> torch.Tensor:
        return F.softmax(self.cnn(imagem), dim=1)


class LSTMComSoftmax(nn.Module):
    """Versão sem `pack_padded_sequence`, para o ONNX: no jogo o lote tem um desenho, sem padding."""

    def __init__(self, lstm: TracoLSTM) -> None:
        super().__init__()
        self.lstm = lstm

    def forward(self, sequencia: torch.Tensor) -> torch.Tensor:
        _, (estados, _) = self.lstm.lstm(self.lstm.caracteristicas(sequencia))
        return F.softmax(self.lstm.saida(torch.cat([estados[-2], estados[-1]], dim=1)), dim=1)


# ------------------------------------------------------------------------------------------- previsão
def _imagens_em_tensor(imagens: NDArray[np.uint8], dispositivo: torch.device) -> torch.Tensor:
    return torch.as_tensor(imagens, device=dispositivo).float().unsqueeze(1) / _NIVEIS_DE_COBERTURA


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
        soma_da_perda += float(perda) * len(indices)
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


# ----------------------------------------------------------------------------------------------- ONNX
def _exportar(
    modulo: nn.Module, exemplo: torch.Tensor, entrada: str, eixos: dict[int, str], caminho: Path
) -> None:
    """Exportador clássico (operador LSTM nativo); se a versão do PyTorch não o tiver, usa o dynamo."""
    modulo = modulo.cpu().eval()
    eixos_dinamicos = {entrada: eixos, "probs": {0: "lote"}}
    try:
        torch.onnx.export(
            modulo,
            (exemplo,),
            str(caminho),
            input_names=[entrada],
            output_names=["probs"],
            dynamic_axes=eixos_dinamicos,
            opset_version=OPSET_ONNX,
            dynamo=False,
        )
    except Exception:  # qualquer falha do exportador clássico cai no dynamo; o resultado é conferido depois
        torch.onnx.export(
            modulo,
            (exemplo,),
            str(caminho),
            input_names=[entrada],
            output_names=["probs"],
            dynamic_axes=eixos_dinamicos,
            dynamo=True,
        )
    onnx.checker.check_model(onnx.load(str(caminho)))


def exportar_cnn_onnx(modelo: RabiscoNet, caminho: Path) -> None:
    _exportar(CNNComSoftmax(modelo), torch.zeros(1, 1, 28, 28), "imagem", {0: "lote"}, caminho)


def exportar_lstm_onnx(modelo: TracoLSTM, caminho: Path) -> None:
    _exportar(LSTMComSoftmax(modelo), torch.zeros(1, 20, 3), "sequencia", {0: "lote", 1: "tempo"}, caminho)


def conferir_onnx_cnn(caminho: Path, modelo: RabiscoNet, imagens: NDArray[np.uint8]) -> float:
    """Maior diferença absoluta entre o ONNX (avaliador de referência) e o PyTorch."""
    avaliador = ReferenceEvaluator(onnx.load(str(caminho)))
    entrada = imagens[:, None].astype(np.float32) / _NIVEIS_DE_COBERTURA
    (saida_onnx,) = avaliador.run(None, {"imagem": entrada})
    return float(np.max(np.abs(np.asarray(saida_onnx) - prever_cnn(modelo, imagens))))


def conferir_onnx_lstm(caminho: Path, modelo: TracoLSTM, sequencias: Sequence[NDArray[np.float32]]) -> float:
    avaliador = ReferenceEvaluator(onnx.load(str(caminho)))
    diferencas = []
    for sequencia in sequencias:
        (saida_onnx,) = avaliador.run(None, {"sequencia": sequencia[None].astype(np.float32)})
        esperado = prever_lstm(modelo, sequencia[None], np.array([len(sequencia)]))
        diferencas.append(float(np.max(np.abs(np.asarray(saida_onnx) - esperado))))
    return max(diferencas)
