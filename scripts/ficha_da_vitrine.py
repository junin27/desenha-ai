"""Grava a ficha da vitrine: quantos testes Python e TypeScript passaram (change vitrine-viva, D6).

Chamado pelo `scripts/verificar.sh` com as saídas do pytest e do vitest. A vitrine mostra esses números no
capítulo "Engenharia"; sem a ficha, o número some da tela (nada é escrito à mão).

    python scripts/ficha_da_vitrine.py saida_pytest.txt saida_vitest.txt destino.json [outro_destino.json ...]
"""

import json
import re
import sys
from pathlib import Path
from typing import TypedDict

PASSARAM_NO_PYTEST = re.compile(r"(\d+) passed")
PASSARAM_NO_VITEST = re.compile(r"Tests\s+(\d+) passed")


class ContagemDeTestes(TypedDict):
    python: int
    typescript: int


class FichaDaVitrine(TypedDict):
    testes: ContagemDeTestes


def montar_ficha(saida_pytest: str, saida_vitest: str) -> FichaDaVitrine | None:
    """Usa a última contagem de cada saída; sem contagem reconhecível, não há ficha."""
    python = PASSARAM_NO_PYTEST.findall(saida_pytest)
    typescript = PASSARAM_NO_VITEST.findall(saida_vitest)
    if not python or not typescript:
        return None
    return {"testes": {"python": int(python[-1]), "typescript": int(typescript[-1])}}


def main() -> None:
    saida_pytest, saida_vitest, *destinos = sys.argv[1:]
    ficha = montar_ficha(
        Path(saida_pytest).read_text(encoding="utf8", errors="replace"),
        Path(saida_vitest).read_text(encoding="utf8", errors="replace"),
    )
    if ficha is None:
        print(
            "AVISO: contagem de testes não encontrada; a vitrine ficará sem esse número.",
            file=sys.stderr,
        )
        return
    for destino in destinos:
        if Path(destino).parent.is_dir():
            Path(destino).write_text(
                json.dumps(ficha) + "\n", encoding="utf8", newline="\n"
            )
    print(f"ficha da vitrine: {ficha['testes']}")


if __name__ == "__main__":
    main()
