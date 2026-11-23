"""Requisito "Normalização" — spec pre-processamento-de-desenho."""

import numpy as np

from desenha_ml.desenho import Desenho
from desenha_ml.normalizacao import normalizar


def test_desenho_mais_largo_que_alto_escala_a_largura_para_255() -> None:
    desenho = Desenho.de_arrays([np.array([[10, 20], [110, 20], [60, 70]])])
    np.testing.assert_allclose(normalizar(desenho).tracos[0], [[0.0, 0.0], [255.0, 0.0], [127.5, 127.5]])


def test_desenho_de_um_unico_ponto_vai_para_a_origem() -> None:
    desenho = Desenho.de_arrays([np.array([[40, 40]])])
    np.testing.assert_allclose(normalizar(desenho).tracos[0], [[0, 0]])


def test_normalizacao_usa_todos_os_tracos_para_a_caixa() -> None:
    desenho = Desenho.de_arrays([np.array([[0, 0]]), np.array([[0, 50], [10, 100]])])
    normalizado = normalizar(desenho)
    np.testing.assert_allclose(normalizado.tracos[0], [[0, 0]])
    np.testing.assert_allclose(normalizado.tracos[1], [[0.0, 127.5], [25.5, 255.0]])


def test_normalizar_duas_vezes_nao_muda_o_resultado() -> None:
    desenho = Desenho.de_arrays([np.array([[3, 9], [50, 12], [20, 80]])])
    uma = normalizar(desenho)
    assert normalizar(uma) == uma


def test_maior_dimensao_vai_exatamente_para_255() -> None:
    desenho = Desenho.de_arrays([np.array([[10.0, 20.0], [110.0, 20.0]])])
    assert float(np.max(normalizar(desenho).todos_os_pontos())) == 255.0
