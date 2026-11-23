"""Veredito da rodada e vitória antecipada (spec julgamento-do-desenho).

Exemplo:
    >>> veredito(alvo=2, probabilidades=[0.1, 0.3, 0.6]).valor
    'ACERTOU'
"""

from collections.abc import Sequence
from typing import Literal, TypeVar

from desenha_ml.ensemble import top_k
from desenha_ml.resultado import Erro, Ok, Resultado

Veredito = Literal["ACERTOU", "QUASE", "ERROU"]
T = TypeVar("T")

POSICOES_DO_QUASE = 3
PROBABILIDADE_DE_VITORIA_ANTECIPADA = 0.80
SEGUNDOS_MINIMOS_PARA_VITORIA = 2.0  # evita vitória pelo ruído do primeiro traço


def veredito(alvo: int, probabilidades: Sequence[float]) -> Resultado[Veredito]:
    erro = _validar_alvo(alvo, len(probabilidades))
    if erro:
        return erro
    palpites = top_k(probabilidades, k=min(POSICOES_DO_QUASE, len(probabilidades)))
    if isinstance(palpites, Erro):
        return palpites
    return Ok(veredito_por_posicoes(alvo, [indice for indice, _ in palpites.valor]))


def veredito_por_posicoes(alvo: T, palpites_em_ordem: Sequence[T]) -> Veredito:
    """A regra em si, sobre palpites já ordenados (índices ou nomes): 1º = alvo, alvo no top-3, ou erro."""
    if palpites_em_ordem and palpites_em_ordem[0] == alvo:
        return "ACERTOU"
    return "QUASE" if alvo in palpites_em_ordem[:POSICOES_DO_QUASE] else "ERROU"


def deve_encerrar_antes(
    alvo: int, probabilidades: Sequence[float], segundos_decorridos: float
) -> Resultado[bool]:
    resultado = veredito(alvo, probabilidades)
    if isinstance(resultado, Erro):
        return resultado
    confiante = probabilidades[alvo] >= PROBABILIDADE_DE_VITORIA_ANTECIPADA
    tempo_suficiente = segundos_decorridos >= SEGUNDOS_MINIMOS_PARA_VITORIA
    return Ok(resultado.valor == "ACERTOU" and confiante and tempo_suficiente)


def _validar_alvo(alvo: int, categorias: int) -> Erro | None:
    if 0 <= alvo < categorias:
        return None
    return Erro("alvo_invalido", f"alvo {alvo} inválido; esperado 0 <= alvo < {categorias}")
