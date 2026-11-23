"""Sequência stroke-3 da LSTM: (Δx/255, Δy/255, fim_do_traço) por ponto, na ordem do desenho.

Exemplo:
    >>> from desenha_ml.desenho import Desenho
    >>> sequenciar(Desenho.de_arrays([[[0.0, 0.0], [255.0, 0.0]]])).tolist()
    [[0.0, 0.0, 0.0], [1.0, 0.0, 1.0]]
"""

import numpy as np
from numpy.typing import NDArray

from desenha_ml.desenho import Desenho
from desenha_ml.normalizacao import ESCALA_MAXIMA, normalizar

MAXIMO_DE_PONTOS = 130  # cobre ~95% dos desenhos do Quick, Draw! simplified (ver notebook 1)


def sequenciar(desenho: Desenho) -> NDArray[np.float32]:
    normalizado = normalizar(desenho)
    pontos = normalizado.todos_os_pontos()[:MAXIMO_DE_PONTOS]
    deltas = np.diff(pontos, axis=0, prepend=np.zeros((1, 2))) / ESCALA_MAXIMA
    fim_do_traco = _marcas_de_fim_de_traco(normalizado)[:MAXIMO_DE_PONTOS]
    return np.column_stack([deltas, fim_do_traco]).astype(np.float32)


def _marcas_de_fim_de_traco(desenho: Desenho) -> NDArray[np.float64]:
    marcas = [np.zeros(len(t)) for t in desenho.tracos]
    for marca in marcas:
        marca[-1] = 1.0
    return np.concatenate(marcas)
