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
    # Multiplica antes de dividir: 100 * (255 / 100) dá 254,99999999999997, e 100 * 255 / 100 dá 255 exato.
    # O TypeScript faz as operações nesta mesma ordem para o contrato bater.
    return Desenho.de_arrays((t - origem) * ESCALA_MAXIMA / maior_dimensao for t in desenho.tracos)
