"""Formato dos artefatos do treino, consumidos pelo jogo e pelo dataset do SLM (spec treino-das-redes).

Exemplo:
    >>> classes_json(w_cnn=0.5)["categorias"][0]
    {'indice': 0, 'en': 'cow', 'pt': 'vaca'}
"""

from collections.abc import Mapping, Sequence
from dataclasses import asdict, dataclass
from typing import TypedDict

import numpy as np

from desenha_ml.avaliacao import (
    Probabilidades,
    ResultadoDoCriterio,
    Rotulos,
    acuracia,
    acuracia_top_k,
    f1_macro,
    previsoes,
)
from desenha_ml.categorias import CATEGORIAS
from desenha_ml.desenho import Desenho
from desenha_ml.ensemble import combinar, top_k
from desenha_ml.rasterizacao import ESPESSURA_PADRAO, LADO_DA_CAIXA, LADO_DA_IMAGEM
from desenha_ml.resultado import Erro
from desenha_ml.sequencia import MAXIMO_DE_PONTOS
from desenha_ml.simplificacao import EPSILON_PADRAO

FRACOES_DAS_PREDICOES = (0.35, 0.5, 0.7, 1.0)
CASOS_DE_PREDICAO = 1_200
PALPITES_POR_REDE = 5
CASAS_DECIMAIS = 4  # probabilidades legíveis no dataset do SLM (o prompt mostra porcentagens inteiras)


class CategoriaJson(TypedDict):
    indice: int
    en: str
    pt: str


class ClassesJson(TypedDict):
    categorias: list[CategoriaJson]
    w_cnn: float
    pre_processamento: dict[str, float]


@dataclass(frozen=True)
class MetricasDeTeste:
    acuracia: float
    f1_macro: float
    top3: float


class CriterioJson(TypedDict):
    aprovado: bool
    motivos: list[str]


class RelatorioDeMetricas(TypedDict):
    teste: dict[str, dict[str, float]]
    criterio_minimo: CriterioJson
    w_cnn: float
    curva_antecipada: dict[str, dict[str, float]]
    parametros: dict[str, int]
    latencia_cpu_ms: dict[str, float]
    dados: dict[str, int]
    confusoes: list[tuple[str, str, float]]
    conferencia_onnx: dict[str, float]


class PredicaoJson(TypedDict):
    alvo: str
    fracao_desenho: float
    cnn: list[tuple[str, float]]
    lstm: list[tuple[str, float]]
    ensemble: list[tuple[str, float]]


class ParidadeJson(TypedDict):
    rotulo: int
    tracos: list[list[list[float]]]
    probs_cnn: list[float]
    probs_lstm: list[float]


def classes_json(w_cnn: float) -> ClassesJson:
    """Categorias na ordem das saídas das redes, peso do ensemble e parâmetros do pré-processamento."""
    return {
        "categorias": [{"indice": i, "en": c.en, "pt": c.pt} for i, c in enumerate(CATEGORIAS)],
        "w_cnn": w_cnn,
        "pre_processamento": {
            "espessura": ESPESSURA_PADRAO,
            "epsilon": EPSILON_PADRAO,
            "maximo_de_pontos": MAXIMO_DE_PONTOS,
            "lado_da_imagem": LADO_DA_IMAGEM,
            "lado_da_caixa": LADO_DA_CAIXA,
        },
    }


def metricas_de_teste(rotulos: Rotulos, probabilidades: Probabilidades) -> MetricasDeTeste:
    previstos = previsoes(probabilidades)
    return MetricasDeTeste(
        acuracia=acuracia(rotulos, previstos),
        f1_macro=f1_macro(rotulos, previstos),
        top3=acuracia_top_k(rotulos, probabilidades, k=3),
    )


