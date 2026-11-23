"""Formato da conversa com o Zé do Rabisco: entradas das tarefas e leitura da fala (spec conversa-com-o-ze).

O mesmo formato existe em `app/src/domain/ze/conversa.ts` e é amarrado por `contratos/conversa.json`.

Exemplo:
    >>> ler_fala("<pensamento>ok</pensamento><resposta>Charada: Muuu?</resposta>").valor.resposta
    'Charada: Muuu?'
"""

import math
import re
from collections.abc import Sequence
from dataclasses import dataclass
from typing import Literal

from desenha_ml.resultado import Erro, Ok, Resultado
from desenha_ml.texto import ESPACOS, normalizar_espacos
from desenha_ml.veredito import Veredito

INSTRUCAO_DE_SISTEMA = (
    "Você é o Zé do Rabisco, locutor de rodeio goiano do jogo Desenha Aí, Sô!. "
    "Raciocine de forma curta dentro de <pensamento>...</pensamento> e responda dentro de "
    "<resposta>...</resposta>, em português, com humor caipira e respeitoso."
)
NIVEIS = ("fácil", "médio", "difícil")
TAMANHO_MAXIMO_DA_PERGUNTA = 200
TOLERANCIA_DO_ARREDONDAMENTO = 1e-9  # 0,345 vale 0,34499... em binário (D2 do design)
TAGS = ("<pensamento>", "</pensamento>", "<resposta>", "</resposta>")
PREFIXO_DA_CHARADA = "Charada:"

_FALA = re.compile(
    "^"
    + ESPACOS
    + "*<pensamento>(.*?)</pensamento>"
    + ESPACOS
    + "*<resposta>(.*?)</resposta>"
    + ESPACOS
    + "*$",
    flags=re.DOTALL,
)
_VEREDITO = re.compile(
    "^VEREDITO:[ \t]*(ACERTOU|QUASE|ERROU)[ \t]*\r?\n" + ESPACOS + "*NARRAÇÃO:[ \t]*(.+)$",
    flags=re.DOTALL,
)

_VEREDITOS: dict[str, Veredito] = {"ACERTOU": "ACERTOU", "QUASE": "QUASE", "ERROU": "ERROU"}

Etapa = Literal["pensando", "respondendo", "completa"]
Palpites = Sequence[tuple[str, float]]


@dataclass(frozen=True)
class Fala:
    pensamento: str
    resposta: str


@dataclass(frozen=True)
class LeituraParcial:
    etapa: Etapa
    pensamento: str
    resposta: str


def porcentagem(probabilidade: float) -> int:
    """Inteiro mais próximo, meio para cima, igual em Python e TypeScript (round() e Math.round divergem)."""
    return math.floor(100 * probabilidade + 0.5 + TOLERANCIA_DO_ARREDONDAMENTO)


def entrada_charada(palavra: str, nivel: str) -> Resultado[str]:
    if nivel not in NIVEIS:
        return Erro("nivel_invalido", f"nível {nivel!r} inválido; esperado um de {NIVEIS}")
    return Ok(f"TAREFA: CHARADA\nPalavra secreta: {palavra}\nNível: {nivel}")


def entrada_veredito(alvo: str, fracao: float, cnn: Palpites, lstm: Palpites, ensemble: Palpites) -> str:
    linhas = [
        "TAREFA: VEREDITO",
        f"Desafio: {alvo}",
        f"Desenho concluído: {porcentagem(fracao)}%",
        f"CNN (imagem): {_palpites(cnn)}",
        f"LSTM (traços): {_palpites(lstm)}",
        f"Ensemble: {_palpites(ensemble)}",
    ]
    return "\n".join(linhas)


def _palpites(palpites: Palpites) -> str:
    return ", ".join(f"{nome} {porcentagem(p)}%" for nome, p in palpites)


def entrada_pergunta(pergunta: str) -> Resultado[str]:
    limpa = normalizar_espacos(pergunta)
    if not 1 <= len(limpa) <= TAMANHO_MAXIMO_DA_PERGUNTA:
        detalhe = f"pergunta com {len(limpa)} caracteres; esperado de 1 a {TAMANHO_MAXIMO_DA_PERGUNTA}"
        return Erro("pergunta_invalida", detalhe)
    return Ok(f"TAREFA: PERGUNTA\nVisitante: {limpa}")


def ler_fala(texto: str) -> Resultado[Fala]:
    """Exatamente um <pensamento> seguido de um <resposta>, só espaços fora deles."""
    encontrado = _FALA.match(texto)
    if encontrado is None or any(texto.count(tag) != 1 for tag in TAGS):
        return Erro("formato_invalido", f"fala fora do formato <pensamento>/<resposta>: {texto[:80]!r}")
    return Ok(Fala(pensamento=encontrado.group(1).strip(), resposta=encontrado.group(2).strip()))


def ler_charada(resposta: str) -> Resultado[str]:
    texto = resposta.strip()
    if not texto.startswith(PREFIXO_DA_CHARADA) or not texto[len(PREFIXO_DA_CHARADA) :].strip():
        return Erro("formato_invalido", f"charada sem o prefixo {PREFIXO_DA_CHARADA!r}: {texto[:80]!r}")
    return Ok(texto[len(PREFIXO_DA_CHARADA) :].strip())


def ler_veredito(resposta: str) -> Resultado[tuple[Veredito, str]]:
    encontrado = _VEREDITO.match(resposta.strip())
    if encontrado is None or not encontrado.group(2).strip():
        return Erro("formato_invalido", f"veredito fora do formato VEREDITO/NARRAÇÃO: {resposta[:80]!r}")
    return Ok((_VEREDITOS[encontrado.group(1)], encontrado.group(2).strip()))


def ler_parcial(texto: str) -> LeituraParcial:
    """Leitura durante o streaming: corta pedaço de tag incompleto no fim e informa a etapa (D3)."""
    texto = _sem_tag_incompleta(texto)
    if "</pensamento>" not in texto:
        return LeituraParcial("pensando", _depois_de(texto, "<pensamento>").lstrip(), "")
    pensamento = _depois_de(texto, "<pensamento>").split("</pensamento>")[0].strip()
    resto = texto.split("</pensamento>", 1)[1]
    if "</resposta>" not in resto:
        return LeituraParcial("respondendo", pensamento, _depois_de(resto, "<resposta>").lstrip())
    return LeituraParcial(
        "completa", pensamento, _depois_de(resto, "<resposta>").split("</resposta>")[0].strip()
    )


def _depois_de(texto: str, tag: str) -> str:
    return texto.split(tag, 1)[1] if tag in texto else ""


def _sem_tag_incompleta(texto: str) -> str:
    inicio = texto.rfind("<")
    if inicio == -1:
        return texto
    final = texto[inicio:]
    eh_pedaco_de_tag = any(tag.startswith(final) and tag != final for tag in TAGS)
    return texto[:inicio] if eh_pedaco_de_tag else texto
