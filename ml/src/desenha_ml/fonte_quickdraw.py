"""Download por streaming do Quick, Draw! simplified (casca de I/O; o abridor de URL é injetável).

Cada categoria é um ndjson de até centenas de MB no Google Cloud Storage público; lemos linha a linha e
paramos ao juntar a quantidade pedida de desenhos reconhecidos.

Exemplo (com rede):
    >>> len(baixar_desenhos("sun", quantidade=2))  # doctest: +SKIP
    2
"""

import urllib.parse
import urllib.request
from collections.abc import Callable
from typing import IO

from desenha_ml.desenho import Desenho
from desenha_ml.leitura_quickdraw import ler_desenhos_ndjson

URL_BASE = "https://storage.googleapis.com/quickdraw_dataset/full/simplified/"
TEMPO_LIMITE_SEGUNDOS = 60.0

AbridorDeUrl = Callable[..., IO[bytes]]


def url_da_categoria(categoria_en: str) -> str:
    return URL_BASE + urllib.parse.quote(categoria_en) + ".ndjson"


def baixar_desenhos(
    categoria_en: str, quantidade: int, abrir: AbridorDeUrl = urllib.request.urlopen
) -> list[Desenho]:
    """Os primeiros `quantidade` desenhos reconhecidos, na ordem do arquivo."""
    desenhos: list[Desenho] = []
    with abrir(url_da_categoria(categoria_en), timeout=TEMPO_LIMITE_SEGUNDOS) as resposta:
        for linha in resposta:
            lidos = ler_desenhos_ndjson([linha.decode("utf8")], somente_reconhecidos=True)
            desenhos.extend(desenho for _, desenho in lidos)
            if len(desenhos) >= quantidade:
                return desenhos[:quantidade]
    raise ValueError(
        f"categoria {categoria_en!r} tem só {len(desenhos)} desenhos reconhecidos; esperado {quantidade}"
    )
