"""Requisitos "Artefatos para o jogo", "Relatório de métricas" e "Predições reais para o dataset do SLM"."""

import collections

import numpy as np
import pytest

from desenha_ml.artefatos import (
    CASOS_DE_PREDICAO,
    FRACOES_DAS_PREDICOES,
    classes_json,
    metricas_de_teste,
    metricas_redes_json,
    paridade_das_redes_json,
    plano_de_predicoes,
    predicoes_validacao_json,
)
from desenha_ml.avaliacao import ResultadoDoCriterio
from desenha_ml.categorias import CATEGORIAS
from desenha_ml.desenho import Desenho
from desenha_ml.ensemble import top_k
from desenha_ml.resultado import Ok


def test_classes_na_ordem_das_redes() -> None:
    classes = classes_json(w_cnn=0.55)
    assert [c["pt"] for c in classes["categorias"]] == [c.pt for c in CATEGORIAS]
    assert [c["indice"] for c in classes["categorias"]] == list(range(30))
    assert classes["w_cnn"] == 0.55
    assert classes["pre_processamento"]["espessura"] == 1.6
    assert classes["pre_processamento"]["maximo_de_pontos"] == 130


def _probabilidades(quantidade: int, semente: int) -> np.ndarray:
    pesos = np.random.default_rng(semente).random((quantidade, 30)) ** 3
    return pesos / pesos.sum(axis=1, keepdims=True)


def test_metricas_de_teste_e_relatorio() -> None:
    rotulos = np.arange(30)
    probabilidades = np.eye(30)
    metricas = metricas_de_teste(rotulos, probabilidades)
    assert metricas.acuracia == 1.0 and metricas.f1_macro == 1.0 and metricas.top3 == 1.0
    relatorio = metricas_redes_json(
        teste={"CNN": metricas, "LSTM": metricas, "Ensemble": metricas},
        criterio=ResultadoDoCriterio(aprovado=False, motivos=["LSTM: acurácia 0.7900 < 0.80"]),
        w_cnn=0.5,
        curva={"CNN": {0.5: 0.6, 1.0: 0.9}},
        parametros={"cnn": 700_000, "lstm": 450_000},
        latencia_cpu_ms={"cnn": 1.2, "lstm": 3.4},
        tamanhos={"treino": 210_000, "validacao": 30_000, "teste": 30_000},
        confusoes=[("vaca", "cavalo", 0.12)],
    )
    assert relatorio["criterio_minimo"] == {"aprovado": False, "motivos": ["LSTM: acurácia 0.7900 < 0.80"]}
    assert relatorio["teste"]["CNN"] == {"acuracia": 1.0, "f1_macro": 1.0, "top3": 1.0}
    assert relatorio["curva_antecipada"] == {"CNN": {"0.5": 0.6, "1.0": 0.9}}


def test_plano_com_fracoes_em_partes_iguais() -> None:
    plano = plano_de_predicoes(quantidade_de_exemplos=30_000, semente=3)
    assert len(plano) == CASOS_DE_PREDICAO >= 1_200
    contagem = collections.Counter(f for _, f in plano)
    assert set(contagem) == set(FRACOES_DAS_PREDICOES)
    assert len(set(contagem.values())) == 1
    assert len({i for i, _ in plano}) == len(plano)  # desenhos distintos


def test_plano_recusa_validacao_pequena_demais() -> None:
    with pytest.raises(ValueError, match="1200"):
        plano_de_predicoes(quantidade_de_exemplos=100, semente=3)


def test_predicoes_com_top5_na_ordem_do_top_k() -> None:
    p_cnn, p_lstm = _probabilidades(4, 1), _probabilidades(4, 2)
    casos = predicoes_validacao_json(
        alvos=np.array([0, 5, 10, 29]), fracoes=[0.35, 0.5, 0.7, 1.0], p_cnn=p_cnn, p_lstm=p_lstm, w_cnn=0.6
    )
    assert [c["alvo"] for c in casos] == ["vaca", "passarinho", "trator", "óculos"]
    primeiro = casos[0]
    esperado = top_k([float(p) for p in p_cnn[0]], k=5)
    assert isinstance(esperado, Ok)
    assert [nome for nome, _ in primeiro["cnn"]] == [CATEGORIAS[i].pt for i, _ in esperado.valor]
    assert primeiro["fracao_desenho"] == 0.35
    assert len(primeiro["ensemble"]) == 5
    assert primeiro["ensemble"][0][1] >= primeiro["ensemble"][-1][1]


def test_paridade_guarda_tracos_e_probabilidades() -> None:
    desenho = Desenho.de_arrays([[[0.0, 0.0], [10.0, 5.0]], [[3.0, 3.0]]])
    casos = paridade_das_redes_json([(desenho, 4)], p_cnn=_probabilidades(1, 1), p_lstm=_probabilidades(1, 2))
    assert casos[0]["rotulo"] == 4
    assert casos[0]["tracos"] == [[[0.0, 0.0], [10.0, 5.0]], [[3.0, 3.0]]]
    assert len(casos[0]["probs_cnn"]) == 30 and len(casos[0]["probs_lstm"]) == 30
