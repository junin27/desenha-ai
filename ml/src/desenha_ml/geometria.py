"""Geometria compartilhada pela simplificação (RDP) e pela rasterização."""

import numpy as np
from numpy.typing import NDArray


def distancias_ao_segmento(
    pontos: NDArray[np.float64], a: NDArray[np.float64], b: NDArray[np.float64]
) -> NDArray[np.float64]:
    """Distância euclidiana de cada ponto (n, 2) ao segmento AB; se A == B, distância até A."""
    ab = b - a
    comprimento2 = float(np.dot(ab, ab))
    if comprimento2 == 0.0:
        return np.asarray(np.hypot(*(pontos - a).T), dtype=np.float64)
    t = np.clip(((pontos - a) @ ab) / comprimento2, 0.0, 1.0)
    projecoes = a + t[:, None] * ab
    return np.asarray(np.hypot(*(pontos - projecoes).T), dtype=np.float64)
