"""Gera `contratos/prompt_qwen.json`: prompts de inferência das três tarefas para o TypeScript reproduzir.

Exemplo:
    >>> gerar_contrato_do_prompt()["parada"]
    '<|im_end|>'
"""

from desenha_ml.contratos_regras import Json
from desenha_ml.conversa import entrada_charada, entrada_pergunta, entrada_veredito
from desenha_ml.prompt_qwen import PARADA, prompt_de_inferencia
from desenha_ml.resultado import Ok

_TOP = [("vaca", 0.625), ("cavalo", 0.2), ("porco", 0.1), ("gato", 0.05), ("xícara de café", 0.025)]


def gerar_contrato_do_prompt() -> dict[str, Json]:
    entradas = [
        _valor(entrada_charada("xícara de café", "difícil")),
        entrada_veredito("vaca", 0.35, _TOP, _TOP, _TOP),
        _valor(entrada_pergunta("Isso aí é o ChatGPT, sô?")),
        'texto livre com <tags>, aspas "duplas", barra \\ e\nquebra de linha',
    ]
    casos: list[Json] = [{"entrada": e, "prompt": prompt_de_inferencia(e)} for e in entradas]
    return {"versao": 1, "parada": PARADA, "casos": casos}


def _valor(resultado: object) -> str:
    if not isinstance(resultado, Ok) or not isinstance(resultado.valor, str):
        raise ValueError(f"entrada inválida no contrato do prompt: {resultado!r}")
    return resultado.valor
