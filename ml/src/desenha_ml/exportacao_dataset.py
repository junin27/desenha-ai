"""Separação estratificada, formatos ShareGPT/ChatML, relatório e charadas de reserva (spec dataset-do-ze).

Exemplo:
    >>> avaliar_volume({"CHARADA": 100, "VEREDITO": 100, "PERGUNTA": 100})
    (True, [])
"""

import json
import random
from collections import Counter
from collections.abc import Mapping, Sequence
from pathlib import Path
from typing import TypedDict

from desenha_ml.categorias import CATEGORIAS
from desenha_ml.contratos_regras import Json
from desenha_ml.conversa import INSTRUCAO_DE_SISTEMA, ler_charada, ler_fala
from desenha_ml.resultado import Ok
from desenha_ml.teacher import RegistroBruto

TAREFAS = ("CHARADA", "VEREDITO", "PERGUNTA")
FRACAO_DE_VALIDACAO_E_TESTE = 0.1
MINIMO_EM_VALIDACAO_E_TESTE = 3
MINIMO_TOTAL = 300
MINIMO_POR_TAREFA = 60
NOMES_DOS_CONJUNTOS = ("treino", "val", "teste")


# "from" é palavra reservada em Python; a sintaxe funcional do TypedDict permite a chave.
MensagemSG = TypedDict("MensagemSG", {"from": str, "value": str})


class ConversaShareGPT(TypedDict):
    conversations: list[MensagemSG]
    tarefa: str
    meta: dict[str, Json]


class MensagemChatML(TypedDict):
    role: str
    content: str


class ConversaChatML(TypedDict):
    messages: list[MensagemChatML]
    tarefa: str
    meta: dict[str, Json]


Conjuntos = tuple[list[RegistroBruto], list[RegistroBruto], list[RegistroBruto]]


def separar_por_tarefa(aprovadas: Sequence[RegistroBruto], semente: int) -> Conjuntos:
    """Por tarefa: 10% teste, 10% validação (mínimo 3 cada) e o resto treino, com sorteio determinístico."""
    sorteio = random.Random(semente)
    treino: list[RegistroBruto] = []
    validacao: list[RegistroBruto] = []
    teste: list[RegistroBruto] = []
    for tarefa in TAREFAS:
        da_tarefa = [a for a in aprovadas if a["tarefa"] == tarefa]
        sorteio.shuffle(da_tarefa)
        reservadas = max(MINIMO_EM_VALIDACAO_E_TESTE, round(FRACAO_DE_VALIDACAO_E_TESTE * len(da_tarefa)))
        teste += da_tarefa[:reservadas]
        validacao += da_tarefa[reservadas : 2 * reservadas]
        treino += da_tarefa[2 * reservadas :]
    return treino, validacao, teste


def para_sharegpt(amostra: RegistroBruto) -> ConversaShareGPT:
    mensagens: list[MensagemSG] = [
        {"from": "system", "value": INSTRUCAO_DE_SISTEMA},
        {"from": "human", "value": amostra["entrada"]},
        {"from": "gpt", "value": amostra["saida"] or ""},
    ]
    return {"conversations": mensagens, "tarefa": amostra["tarefa"], "meta": amostra["meta"]}


def para_chatml(amostra: RegistroBruto) -> ConversaChatML:
    mensagens: list[MensagemChatML] = [
        {"role": "system", "content": INSTRUCAO_DE_SISTEMA},
        {"role": "user", "content": amostra["entrada"]},
        {"role": "assistant", "content": amostra["saida"] or ""},
    ]
    return {"messages": mensagens, "tarefa": amostra["tarefa"], "meta": amostra["meta"]}


def avaliar_volume(aprovadas_por_tarefa: Mapping[str, int]) -> tuple[bool, list[str]]:
    """Suficiente só com 300 aprovadas no total e 60 por tarefa; os motivos dizem o que faltou."""
    motivos = [
        f"{tarefa}: {aprovadas_por_tarefa.get(tarefa, 0)} amostras < {MINIMO_POR_TAREFA}"
        for tarefa in TAREFAS
        if aprovadas_por_tarefa.get(tarefa, 0) < MINIMO_POR_TAREFA
    ]
    total = sum(aprovadas_por_tarefa.values())
    if total < MINIMO_TOTAL:
        motivos.append(f"total: {total} amostras < {MINIMO_TOTAL}")
    return not motivos, motivos


def charadas_de_reserva(aprovadas: Sequence[RegistroBruto]) -> tuple[dict[str, list[str]], list[str]]:
    """Charadas aprovadas por categoria (modo offline do jogo) e as categorias que ficaram sem nenhuma."""
    reserva: dict[str, list[str]] = {}
    for amostra in aprovadas:
        charada = _charada(amostra)
        if charada is not None:
            reserva.setdefault(str(amostra["meta"]["palavra"]), []).append(charada)
    ausentes = [c.pt for c in CATEGORIAS if c.pt not in reserva]
    return reserva, ausentes


def _charada(amostra: RegistroBruto) -> str | None:
    if amostra["tarefa"] != "CHARADA" or amostra["saida"] is None:
        return None
    fala = ler_fala(amostra["saida"])
    if not isinstance(fala, Ok):
        return None
    charada = ler_charada(fala.valor.resposta)
    return charada.valor if isinstance(charada, Ok) else None


def exportar_dataset(
    aprovadas: Sequence[RegistroBruto], pasta: Path, semente: int, relatorio_base: Mapping[str, Json]
) -> dict[str, Json]:
    """Grava treino/val/teste (ShareGPT e ChatML), charadas de reserva e relatório; devolve o relatório."""
    pasta.mkdir(parents=True, exist_ok=True)
    conjuntos = separar_por_tarefa(aprovadas, semente)
    for nome, conjunto in zip(NOMES_DOS_CONJUNTOS, conjuntos, strict=True):
        _gravar_jsonl(pasta / f"zedorabisco_{nome}.jsonl", [para_sharegpt(a) for a in conjunto])
        _gravar_jsonl(pasta / f"zedorabisco_{nome}_chatml.jsonl", [para_chatml(a) for a in conjunto])
    reserva, ausentes = charadas_de_reserva(aprovadas)
    _gravar_json(pasta / "charadas_reserva.json", reserva)
    por_tarefa = Counter(a["tarefa"] for a in aprovadas)
    suficiente, motivos = avaliar_volume(por_tarefa)
    relatorio: dict[str, Json] = {
        **relatorio_base,
        "aprovadas": len(aprovadas),
        "aprovadas_por_tarefa": dict(por_tarefa),
        "conjuntos": {nome: len(c) for nome, c in zip(NOMES_DOS_CONJUNTOS, conjuntos, strict=True)},
        "suficiente": suficiente,
        "motivos_de_insuficiencia": list(motivos),
        "categorias_sem_charada": list(ausentes),
    }
    _gravar_json(pasta / "relatorio_dataset.json", relatorio)
    return relatorio


def _gravar_jsonl(caminho: Path, linhas: Sequence[Mapping[str, object]]) -> None:
    caminho.write_text(
        "".join(json.dumps(linha, ensure_ascii=False) + "\n" for linha in linhas), encoding="utf8"
    )


def _gravar_json(caminho: Path, conteudo: object) -> None:
    caminho.write_text(json.dumps(conteudo, ensure_ascii=False, indent=1) + "\n", encoding="utf8")