def metricas_redes_json(  # noqa: PLR0913 - um argumento por campo do relatório, todos nomeados
    *,
    teste: Mapping[str, MetricasDeTeste],
    criterio: ResultadoDoCriterio,
    w_cnn: float,
    curva: Mapping[str, Mapping[float, float]],
    parametros: Mapping[str, int],
    latencia_cpu_ms: Mapping[str, float],
    tamanhos: Mapping[str, int],
    confusoes: Sequence[tuple[str, str, float]],
    conferencia_onnx: Mapping[str, float],
) -> RelatorioDeMetricas:
    return {
        "teste": {nome: asdict(m) for nome, m in teste.items()},
        "criterio_minimo": {"aprovado": criterio.aprovado, "motivos": list(criterio.motivos)},
        "w_cnn": w_cnn,
        "curva_antecipada": {nome: {str(f): a for f, a in c.items()} for nome, c in curva.items()},
        "parametros": dict(parametros),
        "latencia_cpu_ms": dict(latencia_cpu_ms),
        "dados": dict(tamanhos),
        "confusoes": list(confusoes),
        "conferencia_onnx": dict(conferencia_onnx),
    }


def plano_de_predicoes(
    quantidade_de_exemplos: int, semente: int, casos: int = CASOS_DE_PREDICAO
) -> list[tuple[int, float]]:
    """Desenhos de validação distintos, sorteados, com as 4 frações em partes iguais (1.200 no treino)."""
    if quantidade_de_exemplos < casos:
        raise ValueError(f"validação com {quantidade_de_exemplos} exemplos; esperado ao menos {casos}")
    indices = np.random.default_rng(semente).choice(quantidade_de_exemplos, casos, replace=False)
    fracoes = FRACOES_DAS_PREDICOES
    return [(int(i), fracoes[n % len(fracoes)]) for n, i in enumerate(indices)]


def predicoes_validacao_json(
    alvos: Rotulos, fracoes: Sequence[float], p_cnn: Probabilidades, p_lstm: Probabilidades, w_cnn: float
) -> list[PredicaoJson]:
    """Top-5 de cada rede e do ensemble, pelos nomes em português, na ordem da regra de top-k."""
    casos: list[PredicaoJson] = []
    for alvo, fracao, cnn, lstm in zip(alvos, fracoes, p_cnn, p_lstm, strict=True):
        lista_cnn, lista_lstm = [float(p) for p in cnn], [float(p) for p in lstm]
        ensemble = combinar(lista_cnn, lista_lstm, w_cnn)
        if isinstance(ensemble, Erro):
            raise ValueError(f"saída inválida das redes: {ensemble.detalhe}")
        casos.append(
            {
                "alvo": CATEGORIAS[int(alvo)].pt,
                "fracao_desenho": float(fracao),
                "cnn": _top5(lista_cnn),
                "lstm": _top5(lista_lstm),
                "ensemble": _top5(list(ensemble.valor)),
            }
        )
    return casos


def _top5(probabilidades: list[float]) -> list[tuple[str, float]]:
    palpites = top_k(probabilidades, k=PALPITES_POR_REDE)
    if isinstance(palpites, Erro):
        raise ValueError(f"top-5 impossível: {palpites.detalhe}")
    return [(CATEGORIAS[i].pt, round(p, CASAS_DECIMAIS)) for i, p in palpites.valor]


def paridade_das_redes_json(
    exemplos: Sequence[tuple[Desenho, int]], p_cnn: Probabilidades, p_lstm: Probabilidades
) -> list[ParidadeJson]:
    """Traços originais + probabilidades esperadas do ONNX, para o adaptador do jogo conferir no navegador."""
    return [
        {
            "rotulo": rotulo,
            "tracos": [[[float(x), float(y)] for x, y in traco] for traco in desenho.tracos],
            "probs_cnn": [float(p) for p in cnn],
            "probs_lstm": [float(p) for p in lstm],
        }
        for (desenho, rotulo), cnn, lstm in zip(exemplos, p_cnn, p_lstm, strict=True)
    ]
