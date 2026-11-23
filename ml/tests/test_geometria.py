"""Geometria compartilhada: distância de pontos a um segmento."""

import numpy as np

from desenha_ml.geometria import distancias_ao_segmento

ORIGEM = np.array([0.0, 0.0])
DEZ_NO_EIXO_X = np.array([10.0, 0.0])


def test_distancia_perpendicular_dentro_do_segmento() -> None:
    distancias = distancias_ao_segmento(np.array([[5.0, 3.0]]), ORIGEM, DEZ_NO_EIXO_X)
    np.testing.assert_allclose(distancias, [3.0])


def test_distancia_ate_a_ponta_fora_do_segmento() -> None:
    distancias = distancias_ao_segmento(np.array([[13.0, 4.0]]), ORIGEM, DEZ_NO_EIXO_X)
    np.testing.assert_allclose(distancias, [5.0])


def test_segmento_degenerado_mede_ate_o_ponto() -> None:
    distancias = distancias_ao_segmento(np.array([[3.0, 4.0]]), ORIGEM, ORIGEM)
    np.testing.assert_allclose(distancias, [5.0])
