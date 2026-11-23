"""Requisitos "Peso do ensemble escolhido na validação" e "Métricas de teste e critério mínimo"."""

import numpy as np
import pytest

from desenha_ml.avaliacao import (
    acuracia,
    acuracia_top_k,
    avaliar_criterio_minimo,
    curva_antecipada,
    escolher_peso_do_ensemble,
    f1_macro,
    matriz_de_confusao,
    peso_mais_proximo_de_meio,
    previsoes,
)

ROTULOS = np.array([0, 1, 1, 2])
PREVISTOS = np.array([0, 1, 2, 2])


def test_metricas_conhecidas() -> None:
    assert acuracia(ROTULOS, PREVISTOS) == 0.75
    assert f1_macro(ROTULOS, PREVISTOS) == pytest.approx(0.7778, abs=1e-4)


def test_f1_ignora_classes_que_nao_aparecem() -> None:
    assert f1_macro(np.array([0, 0]), np.array([0, 0])) == 1.0


def test_matriz_de_confusao_linhas_sao_o_real() -> None:
    matriz = matriz_de_confusao(ROTULOS, PREVISTOS, numero_de_classes=3)
    np.testing.assert_array_equal(matriz, [[1, 0, 0], [0, 1, 1], [0, 0, 1]])


def test_previsoes_desempatam_pelo_menor_indice() -> None:
    np.testing.assert_array_equal(previsoes(np.array([[0.1, 0.45, 0.45]])), [1])


def test_acuracia_top_3() -> None:
    probabilidades = np.array([[0.5, 0.3, 0.15, 0.05], [0.4, 0.3, 0.2, 0.1]])
    assert acuracia_top_k(np.array([2, 3]), probabilidades, k=3) == 0.5


def test_peso_com_maior_acuracia_na_validacao() -> None:
    rotulos = np.array([0, 1])
    p_cnn = np.array([[1.0, 0.0], [0.0, 1.0]])
    p_lstm = np.array([[1.0, 0.0], [1.0, 0.0]])
    # No 2º exemplo o ensemble vale [1 - w, w]: só w > 0,5 acerta (em 0,5 o empate vai para o índice 0).
    assert escolher_peso_do_ensemble(rotulos, p_cnn, p_lstm) == 0.55


def test_empate_entre_todos_os_pesos_fica_com_meio() -> None:
    identico = np.array([[0.9, 0.1]])
    assert escolher_peso_do_ensemble(np.array([0]), identico, identico) == 0.5


def test_desempate_pelo_mais_proximo_de_meio() -> None:
    assert peso_mais_proximo_de_meio([0.3, 0.55]) == 0.55
    assert peso_mais_proximo_de_meio([0.45, 0.55]) == 0.45  # equidistantes: fica o menor


def test_curva_antecipada() -> None:
    rotulos = np.array([0, 1])
    por_fracao = {0.5: np.array([[0.9, 0.1], [0.8, 0.2]]), 1.0: np.array([[0.9, 0.1], [0.1, 0.9]])}
    assert curva_antecipada(rotulos, por_fracao) == {0.5: 0.5, 1.0: 1.0}


def test_criterio_aprovado() -> None:
    resultado = avaliar_criterio_minimo({"CNN": 0.86, "LSTM": 0.81, "Ensemble": 0.9})
    assert resultado.aprovado
    assert resultado.motivos == []


def test_criterio_reprovado_informa_o_motivo() -> None:
    resultado = avaliar_criterio_minimo({"CNN": 0.86, "LSTM": 0.79, "Ensemble": 0.83})
    assert not resultado.aprovado
    assert resultado.motivos == [
        "LSTM: acurácia 0.7900 < 0.80",
        "Ensemble: acurácia 0.8300 < 0.85",
    ]
