"""Geometria compartilhada pela simplificação (RDP) e pela rasterização.

As contas são feitas termo a termo, na mesma ordem de `app/src/domain/desenho/geometria.ts`. Um produto
escalar com `@`/`np.dot` pode usar outra ordem de soma (ou FMA) e mudar a última casa decimal, o que
bastou para o RDP escolher pontos diferentes em Python e TypeScript num círculo (D8 do design).

Exemplo:
    >>> import numpy as np
    >>> distancias_ao_segmento(np.array([[13.0, 4.0]]), np.array([0.0, 0.0]), np.array([10.0, 0.0])).tolist()
    [5.0]
"""

import numpy as np
from numpy.typing import NDArray


def distancias_ao_segmento(
    pontos: NDArray[np.float64], a: NDArray[np.float64], b: NDArray[np.float64]
) -> NDArray[np.float64]:
    """Distância euclidiana de cada ponto (n, 2) ao segmento AB; se A == B, distância até A."""
    ax, ay, ab_x, ab_y = float(a[0]), float(a[1]), float(b[0] - a[0]), float(b[1] - a[1])
    px, py = pontos[:, 0], pontos[:, 1]
    comprimento2 = ab_x * ab_x + ab_y * ab_y
    if comprimento2 == 0.0:
        return np.asarray(np.hypot(px - ax, py - ay), dtype=np.float64)
    t = np.clip(((px - ax) * ab_x + (py - ay) * ab_y) / comprimento2, 0.0, 1.0)
    return np.asarray(np.hypot(px - (ax + t * ab_x), py - (ay + t * ab_y)), dtype=np.float64)
