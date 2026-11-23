"""Simplificação Ramer–Douglas–Peucker (ε = 2) para desenhos capturados no jogo.

O Quick, Draw! *simplified* já vem simplificado com ε = 2 nas coordenadas 0–255; o navegador captura
muito mais pontos, então aplicamos a mesma simplificação para o desenho do visitante ficar parecido com
os de treino. A distância é medida até o *segmento* (não à reta infinita), o que trata bem traços que
voltam sobre si mesmos; a implementação TypeScript usa a mesma definição.

Exemplo:
    >>> simplificar_traco(np.array([[0.0, 0.0], [1.0, 0.0], [2.0, 0.0]]), epsilon=2.0).tolist()
    [[0.0, 0.0], [2.0, 0.0]]
"""

import numpy as np
from numpy.typing import NDArray

from desenha_ml.desenho import Desenho, Traco
from desenha_ml.geometria import distancias_ao_segmento
from desenha_ml.normalizacao import normalizar

EPSILON_PADRAO = 2.0
TOLERANCIA_DE_EMPATE = 1e-9  # distâncias tão próximas assim contam como iguais


def preparar_desenho_capturado(desenho: Desenho, epsilon: float = EPSILON_PADRAO) -> Desenho:
    """Normaliza e simplifica um desenho vindo do jogo (não use em desenhos do dataset)."""
    normalizado = normalizar(desenho)
    return Desenho.de_arrays(simplificar_traco(t, epsilon) for t in normalizado.tracos)


def simplificar_traco(traco: Traco, epsilon: float) -> NDArray[np.float64]:
    """RDP iterativo (pilha explícita) para não estourar a recursão em traços longos."""
    if len(traco) < 3:
        return np.array(traco, dtype=np.float64)
    manter = np.zeros(len(traco), dtype=bool)
    manter[[0, -1]] = True
    pilha = [(0, len(traco) - 1)]
    while pilha:
        inicio, fim = pilha.pop()
        indice, distancia = _ponto_mais_distante(traco, inicio, fim)
        if distancia > epsilon:
            manter[indice] = True
            pilha.extend([(inicio, indice), (indice, fim)])
    return np.array(traco[manter], dtype=np.float64)


def _ponto_mais_distante(traco: Traco, inicio: int, fim: int) -> tuple[int, float]:
    if fim - inicio < 2:
        return inicio, 0.0
    distancias = distancias_ao_segmento(traco[inicio + 1 : fim], traco[inicio], traco[fim])
    # Empate (até TOLERANCIA_DE_EMPATE do máximo) fica com o menor índice, nas duas linguagens (D8).
    posicao = int(np.argmax(distancias >= float(np.max(distancias)) - TOLERANCIA_DE_EMPATE))
    return inicio + 1 + posicao, float(distancias[posicao])
