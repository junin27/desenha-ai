"""Requisitos "Separação e exportação", "Relatório e volume mínimo" e "Charadas de reserva"."""

import json
from pathlib import Path

from desenha_ml.categorias import CATEGORIAS
from desenha_ml.contratos_regras import Json
from desenha_ml.conversa import INSTRUCAO_DE_SISTEMA
from desenha_ml.exportacao_dataset import (
    MINIMO_POR_TAREFA,
    MINIMO_TOTAL,
    avaliar_volume,
    charadas_de_reserva,
    exportar_dataset,
    para_chatml,
    para_sharegpt,
    separar_por_tarefa,
)
from desenha_ml.teacher import RegistroBruto


def _aprovada(tarefa: str, i: int, **meta: str) -> RegistroBruto:
    metadados: dict[str, Json] = dict(meta)
    saida = f"<pensamento>p{i}</pensamento>\n<resposta>Charada: charada número {i}</resposta>"
    return {
        "lote_id": "l",
        "tarefa": tarefa,
        "entrada": f"TAREFA: {tarefa}\n{i}",
        "meta": metadados,
        "saida": saida,
    }


def _amostras(por_tarefa: int) -> list[RegistroBruto]:
    return [
        _aprovada(t, i, palavra="vaca")
        for t in ("CHARADA", "VEREDITO", "PERGUNTA")
        for i in range(por_tarefa)
    ]


def test_separacao_80_10_10_por_tarefa_sem_sobreposicao() -> None:
    separacao = separar_por_tarefa(_amostras(100), semente=1)
    for tarefa in ("CHARADA", "VEREDITO", "PERGUNTA"):
        contagem = [sum(1 for a in conjunto if a["tarefa"] == tarefa) for conjunto in separacao]
        assert contagem == [80, 10, 10]
    entradas = [{a["entrada"] for a in conjunto} for conjunto in separacao]
    assert not (entradas[0] & entradas[2]) and not (entradas[0] & entradas[1])


def test_minimo_de_3_em_validacao_e_teste() -> None:
    _, validacao, teste = separar_por_tarefa(_amostras(12), semente=1)
    for tarefa in ("CHARADA", "VEREDITO", "PERGUNTA"):
        assert sum(1 for a in validacao if a["tarefa"] == tarefa) == 3
        assert sum(1 for a in teste if a["tarefa"] == tarefa) == 3


def test_separacao_deterministica() -> None:
    assert separar_por_tarefa(_amostras(20), semente=7) == separar_por_tarefa(_amostras(20), semente=7)


def test_formatos_sharegpt_e_chatml() -> None:
    amostra = _aprovada("CHARADA", 1, palavra="vaca")
    sharegpt, chatml = para_sharegpt(amostra), para_chatml(amostra)
    assert [m["from"] for m in sharegpt["conversations"]] == ["system", "human", "gpt"]
    assert [m["role"] for m in chatml["messages"]] == ["system", "user", "assistant"]
    assert chatml["messages"][0]["content"] == INSTRUCAO_DE_SISTEMA
    assert sharegpt["tarefa"] == "CHARADA" and chatml["meta"] == {"palavra": "vaca"}


def test_volume_minimo() -> None:
    assert MINIMO_TOTAL == 300 and MINIMO_POR_TAREFA == 60
    assert avaliar_volume({"CHARADA": 120, "VEREDITO": 140, "PERGUNTA": 60}) == (True, [])
    suficiente, motivos = avaliar_volume({"CHARADA": 150, "VEREDITO": 150, "PERGUNTA": 45})
    assert not suficiente
    assert motivos == ["PERGUNTA: 45 amostras < 60"]


def test_volume_total_insuficiente() -> None:
    suficiente, motivos = avaliar_volume({"CHARADA": 90, "VEREDITO": 90, "PERGUNTA": 90})
    assert not suficiente and motivos == ["total: 270 amostras < 300"]


def test_charadas_de_reserva_e_categorias_ausentes() -> None:
    aprovadas = [_aprovada("CHARADA", i, palavra=CATEGORIAS[i % 2].pt) for i in range(4)]
    reserva, ausentes = charadas_de_reserva(aprovadas)
    assert reserva["vaca"] == ["charada número 0", "charada número 2"]
    assert len(ausentes) == 28 and "trator" in ausentes


def test_exportar_grava_os_arquivos(tmp_path: Path) -> None:
    relatorio = exportar_dataset(_amostras(110), tmp_path, semente=1, relatorio_base={"pedidos": 999})
    for nome in ("zedorabisco_treino.jsonl", "zedorabisco_val_chatml.jsonl", "charadas_reserva.json"):
        assert (tmp_path / nome).exists(), nome
    linhas = (tmp_path / "zedorabisco_teste_chatml.jsonl").read_text(encoding="utf8").splitlines()
    assert len(linhas) == 3 * 11
    assert relatorio["suficiente"] is True and relatorio["pedidos"] == 999
    assert json.loads((tmp_path / "relatorio_dataset.json").read_text(encoding="utf8"))["aprovadas"] == 330
