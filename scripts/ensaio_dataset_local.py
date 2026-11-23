"""Ensaio local do pipeline do dataset do Zé, com o Teacher de ensaio (offline, sem gastar cota da API).

Usa as predições reais das redes geradas pelo ensaio de treino (`saida/ensaio`). Para a geração de verdade,
troque o Teacher pelo Gemini com `--gemini` (exige GEMINI_API_KEY no ambiente e o extra [teacher]).

Uso (a partir de `projeto_final/`):
    ml/.venv/Scripts/python scripts/ensaio_dataset_local.py --redes saida/ensaio --saida saida/dataset_ensaio
"""

import argparse
import json
import os
import time
from pathlib import Path

from desenha_ml.pipeline_dataset import gerar_dataset
from desenha_ml.teacher import Teacher, TeacherComCuidados
from desenha_ml.teacher_apis import chamada_gemini
from desenha_ml.teacher_de_ensaio import TeacherDeEnsaio

MODELO_GEMINI_PADRAO = "gemini-3.5-flash-lite"


def _argumentos() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description=(__doc__ or "").splitlines()[0])
    parser.add_argument(
        "--redes",
        type=Path,
        default=Path("saida/ensaio"),
        help="pasta com os artefatos das redes",
    )
    parser.add_argument("--saida", type=Path, default=Path("saida/dataset_ensaio"))
    parser.add_argument(
        "--gemini", action="store_true", help="usa o Gemini de verdade (GEMINI_API_KEY)"
    )
    parser.add_argument("--modelo", default=MODELO_GEMINI_PADRAO)
    return parser.parse_args()


def _teacher(argumentos: argparse.Namespace) -> Teacher:
    if not argumentos.gemini:
        return TeacherDeEnsaio()
    return TeacherComCuidados(
        chamada_gemini(argumentos.modelo, os.environ.get("GEMINI_API_KEY", ""))
    )


def _ler_json(caminho: Path) -> object:
    return json.loads(caminho.read_text(encoding="utf8")) if caminho.exists() else None


def main() -> None:
    argumentos = _argumentos()
    predicoes = _ler_json(argumentos.redes / "predicoes_validacao.json")
    metricas = _ler_json(argumentos.redes / "metricas_redes.json")
    if not isinstance(predicoes, list):
        print(
            "predicoes_validacao.json não encontrado: os vereditos serão todos sintéticos."
        )
        predicoes = []
    inicio = time.perf_counter()
    resultado = gerar_dataset(
        teacher=_teacher(argumentos),
        predicoes=predicoes,
        metricas_redes=metricas if isinstance(metricas, dict) else None,
        pasta=argumentos.saida,
    )
    resumo = {chave: resultado.relatorio[chave] for chave in ("pedidos", "respostas", "aprovadas",
              "aprovadas_por_tarefa", "rejeicoes", "reparos", "origem_dos_vereditos", "suficiente",
              "motivos_de_insuficiencia", "categorias_sem_charada")}  # fmt: skip
    print(
        json.dumps(
            {"segundos": round(time.perf_counter() - inicio, 1), **resumo},
            ensure_ascii=False,
            indent=1,
        )
    )


if __name__ == "__main__":
    main()
