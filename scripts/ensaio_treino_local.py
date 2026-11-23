"""Ensaio local do treino das redes (CPU, amostra pequena) antes de gastar GPU no Colab.

Roda exatamente o mesmo pipeline do notebook 1 (`desenha_ml.pipeline`), só que menor. Não aplica o
critério mínimo de qualidade: o objetivo é provar que o código roda de ponta a ponta e gera os artefatos.

Uso (a partir de `projeto_final/`):
    ml/.venv/Scripts/python scripts/ensaio_treino_local.py --por-categoria 300 --epocas 2 --saida saida/ensaio
"""

import argparse
import json
import multiprocessing
import time
from concurrent.futures import ThreadPoolExecutor
from pathlib import Path

from desenha_ml.categorias import CATEGORIAS
from desenha_ml.dados import TamanhosDosConjuntos
from desenha_ml.fonte_quickdraw import baixar_desenhos
from desenha_ml.pipeline import ParametrosDoPipeline, executar_pipeline
from desenha_ml.resultado import Erro
from desenha_ml.treino import ConfiguracaoDeTreino

DOWNLOADS_SIMULTANEOS = 8


def _argumentos() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description=__doc__.splitlines()[0])
    parser.add_argument(
        "--por-categoria", type=int, default=300, help="desenhos baixados por categoria"
    )
    parser.add_argument("--epocas", type=int, default=2)
    parser.add_argument("--saida", type=Path, default=Path("saida/ensaio"))
    return parser.parse_args()


def _parametros(por_categoria: int, epocas: int) -> ParametrosDoPipeline:
    validacao = teste = por_categoria // 6
    configuracao = ConfiguracaoDeTreino(epocas=epocas, taxa=3e-3, lote=256)
    return ParametrosDoPipeline(
        tamanhos=TamanhosDosConjuntos(
            treino=por_categoria - validacao - teste, validacao=validacao, teste=teste
        ),
        treino_cnn=configuracao,
        treino_lstm=configuracao,
        exemplos_da_curva=600,
    )


def main() -> None:
    argumentos = _argumentos()
    inicio = time.perf_counter()
    with ThreadPoolExecutor(DOWNLOADS_SIMULTANEOS) as executor:
        baixados = executor.map(
            lambda c: (c.en, baixar_desenhos(c.en, argumentos.por_categoria)),
            CATEGORIAS,
        )
        desenhos = dict(baixados)
    print(
        f"download: {time.perf_counter() - inicio:.0f}s ({argumentos.por_categoria} por categoria)"
    )
    with multiprocessing.Pool() as processos:
        resultado = executar_pipeline(
            desenhos,
            _parametros(argumentos.por_categoria, argumentos.epocas),
            argumentos.saida,
            processos.map,
        )
    if isinstance(resultado, Erro):
        raise SystemExit(f"ensaio falhou: {resultado.codigo} - {resultado.detalhe}")
    resumo = {
        "segundos_totais": round(time.perf_counter() - inicio, 1),
        "tempos": {k: round(v, 1) for k, v in resultado.valor.tempos_segundos.items()},
        "teste": resultado.valor.relatorio["teste"],
        "conferencia_onnx": resultado.valor.relatorio["conferencia_onnx"],
        "latencia_cpu_ms": resultado.valor.relatorio["latencia_cpu_ms"],
    }
    print(json.dumps(resumo, ensure_ascii=False, indent=1))


if __name__ == "__main__":
    main()
