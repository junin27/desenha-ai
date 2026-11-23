"""Etapas de avaliação do pipeline: curva antecipada, predições para o SLM, latência, confusões e paridade.

Todas recebem um `ContextoDeAvaliacao` (redes treinadas + peso do ensemble). Requer o extra `[treino]`.
"""

import functools
import time
from collections.abc import Callable, Sequence
from dataclasses import dataclass
from pathlib import Path

import numpy as np
from numpy.typing import NDArray

from desenha_ml import artefatos as fmt
from desenha_ml.avaliacao import curva_antecipada
from desenha_ml.categorias import CATEGORIAS
from desenha_ml.dados import ExemploRotulado, LoteDeExemplos, Mapeador, montar_lote_de_avaliacao
from desenha_ml.exportacao_onnx import probabilidades_onnx_cnn, probabilidades_onnx_lstm
from desenha_ml.redes import RabiscoNet, TracoLSTM
from desenha_ml.treino import prever_cnn, prever_lstm

FRACOES_DA_CURVA = (0.2, 0.3, 0.4, 0.5, 0.6, 0.7, 0.8, 0.9, 1.0)
DESENHOS_DE_PARIDADE = 8
CONFUSOES_NO_RELATORIO = 8
REPETICOES_DA_LATENCIA = 30

ParDeProbabilidades = tuple[NDArray[np.float32], NDArray[np.float32]]


@dataclass(frozen=True)
class ContextoDeAvaliacao:
    cnn: RabiscoNet
    lstm: TracoLSTM
    w_cnn: float
    mapear: Mapeador = map

    def prever(self, lote: LoteDeExemplos) -> ParDeProbabilidades:
        return prever_cnn(self.cnn, lote.imagens), prever_lstm(self.lstm, lote.sequencias, lote.comprimentos)

    def ensemble(self, probabilidades: ParDeProbabilidades) -> NDArray[np.float64]:
        cnn, lstm = (p.astype(np.float64) for p in probabilidades)
        return self.w_cnn * cnn + (1 - self.w_cnn) * lstm


def calcular_curva(
    contexto: ContextoDeAvaliacao, teste: Sequence[ExemploRotulado], quantidade: int, semente: int
) -> dict[str, dict[float, float]]:
    """Acurácia de cada rede com 20%, 30%, ..., 100% do desenho, numa amostra sorteada do teste."""
    escolhidos = np.random.default_rng(semente).permutation(len(teste))[:quantidade]
    amostra = [teste[int(i)] for i in escolhidos]
    rotulos = np.array([r for _, r in amostra])
    por_rede: dict[str, dict[float, NDArray[np.floating]]] = {"CNN": {}, "LSTM": {}, "Ensemble": {}}
    for fracao in FRACOES_DA_CURVA:
        probabilidades = contexto.prever(montar_lote_de_avaliacao(amostra, fracao, contexto.mapear))
        por_rede["CNN"][fracao], por_rede["LSTM"][fracao] = probabilidades
        por_rede["Ensemble"][fracao] = contexto.ensemble(probabilidades)
    return {nome: curva_antecipada(rotulos, valores) for nome, valores in por_rede.items()}


def gerar_predicoes(
    contexto: ContextoDeAvaliacao, validacao: Sequence[ExemploRotulado], casos: int, semente: int
) -> list[fmt.PredicaoJson]:
    """Saídas reais das redes em desenhos de validação (entrada do modo VEREDITO do dataset do SLM)."""
    plano = fmt.plano_de_predicoes(len(validacao), semente, casos)
    predicoes: list[fmt.PredicaoJson] = []
    for fracao in fmt.FRACOES_DAS_PREDICOES:
        exemplos = [validacao[i] for i, f in plano if f == fracao]
        lote = montar_lote_de_avaliacao(exemplos, fracao, contexto.mapear)
        p_cnn, p_lstm = contexto.prever(lote)
        predicoes += fmt.predicoes_validacao_json(
            lote.rotulos, [fracao] * len(exemplos), p_cnn, p_lstm, contexto.w_cnn
        )
    return predicoes


def medir_latencias(contexto: ContextoDeAvaliacao, teste: LoteDeExemplos) -> dict[str, float]:
    """Mediana do tempo de um desenho por vez na CPU (o jogo pede um palpite a cada traço)."""
    tempos: dict[str, list[float]] = {"cnn": [], "lstm": []}
    for i in range(min(REPETICOES_DA_LATENCIA, len(teste.rotulos))):
        sequencia, comprimento = (
            teste.sequencias[i : i + 1, : teste.comprimentos[i]],
            teste.comprimentos[i : i + 1],
        )
        tempos["cnn"].append(
            _milissegundos(functools.partial(prever_cnn, contexto.cnn, teste.imagens[i : i + 1]))
        )
        tempos["lstm"].append(
            _milissegundos(functools.partial(prever_lstm, contexto.lstm, sequencia, comprimento))
        )
    return {nome: float(np.median(valores)) for nome, valores in tempos.items()}


def _milissegundos(executar: Callable[[], object]) -> float:
    inicio = time.perf_counter()
    executar()
    return (time.perf_counter() - inicio) * 1000


def maiores_confusoes(matriz: NDArray[np.int64]) -> list[tuple[str, str, float]]:
    """Pares (real → previsto) mais frequentes, em proporção da classe real."""
    normalizada = matriz / np.maximum(matriz.sum(axis=1, keepdims=True), 1)
    np.fill_diagonal(normalizada, 0)
    linhas, colunas = np.nonzero(normalizada)
    pares = sorted(((float(normalizada[i, j]), int(i), int(j)) for i, j in zip(linhas, colunas, strict=True)),
                   reverse=True)  # fmt: skip
    return [(CATEGORIAS[i].pt, CATEGORIAS[j].pt, round(v, 3)) for v, i, j in pares[:CONFUSOES_NO_RELATORIO]]


def gerar_paridade(
    teste: Sequence[ExemploRotulado], lote: LoteDeExemplos, pasta: Path
) -> list[fmt.ParidadeJson]:
    """Primeiros desenhos de teste com as probabilidades que os ONNX gravados devolvem para eles."""
    escolhidos = list(range(min(DESENHOS_DE_PARIDADE, len(teste))))
    sequencias = [lote.sequencias[i, : lote.comprimentos[i]] for i in escolhidos]
    p_cnn = probabilidades_onnx_cnn(pasta / "cnn.onnx", lote.imagens[escolhidos])
    p_lstm = probabilidades_onnx_lstm(pasta / "lstm.onnx", sequencias)
    return fmt.paridade_das_redes_json([teste[i] for i in escolhidos], p_cnn, p_lstm)
