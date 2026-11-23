"""Gera o .ipynb do Colab a partir da fonte em formato percent (`# %%` e `# %% [markdown]`).

As fontes em `notebooks/fontes/` são revisáveis no Git; o .ipynb é gerado e nunca editado à mão.

Uso:
    python scripts/gerar_notebooks.py notebooks/fontes/01_redes_neurais_cnn_lstm.py notebooks/01_redes_neurais_cnn_lstm.ipynb
"""

import json
import re
import sys
from pathlib import Path
from typing import TypedDict

MARCADOR_DE_CELULA = re.compile(r"^# %%(.*)$", flags=re.MULTILINE)
PREFIXO_DE_COMENTARIO = "# "


class Celula(TypedDict, total=False):
    cell_type: str
    metadata: dict[str, object]
    source: list[str]
    execution_count: None
    outputs: list[object]


def celulas_da_fonte(texto: str) -> list[Celula]:
    partes = MARCADOR_DE_CELULA.split(texto)
    return [
        _celula(partes[i], partes[i + 1].strip("\n")) for i in range(1, len(partes), 2)
    ]


def _celula(marcador: str, corpo: str) -> Celula:
    if "[markdown]" in marcador:
        linhas = [_sem_comentario(linha) for linha in corpo.split("\n")]
        return {
            "cell_type": "markdown",
            "metadata": {},
            "source": _linhas_do_notebook(linhas),
        }
    return {
        "cell_type": "code",
        "metadata": {},
        "execution_count": None,
        "outputs": [],
        "source": _linhas_do_notebook(corpo.split("\n")),
    }


def _sem_comentario(linha: str) -> str:
    return (
        linha.removeprefix(PREFIXO_DE_COMENTARIO)
        if linha.startswith(PREFIXO_DE_COMENTARIO)
        else linha.lstrip("#")
    )


def _linhas_do_notebook(linhas: list[str]) -> list[str]:
    """O formato .ipynb guarda cada linha com o \\n final, exceto a última."""
    return [linha + "\n" for linha in linhas[:-1]] + linhas[-1:]


def notebook(celulas: list[Celula]) -> dict[str, object]:
    metadados = {
        "accelerator": "GPU",
        "colab": {"provenance": [], "gpuType": "T4"},
        "kernelspec": {"display_name": "Python 3", "name": "python3"},
        "language_info": {"name": "python"},
    }
    return {"cells": celulas, "metadata": metadados, "nbformat": 4, "nbformat_minor": 0}


def main(fonte: Path, destino: Path) -> None:
    celulas = celulas_da_fonte(fonte.read_text(encoding="utf8"))
    destino.write_text(
        json.dumps(notebook(celulas), ensure_ascii=False, indent=1), encoding="utf8"
    )
    print(f"{destino}: {len(celulas)} células")


if __name__ == "__main__":
    main(Path(sys.argv[1]), Path(sys.argv[2]))
