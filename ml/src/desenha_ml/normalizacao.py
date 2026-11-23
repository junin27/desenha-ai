"""Normalização igual à do Quick, Draw! *simplified*: alinha ao canto e escala a maior dimensão para 255.

Exemplo:
    >>> normalizar(Desenho.de_arrays([[[10, 20], [110, 20]]])).tracos[0].tolist()
    [[0.0, 0.0], [255.0, 0.0]]
"""

import numpy as np

from desenha_ml.desenho import Desenho

ESCALA_MAXIMA = 255.0
DIMENSAO_MINIMA = 1.0  # evita divisão por zero em ponto único ou linha degenerada


def normalizar(desenho: Desenho) -> Desenho:
    pontos = desenho.todos_os_pontos()
    origem = pontos.min(axis=0)
    maior_dimensao = max(float(np.max(pontos.max(axis=0) - origem)), DIMENSAO_MINIMA)
    fator = ESCALA_MAXIMA / maior_dimensao
    return Desenho.de_arrays((t - origem) * fator for t in desenho.tracos)
