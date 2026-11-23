"""Ensemble CNN + LSTM e palpites ordenados (spec julgamento-do-desenho).

As contas usam floats do Python, um elemento por vez, na mesma ordem de `app/src/domain/rodada/ensemble.ts`,
para o contrato bater (numpy poderia reordenar somas).

Exemplo:
    >>> top_k(combinar([0.6, 0.4], [0.2, 0.8], w_cnn=1.0).valor, k=1).valor
    ((0, 0.6),)
"""

import math
from collections.abc import Sequence

from desenha_ml.resultado import Erro, Ok, Resultado

TOLERANCIA_DA_SOMA = 1e-3

Probabilidades = tuple[float, ...]
Palpites = tuple[tuple[int, float], ...]


def combinar(p_cnn: Sequence[float], p_lstm: Sequence[float], w_cnn: float) -> Resultado[Probabilidades]:
    """w_cnn x p_cnn + (1 - w_cnn) x p_lstm, categoria por categoria."""
    if not 0.0 <= w_cnn <= 1.0:  # também recusa NaN
        return Erro("peso_invalido", f"w_cnn = {w_cnn!r} inválido; esperado 0 <= w_cnn <= 1")
    if len(p_cnn) != len(p_lstm):
        detalhe = f"CNN com {len(p_cnn)} categorias e LSTM com {len(p_lstm)}; esperado o mesmo tamanho"
        return Erro("probabilidades_invalidas", detalhe)
    for nome, probabilidades in (("CNN", p_cnn), ("LSTM", p_lstm)):
        problema = problema_nas_probabilidades(probabilidades)
        if problema:
            return Erro("probabilidades_invalidas", f"{nome}: {problema}")
    return Ok(tuple(w_cnn * a + (1.0 - w_cnn) * b for a, b in zip(p_cnn, p_lstm, strict=True)))


def problema_nas_probabilidades(probabilidades: Sequence[float]) -> str | None:
    """Descreve o problema, ou None se for uma distribuição válida."""
    if len(probabilidades) == 0:
        return "lista vazia; esperado ao menos 1 categoria"
    if any(not 0.0 <= p <= 1.0 for p in probabilidades):
        return f"valores fora de [0, 1]: {list(probabilidades)}"
    soma = math.fsum(probabilidades)
    if abs(soma - 1.0) > TOLERANCIA_DA_SOMA:
        return f"soma {soma} fora de [0,999; 1,001]"
    return None


def top_k(probabilidades: Sequence[float], k: int) -> Resultado[Palpites]:
    """Palpites em ordem decrescente; empate exato fica com o menor índice (ordenação estável)."""
    if not 1 <= k <= len(probabilidades):
        return Erro("k_invalido", f"k = {k} inválido; esperado 1 <= k <= {len(probabilidades)}")
    ordenados = sorted(enumerate(probabilidades), key=lambda par: (-par[1], par[0]))
    return Ok(tuple((indice, float(p)) for indice, p in ordenados[:k]))
