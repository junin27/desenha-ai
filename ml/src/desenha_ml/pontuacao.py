"""Pontos da rodada, da partida e ordem do placar (spec pontuacao-e-placar).

Exemplo:
    >>> pontos_da_rodada("ACERTOU", segundos_restantes=10.0)
    125
"""

import math
import re
from collections.abc import Iterable, Sequence
from dataclasses import dataclass

from desenha_ml.resultado import Erro, Ok, Resultado
from desenha_ml.veredito import Veredito

SEGUNDOS_DA_RODADA = 20.0
RODADAS_POR_PARTIDA = 3
PONTOS_ACERTOU = 100
PONTOS_QUASE = 30
BONUS_MAXIMO = 50
TAMANHO_DO_PLACAR = 10
TAMANHO_MAXIMO_DO_NOME = 16

# Conjunto explícito de espaços: str.split() e o \s do JavaScript não concordam em todos os caracteres.
_ESPACOS = re.compile("[ \t\n\r ]+")


@dataclass(frozen=True)
class PartidaNoPlacar:
    nome: str
    pontos: int
    terminada_em_ms: int  # milissegundos desde 1970 (UTC)


def pontos_da_rodada(veredito: Veredito, segundos_restantes: float) -> int:
    """Piso no bônus: round() do Python e Math.round do JS divergem em empates (D3 do design)."""
    if veredito == "QUASE":
        return PONTOS_QUASE
    if veredito == "ERROU":
        return 0
    restantes = min(max(segundos_restantes, 0.0), SEGUNDOS_DA_RODADA)
    return PONTOS_ACERTOU + math.floor(BONUS_MAXIMO * restantes / SEGUNDOS_DA_RODADA)


def pontos_da_partida(pontos_das_rodadas: Iterable[int]) -> int:
    return sum(pontos_das_rodadas)


def limpar_nome(nome: str) -> Resultado[str]:
    """Tira espaços das pontas e repetidos; o tamanho conta caracteres (um emoji vale 1)."""
    limpo = _ESPACOS.sub(" ", nome).strip(" ")
    if not 1 <= len(limpo) <= TAMANHO_MAXIMO_DO_NOME:
        detalhe = f"nome {limpo!r} com {len(limpo)} caracteres; esperado de 1 a {TAMANHO_MAXIMO_DO_NOME}"
        return Erro("nome_invalido", detalhe)
    return Ok(limpo)


def ordenar_placar(partidas: Sequence[PartidaNoPlacar]) -> list[PartidaNoPlacar]:
    """Mais pontos primeiro; empate fica com quem terminou antes; corta nas 10 melhores."""
    return sorted(partidas, key=lambda p: (-p.pontos, p.terminada_em_ms))[:TAMANHO_DO_PLACAR]
