"""Requisito "Contrato entre Python e TypeScript" — spec pre-processamento-de-desenho."""

import json
from pathlib import Path

from desenha_ml.contratos import CASOS_OBRIGATORIOS, gerar_contrato_de_pre_processamento
from desenha_ml.desenho import Desenho

CONTRATO_VERSIONADO = Path(__file__).parents[2] / "contratos" / "pre_processamento.json"


def test_contrato_cobre_os_casos_exigidos_pela_spec(desenhos_da_amostra: list[tuple[str, Desenho]]) -> None:
    contrato = gerar_contrato_de_pre_processamento(desenhos_da_amostra)
    nomes = {caso["nome"] for caso in contrato["casos"]}
    assert set(CASOS_OBRIGATORIOS) <= nomes
    assert any(nome.startswith("quickdraw_") for nome in nomes)


def test_cada_caso_traz_todas_as_saidas(desenhos_da_amostra: list[tuple[str, Desenho]]) -> None:
    for caso in gerar_contrato_de_pre_processamento(desenhos_da_amostra)["casos"]:
        assert {"tracos", "normalizado", "capturado", "prefixo", "imagem", "sequencia"} <= caso.keys()
        assert len(caso["imagem"]) == 28 * 28
        assert caso["prefixo"]["fracao"] == 0.5


def test_contrato_versionado_esta_atualizado(desenhos_da_amostra: list[tuple[str, Desenho]]) -> None:
    gerado = gerar_contrato_de_pre_processamento(desenhos_da_amostra)
    versionado = json.loads(CONTRATO_VERSIONADO.read_text(encoding="utf8"))
    assert versionado == gerado, (
        "contratos/pre_processamento.json está desatualizado; rode "
        "`ml/.venv/Scripts/python -m desenha_ml.contratos contratos/`"
    )
