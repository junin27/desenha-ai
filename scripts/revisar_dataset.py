"""Revisa só o conjunto de treino do dataset_slm.zip, sem chamar o Teacher (spec dataset-do-ze).

Uso (a partir de `projeto_final/`):
    ml/.venv/Scripts/python scripts/revisar_dataset.py notebooks/resultados/dataset_slm/dataset_slm.zip \
        notebooks/resultados/dataset_slm_v2/dataset_slm.zip
Validação, teste e reserva saem idênticos byte a byte; o relatório vai para relatorio_revisao.json.
"""

import json
import sys
import zipfile
from collections import Counter
from pathlib import Path
from typing import Any

from desenha_ml.revisao_do_treino import revisar_saida

TREINO_CHATML = "zedorabisco_treino_chatml.jsonl"
TREINO_SHAREGPT = "zedorabisco_treino.jsonl"
RELATORIO = "relatorio_revisao.json"


def _revisar_linhas(
    chatml: list[dict[str, Any]], sharegpt: list[dict[str, Any]]
) -> tuple[list[str], list[str], Counter[str]]:
    """As duas listas estão na mesma ordem (mesma exportação); a mesma revisão vale para as duas."""
    novas_chatml, novas_sharegpt, motivos = [], [], Counter[str]()
    for linha_chatml, linha_sharegpt in zip(chatml, sharegpt, strict=True):
        mensagens = linha_chatml["messages"]
        revisada, motivos_da_linha = revisar_saida(
            linha_chatml["tarefa"],
            mensagens[1]["content"],
            linha_chatml["meta"],
            mensagens[2]["content"],
        )
        motivos.update(motivos_da_linha)
        if revisada is None:
            continue
        mensagens[2]["content"] = revisada
        linha_sharegpt["conversations"][2]["value"] = revisada
        novas_chatml.append(json.dumps(linha_chatml, ensure_ascii=False))
        novas_sharegpt.append(json.dumps(linha_sharegpt, ensure_ascii=False))
    return novas_chatml, novas_sharegpt, motivos


def _ler_jsonl(arquivo: zipfile.ZipFile, nome: str) -> list[dict[str, Any]]:
    return [
        json.loads(linha)
        for linha in arquivo.read(nome).decode("utf8").splitlines()
        if linha.strip()
    ]


def revisar_zip(entrada: Path, saida: Path) -> dict[str, Any]:
    saida.parent.mkdir(parents=True, exist_ok=True)
    with (
        zipfile.ZipFile(entrada) as origem,
        zipfile.ZipFile(saida, "w", zipfile.ZIP_DEFLATED) as destino,
    ):
        chatml = _ler_jsonl(origem, TREINO_CHATML)
        novas_chatml, novas_sharegpt, motivos = _revisar_linhas(
            chatml, _ler_jsonl(origem, TREINO_SHAREGPT)
        )
        for item in origem.infolist():
            if item.filename not in (TREINO_CHATML, TREINO_SHAREGPT):
                destino.writestr(
                    item, origem.read(item.filename)
                )  # cópia byte a byte (teste congelado)
        destino.writestr(TREINO_CHATML, "\n".join(novas_chatml) + "\n")
        destino.writestr(TREINO_SHAREGPT, "\n".join(novas_sharegpt) + "\n")
        relatorio = {
            "treino": {"antes": len(chatml), "depois": len(novas_chatml)},
            "motivos": dict(motivos),
        }
        destino.writestr(RELATORIO, json.dumps(relatorio, ensure_ascii=False, indent=1))
    return relatorio


def main() -> int:
    if len(sys.argv) != 3:
        print(
            "uso: revisar_dataset.py <dataset_slm.zip de entrada> <dataset_slm.zip de saída>"
        )
        return 2
    relatorio = revisar_zip(Path(sys.argv[1]), Path(sys.argv[2]))
    print(json.dumps(relatorio, ensure_ascii=False, indent=1))
    return 0


if __name__ == "__main__":
    sys.exit(main())
