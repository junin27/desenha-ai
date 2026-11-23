"""Prefixo do desenho: o que o jogo "vê" enquanto a pessoa ainda está desenhando.

Exemplo:
    >>> d = Desenho.de_arrays([np.arange(8).reshape(4, 2), np.arange(12).reshape(6, 2)])
    >>> [len(t) for t in prefixo(d, 0.5).valor.tracos]
    [4, 1]
"""

import math

from desenha_ml.desenho import Desenho
from desenha_ml.normalizacao import normalizar
from desenha_ml.resultado import Erro, Ok, Resultado

PONTOS_MINIMOS = 2
# Tolerância para o teto não subir por erro de ponto flutuante (0,3 x 10 = 3,0000000000000004).
TOLERANCIA_DO_TETO = 1e-9


def prefixo(desenho: Desenho, fracao: float) -> Resultado[Desenho]:
    if not 0.0 < fracao <= 1.0:  # também recusa NaN
        return Erro("fracao_invalida", f"fração {fracao!r} inválida; esperado 0 < p <= 1")
    total = desenho.total_de_pontos
    quantidade = max(min(PONTOS_MINIMOS, total), math.ceil(fracao * total - TOLERANCIA_DO_TETO))
    return Ok(normalizar(_primeiros_pontos(desenho, quantidade)))


def _primeiros_pontos(desenho: Desenho, quantidade: int) -> Desenho:
    tracos, restante = [], quantidade
    for traco in desenho.tracos:
        if restante <= 0:
            break
        tracos.append(traco[:restante])
        restante -= len(traco)
    return Desenho.de_arrays(tracos)
