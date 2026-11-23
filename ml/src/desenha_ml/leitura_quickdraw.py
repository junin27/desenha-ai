"""Leitura de desenhos no formato ndjson do Quick, Draw! (casca de I/O fina sobre o núcleo puro).

Exemplo:
    >>> import io
    >>> linhas = io.StringIO('{"word": "sun", "drawing": [[[0, 10], [0, 10]]]}\\n')
    >>> [(palavra, d.total_de_pontos) for palavra, d in ler_desenhos_ndjson(linhas)]
    [('sun', 2)]
"""

import json
from collections.abc import Iterable

from desenha_ml.desenho import Desenho, desenho_de_quickdraw
from desenha_ml.resultado import Erro


def ler_desenhos_ndjson(linhas: Iterable[str]) -> list[tuple[str, Desenho]]:
    """Lê linhas ndjson com `word` e `drawing`; desenhos vazios são descartados."""
    desenhos = []
    for linha in linhas:
        if not linha.strip():
            continue
        registro = json.loads(linha)
        resultado = desenho_de_quickdraw(registro["drawing"])
        if isinstance(resultado, Erro):
            continue
        desenhos.append((str(registro["word"]), resultado.valor))
    return desenhos
