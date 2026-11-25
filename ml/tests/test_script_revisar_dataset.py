"""Requisito "Revisão só do treino" — spec dataset-do-ze (scripts/revisar_dataset.py)."""

import importlib.util
import json
import zipfile
from collections.abc import Mapping
from pathlib import Path
from types import ModuleType

RAIZ = Path(__file__).parents[2]
SISTEMA = "Você é o Zé."
VEREDITO = {
    "entrada": "TAREFA: VEREDITO\nDesafio: sol\nEnsemble: sol 80%, lua 10%, gato 5%, cobra 3%, raio 1%",
    "saida": (
        "<pensamento>Texto livre do Teacher.</pensamento>\n"
        "<resposta>VEREDITO: ACERTOU\nNARRAÇÃO: Uai!</resposta>"
    ),
    "tarefa": "VEREDITO",
    "meta": {"regra": "ACERTOU", "alvo": "sol"},
}
CHARADA_CURTA = {
    "entrada": "TAREFA: CHARADA\nPalavra secreta: sol\nNível: fácil",
    "saida": "<pensamento>A palavra é sol. Curto.</pensamento>\n<resposta>Charada: Brilha.</resposta>",
    "tarefa": "CHARADA",
    "meta": {"palavra": "sol"},
}


def _carregar_script() -> ModuleType:
    especificacao = importlib.util.spec_from_file_location(
        "revisar_dataset", RAIZ / "scripts" / "revisar_dataset.py"
    )
    assert especificacao is not None and especificacao.loader is not None
    modulo = importlib.util.module_from_spec(especificacao)
    especificacao.loader.exec_module(modulo)
    return modulo


def _chatml(amostra: Mapping[str, object]) -> str:
    mensagens = [
        {"role": "system", "content": SISTEMA},
        {"role": "user", "content": amostra["entrada"]},
        {"role": "assistant", "content": amostra["saida"]},
    ]
    return json.dumps({"messages": mensagens, "tarefa": amostra["tarefa"], "meta": amostra["meta"]})


def _sharegpt(amostra: Mapping[str, object]) -> str:
    conversa = [
        {"from": "system", "value": SISTEMA},
        {"from": "human", "value": amostra["entrada"]},
        {"from": "gpt", "value": amostra["saida"]},
    ]
    return json.dumps({"conversations": conversa, "tarefa": amostra["tarefa"], "meta": amostra["meta"]})


def _zip_de_entrada(caminho: Path) -> None:
    amostras = [VEREDITO, CHARADA_CURTA]
    with zipfile.ZipFile(caminho, "w") as arquivo:
        arquivo.writestr("zedorabisco_treino_chatml.jsonl", "\n".join(_chatml(a) for a in amostras) + "\n")
        arquivo.writestr("zedorabisco_treino.jsonl", "\n".join(_sharegpt(a) for a in amostras) + "\n")
        arquivo.writestr("zedorabisco_teste_chatml.jsonl", _chatml(CHARADA_CURTA) + "\n")
        arquivo.writestr("zedorabisco_val_chatml.jsonl", _chatml(VEREDITO) + "\n")
        arquivo.writestr("charadas_reserva.json", "{}")


def test_revisao_so_do_treino_mantem_teste_e_validacao_byte_a_byte(tmp_path: Path) -> None:
    entrada, saida = tmp_path / "entrada.zip", tmp_path / "saida.zip"
    _zip_de_entrada(entrada)

    _carregar_script().revisar_zip(entrada, saida)

    with zipfile.ZipFile(entrada) as antes, zipfile.ZipFile(saida) as depois:
        for nome in (
            "zedorabisco_teste_chatml.jsonl",
            "zedorabisco_val_chatml.jsonl",
            "charadas_reserva.json",
        ):
            assert depois.read(nome) == antes.read(nome)


def test_revisao_so_do_treino_revisa_os_dois_formatos_e_conta(tmp_path: Path) -> None:
    entrada, saida = tmp_path / "entrada.zip", tmp_path / "saida.zip"
    _zip_de_entrada(entrada)

    relatorio = _carregar_script().revisar_zip(entrada, saida)

    with zipfile.ZipFile(saida) as depois:
        chatml = [json.loads(linha) for linha in depois.read("zedorabisco_treino_chatml.jsonl").splitlines()]
        sharegpt = [json.loads(linha) for linha in depois.read("zedorabisco_treino.jsonl").splitlines()]
        assert json.loads(depois.read("relatorio_revisao.json")) == relatorio
    assert len(chatml) == len(sharegpt) == 1  # a charada curta saiu dos dois
    assert "sol está em 1º lugar no Ensemble" in chatml[0]["messages"][2]["content"]
    assert chatml[0]["messages"][2]["content"] == sharegpt[0]["conversations"][2]["value"]
    assert relatorio["motivos"] == {"veredito_pela_regra": 1, "charada_curta": 1}
    assert relatorio["treino"] == {"antes": 2, "depois": 1}
