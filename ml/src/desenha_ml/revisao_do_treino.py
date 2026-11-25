"""Revisão offline do conjunto de treino do Zé, sem chamar o Teacher (spec dataset-do-ze).

Duas correções medidas nas rodadas de 24/11/2026: o Zé erra a posição do desafio no veredito (o raciocínio
do Teacher é certo, mas escrito cada vez de um jeito) e o pensamento da charada cita a palavra secreta.

Exemplo:
    >>> texto = "A palavra é sol. Vou falar do calor e da luz que aquece a roça cedinho."
    >>> pensamento_sem_a_palavra(texto, "sol")
    'Vou falar do calor e da luz que aquece a roça cedinho.'
"""

import re
from collections.abc import Mapping, Sequence
from typing import TypeGuard, get_args

from desenha_ml.contratos_regras import Json
from desenha_ml.curadoria import PALAVRAS_DO_PENSAMENTO
from desenha_ml.vazamento import vaza
from desenha_ml.veredito import POSICOES_DO_QUASE, Veredito, veredito_por_posicoes

VEREDITOS: tuple[str, ...] = get_args(Veredito)
ROTEIRO_DA_REGRA = "1º lugar = ACERTOU; 2º ou 3º = QUASE; fora do top-3 = ERROU"
_PALPITE = re.compile(r"(.+?) (\d+)%")
_PENSAMENTO = re.compile(r"<pensamento>.*?</pensamento>", flags=re.DOTALL)
_FIM_DE_FRASE = re.compile(r"(?<=[.!?])\s+")
_ABERTURA_REPETIDA = re.compile(r"\b([Oo]) que [eé][\s,:;]*o que [eé]\b", flags=re.IGNORECASE)


def pensamento_do_veredito(entrada: str, regra: Veredito) -> str | None:
    """Roteiro fixo e verificável; None se a posição do desafio não leva ao rótulo da amostra."""
    desafio = _campo(entrada, "Desafio")
    palpites = _palpites_do_ensemble(entrada)
    if desafio is None or not palpites or veredito_por_posicoes(desafio, [n for n, _ in palpites]) != regra:
        return None
    primeiro, chance = palpites[0]
    return (
        f"O desafio era {desafio}. O primeiro palpite do Ensemble foi {primeiro} com {chance}%. "
        f"{_frase_da_posicao(desafio, [n for n, _ in palpites])} "
        f"Pela regra ({ROTEIRO_DA_REGRA}), o veredito é {regra}."
    )


def _frase_da_posicao(desafio: str, nomes: Sequence[str]) -> str:
    if desafio not in nomes:
        return f"{desafio} não aparece entre os palpites do Ensemble."
    posicao = nomes.index(desafio) + 1
    if posicao == 1:
        return f"{desafio} está em 1º lugar no Ensemble."
    dentro = "dentro" if posicao <= POSICOES_DO_QUASE else "fora"
    return f"{desafio} está em {posicao}º lugar no Ensemble, {dentro} do top-3."


def _campo(entrada: str, nome: str) -> str | None:
    for linha in entrada.splitlines():
        if linha.startswith(f"{nome}:"):
            return linha.split(":", 1)[1].strip()
    return None


def _palpites_do_ensemble(entrada: str) -> list[tuple[str, int]]:
    lista = _campo(entrada, "Ensemble") or ""
    achados = [_PALPITE.fullmatch(parte.strip()) for parte in lista.split(",")]
    return [(achado.group(1), int(achado.group(2))) for achado in achados if achado is not None]


def pensamento_sem_a_palavra(pensamento: str, palavra: str) -> str | None:
    """Tira as frases em que a palavra vaza; None se sobrar menos que o mínimo de palavras do pensamento."""
    frases = [frase for frase in _FIM_DE_FRASE.split(pensamento.strip()) if not vaza(palavra, frase)]
    revisado = " ".join(frases)
    return revisado if len(revisado.split()) >= PALAVRAS_DO_PENSAMENTO[0] else None


Motivos = tuple[str, ...]


def abertura_sem_repeticao(texto: str) -> str:
    """Troca "o que é, o que é" por um só "O que é": a repetição vira laço na geração gulosa."""
    return _ABERTURA_REPETIDA.sub(lambda achado: f"{achado.group(1)} que é", texto)


def revisar_saida(
    tarefa: str, entrada: str, meta: Mapping[str, Json], saida: str
) -> tuple[str | None, Motivos]:
    """Saída revisada (None = sai do treino) e os motivos das mudanças, para o relatório."""
    if _PENSAMENTO.search(saida) is None or tarefa == "PERGUNTA":
        return saida, ()
    if tarefa == "VEREDITO":
        return _revisar_veredito(entrada, meta, saida)
    return _revisar_charada(str(meta.get("palavra", "")), saida)


def _revisar_veredito(entrada: str, meta: Mapping[str, Json], saida: str) -> tuple[str | None, Motivos]:
    regra = meta.get("regra")
    novo = pensamento_do_veredito(entrada, regra) if _e_veredito(regra) else None
    return (_trocar(saida, novo), ("veredito_pela_regra",)) if novo else (saida, ("veredito_divergente",))


def _revisar_charada(palavra: str, saida: str) -> tuple[str | None, Motivos]:
    sem_repeticao = abertura_sem_repeticao(saida)
    motivos: Motivos = ("charada_sem_repeticao",) if sem_repeticao != saida else ()
    pensamento = _PENSAMENTO.search(sem_repeticao)
    atual = pensamento.group(0)[len("<pensamento>") : -len("</pensamento>")] if pensamento else ""
    sem_palavra = pensamento_sem_a_palavra(atual, palavra)
    if sem_palavra is None:
        return None, (*motivos, "charada_curta")
    if sem_palavra == atual:
        return sem_repeticao, motivos
    return _trocar(sem_repeticao, sem_palavra), (*motivos, "charada_sem_palavra")


def _e_veredito(valor: Json) -> TypeGuard[Veredito]:
    return valor in VEREDITOS


def _trocar(saida: str, pensamento: str) -> str:
    return _PENSAMENTO.sub(lambda _: f"<pensamento>{pensamento}</pensamento>", saida, count=1)
