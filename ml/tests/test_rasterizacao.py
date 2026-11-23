"""Requisito "Imagem 28×28 para a CNN" — spec pre-processamento-de-desenho."""

import numpy as np

from desenha_ml.desenho import Desenho
from desenha_ml.rasterizacao import ESPESSURA_PADRAO, LADO_DA_IMAGEM, rasterizar

DEZESSEIS_AVOS = 16


def _linha_horizontal() -> Desenho:
    return Desenho.de_arrays([np.array([[0.0, 0.0], [255.0, 0.0]])])


def test_imagem_tem_28_por_28_em_float32() -> None:
    imagem = rasterizar(_linha_horizontal())
    assert imagem.shape == (LADO_DA_IMAGEM, LADO_DA_IMAGEM)
    assert imagem.dtype == np.float32


def test_todo_pixel_vale_k_dezesseis_avos() -> None:
    gerador = np.random.default_rng(7)
    desenho = Desenho.de_arrays([gerador.uniform(0, 255, (12, 2)), gerador.uniform(0, 255, (5, 2))])
    imagem = rasterizar(desenho)
    k = imagem * DEZESSEIS_AVOS
    np.testing.assert_allclose(k, np.round(k), atol=1e-6)
    assert float(np.min(imagem)) >= 0.0
    assert float(np.max(imagem)) <= 1.0


def test_linha_horizontal_centralizada() -> None:
    imagem = rasterizar(_linha_horizontal())
    np.testing.assert_allclose(imagem[13:15, 3:25], 12 / 16)
    assert float(np.sum(imagem[:13])) == 0.0
    assert float(np.sum(imagem[15:])) == 0.0


def test_ponto_isolado_vira_disco() -> None:
    imagem = rasterizar(Desenho.de_arrays([np.array([[100.0, 100.0]])]))
    np.testing.assert_allclose(imagem[13:15, 13:15], 8 / 16)
    fora_do_centro = imagem.copy()
    fora_do_centro[13:15, 13:15] = 0
    assert float(np.sum(fora_do_centro)) == 0.0


def test_espessura_maior_pinta_mais() -> None:
    desenho = Desenho.de_arrays([np.array([[0.0, 0.0], [255.0, 128.0], [30.0, 255.0]])])
    soma_fina = float(np.sum(rasterizar(desenho, espessura=1.2)))
    assert float(np.sum(rasterizar(desenho, espessura=2.0))) > soma_fina


def test_espessura_padrao_e_1_6() -> None:
    assert ESPESSURA_PADRAO == 1.6
    desenho = _linha_horizontal()
    np.testing.assert_array_equal(rasterizar(desenho), rasterizar(desenho, espessura=1.6))


def test_rasterizar_normaliza_antes() -> None:
    deslocado = Desenho.de_arrays([np.array([[500.0, 70.0], [1010.0, 70.0]])])
    np.testing.assert_array_equal(rasterizar(deslocado), rasterizar(_linha_horizontal()))


def test_desenho_alto_fica_centralizado_na_horizontal() -> None:
    vertical = Desenho.de_arrays([np.array([[0.0, 0.0], [0.0, 255.0]])])
    imagem = rasterizar(vertical)
    np.testing.assert_allclose(imagem[3:25, 13:15], 12 / 16)
