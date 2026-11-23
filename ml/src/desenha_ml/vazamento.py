"""Detecção de vazamento da palavra secreta numa charada (spec vazamento-da-palavra-secreta).

Conservadora de propósito: um falso positivo só troca a charada; um falso negativo entrega a resposta.

Exemplo:
    >>> vaza("vaca", "Quem é a vaquinha do pasto?")
    True
"""

import re
import unicodedata

TAMANHO_MINIMO_DA_PALAVRA = 3
PREPOSICOES_IGNORADAS = frozenset({"de", "da", "do"})
# Plurais irregulares do português que não começam pela raiz do singular (aviões, sóis).
_TERMINACOES = (("oes", "ao"), ("aes", "ao"), ("aos", "ao"), ("ois", "ol"))
_PALAVRA = re.compile("[a-z0-9]+")


def forma_comparavel(texto: str) -> list[str]:
    """Etapas em ordem fixa (D5 do design): minúsculas, sem acento, palavras, qu/gu, terminações."""
    sem_acento = "".join(
        c for c in unicodedata.normalize("NFD", texto.lower()) if unicodedata.category(c) != "Mn"
    )
    return [_trocar_terminacao(p.replace("qu", "c").replace("gu", "g")) for p in _PALAVRA.findall(sem_acento)]


def vaza(palavra_secreta: str, texto: str) -> bool:
    palavras_do_texto = forma_comparavel(texto)
    return any(
        palavra == secreta or palavra.startswith(_raiz(secreta))
        for secreta in _palavras_relevantes(palavra_secreta)
        for palavra in palavras_do_texto
    )


def _palavras_relevantes(palavra_secreta: str) -> list[str]:
    return [
        p
        for p in forma_comparavel(palavra_secreta)
        if len(p) >= TAMANHO_MINIMO_DA_PALAVRA and p not in PREPOSICOES_IGNORADAS
    ]


def _raiz(palavra: str) -> str:
    return palavra[: max(TAMANHO_MINIMO_DA_PALAVRA, len(palavra) - 1)]


def _trocar_terminacao(palavra: str) -> str:
    for terminacao, troca in _TERMINACOES:
        if palavra.endswith(terminacao):
            return palavra[: -len(terminacao)] + troca
    return palavra
