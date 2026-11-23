"""Download por streaming do Quick, Draw! com o abridor de URL injetado (sem rede nos testes)."""

import io
import json
from typing import IO

import pytest

from desenha_ml.fonte_quickdraw import URL_BASE, baixar_desenhos, url_da_categoria


def test_url_escapa_espacos() -> None:
    assert url_da_categoria("pickup truck") == URL_BASE + "pickup%20truck.ndjson"


class AbridorFalso:
    """Simula o GCS: devolve um ndjson em memória e registra as URLs pedidas."""

    def __init__(self, linhas: list[dict[str, object]]) -> None:
        self.conteudo = "\n".join(json.dumps(linha) for linha in linhas).encode("utf8")
        self.urls: list[str] = []

    def __call__(self, url: str, timeout: float) -> IO[bytes]:
        self.urls.append(url)
        return io.BytesIO(self.conteudo)


def _linha(reconhecido: bool, x: int) -> dict[str, object]:
    return {"word": "cow", "recognized": reconhecido, "drawing": [[[0, x], [0, x]]]}


def test_para_ao_juntar_a_quantidade_e_pula_nao_reconhecidos() -> None:
    abridor = AbridorFalso([_linha(True, 1), _linha(False, 2), _linha(True, 3), _linha(True, 4)])
    desenhos = baixar_desenhos("cow", quantidade=2, abrir=abridor)
    assert [d.tracos[0][1][0] for d in desenhos] == [1.0, 3.0]
    assert abridor.urls == [URL_BASE + "cow.ndjson"]


def test_falha_se_o_arquivo_acabar_antes() -> None:
    with pytest.raises(ValueError, match=r"cow.*1.*esperado 5"):
        baixar_desenhos("cow", quantidade=5, abrir=AbridorFalso([_linha(True, 1)]))
