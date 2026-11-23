"""Fixtures compartilhadas: desenhos reais da amostra do Quick, Draw! (ver tests/amostras/README.md)."""

from pathlib import Path

import pytest

from desenha_ml.desenho import Desenho
from desenha_ml.leitura_quickdraw import ler_desenhos_ndjson

CAMINHO_DA_AMOSTRA = Path(__file__).parent / "amostras" / "quickdraw_amostra.ndjson"


@pytest.fixture(scope="session")
def desenhos_da_amostra() -> list[tuple[str, Desenho]]:
    with CAMINHO_DA_AMOSTRA.open(encoding="utf8") as arquivo:
        return ler_desenhos_ndjson(arquivo)
