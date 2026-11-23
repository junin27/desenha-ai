"""Fixtures compartilhadas: desenhos reais da amostra do Quick, Draw! (ver tests/amostras/README.md)."""

import json
from pathlib import Path

import pytest

from desenha_ml.desenho import Desenho, desenho_de_quickdraw
from desenha_ml.resultado import Ok

CAMINHO_DA_AMOSTRA = Path(__file__).parent / "amostras" / "quickdraw_amostra.ndjson"


def carregar_amostra() -> list[tuple[str, Desenho]]:
    desenhos = []
    for linha in CAMINHO_DA_AMOSTRA.read_text(encoding="utf8").splitlines():
        registro = json.loads(linha)
        resultado = desenho_de_quickdraw(registro["drawing"])
        assert isinstance(resultado, Ok), f"desenho inválido na amostra: {registro['word']}"
        desenhos.append((registro["word"], resultado.valor))
    return desenhos


@pytest.fixture(scope="session")
def desenhos_da_amostra() -> list[tuple[str, Desenho]]:
    return carregar_amostra()
