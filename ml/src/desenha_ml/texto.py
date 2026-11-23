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


def normalizar_espacos(texto: str) -> str:
    """Troca sequências de espaços por um só e tira os das pontas."""
    return _SEQUENCIA_DE_ESPACOS.sub(" ", texto).strip(" ")
