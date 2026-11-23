"""Utilidades de texto compartilhadas pelas regras (nome no placar, pergunta do visitante, fala do Zé).

Conjunto explícito de espaços: `str.split()` do Python e o `\\s` do JavaScript não concordam em todos os
caracteres (D7 da change regras-da-rodada); o TypeScript usa exatamente o mesmo conjunto.

Exemplo:
    >>> normalizar_espacos("  Zé   da  Roça ")
    'Zé da Roça'
"""

import re

ESPACOS = "[ \t\n\r\u00a0]"
_SEQUENCIA_DE_ESPACOS = re.compile(ESPACOS + "+")
_CARACTERES_DE_ESPACO = " \t\n\r\u00a0"


def normalizar_espacos(texto: str) -> str:
    """Troca sequências de espaços por um só e tira os das pontas."""
    return _SEQUENCIA_DE_ESPACOS.sub(" ", texto).strip(" ")


def aparar(texto: str) -> str:
    """Tira espaços das pontas pelo conjunto explícito (`str.strip()` e o `trim()` do JS diferem)."""
    return texto.strip(_CARACTERES_DE_ESPACO)


def aparar_inicio(texto: str) -> str:
    """Como `aparar`, só no início (texto parcial do streaming ainda pode crescer no fim)."""
    return texto.lstrip(_CARACTERES_DE_ESPACO)
