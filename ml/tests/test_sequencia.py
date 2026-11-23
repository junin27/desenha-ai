"""Requisito "Sequência stroke-3 para a LSTM" — spec pre-processamento-de-desenho."""

import numpy as np

from desenha_ml.desenho import Desenho
from desenha_ml.sequencia import MAXIMO_DE_PONTOS, sequenciar


def test_dois_tracos() -> None:
    desenho = Desenho.de_arrays([np.array([[0.0, 0.0], [255.0, 0.0]]), np.array([[255.0, 255.0]])])
    np.testing.assert_allclose(sequenciar(desenho), [[0.0, 0.0, 0.0], [1.0, 0.0, 1.0], [0.0, 1.0, 1.0]])


def test_sequencia_e_float32_com_tres_colunas() -> None:
    sequencia = sequenciar(Desenho.de_arrays([np.array([[0.0, 0.0], [10.0, 5.0]])]))
    assert sequencia.dtype == np.float32
    assert sequencia.shape == (2, 3)


def test_desenho_longo_e_cortado_em_130() -> None:
    assert MAXIMO_DE_PONTOS == 130
    desenho = Desenho.de_arrays([np.stack([np.arange(200.0), np.zeros(200)], axis=1)])
    assert sequenciar(desenho).shape == (130, 3)


def test_sequenciar_normaliza_antes() -> None:
    deslocado = Desenho.de_arrays([np.array([[100.0, 100.0], [355.0, 100.0]])])
    np.testing.assert_allclose(sequenciar(deslocado), [[0.0, 0.0, 0.0], [1.0, 0.0, 1.0]])


def test_soma_dos_deltas_reconstroi_a_posicao() -> None:
    desenho = Desenho.de_arrays([np.array([[0.0, 0.0], [100.0, 50.0], [255.0, 10.0]])])
    sequencia = sequenciar(desenho)
    np.testing.assert_allclose(np.cumsum(sequencia[:, :2], axis=0)[-1], [1.0, 10 / 255], rtol=1e-6)
