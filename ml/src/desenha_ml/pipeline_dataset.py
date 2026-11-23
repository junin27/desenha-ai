"""Pipeline do dataset do Zé: mesmo código no notebook 2 (Teacher real) e no ensaio (Teacher de ensaio).

Ficha técnica → Evol-Instruct das perguntas → lotes de CHARADA, VEREDITO e PERGUNTA → Teacher com checkpoint →
curadoria → exportação com relatório (spec dataset-do-ze).
"""

import json
from collections import Counter
from collections.abc import Callable, Mapping, Sequence
from dataclasses import dataclass
from pathlib import Path

from desenha_ml.contratos_regras import Json
from desenha_ml.curadoria import ResultadoDaCuradoria, curar
from desenha_ml.exportacao_dataset import exportar_dataset
from desenha_ml.ficha_tecnica import montar_ficha
from desenha_ml.geracao_dataset import (
    CasoDeVeredito,
    Pergunta,
    casos_de_veredito,
    evoluir_perguntas,
    lotes_de_pergunta,
    lotes_de_veredito,
    pedidos_de_charada,
)
from desenha_ml.teacher import Lote, RegistroBruto, Teacher, executar_lotes

GERACOES_DE_EVOLUCAO = 2


@dataclass(frozen=True)
class ResultadoDoDataset:
    relatorio: dict[str, Json]
    curadoria: ResultadoDaCuradoria
    brutos: list[RegistroBruto]


def gerar_dataset(  # noqa: PLR0913 - entradas do pipeline, todas nomeadas
    *,
    teacher: Teacher,
    predicoes: Sequence[Mapping[str, object]],
    metricas_redes: Mapping[str, object] | None,
    pasta: Path,
    semente: int = 42,
    registrar: Callable[[str], None] = print,
) -> ResultadoDoDataset:
    ficha = montar_ficha(metricas_redes)
    perguntas = _perguntas(teacher, ficha, semente, pasta)
    casos = casos_de_veredito(predicoes, semente)
    lotes = [*pedidos_de_charada(semente), *lotes_de_veredito(casos), *lotes_de_pergunta(perguntas, ficha)]
    registrar(f"{len(lotes)} lotes ({sum(len(lote.entradas) for lote in lotes)} pedidos) para o Teacher")
    brutos = executar_lotes(lotes, teacher, pasta / "artefatos" / "dataset_bruto.jsonl", registrar)
    curadoria = curar(brutos, ficha)
    base = _relatorio_base(
        lotes=lotes, brutos=brutos, curadoria=curadoria, perguntas=perguntas, casos=casos, teacher=teacher
    )
    relatorio = exportar_dataset(curadoria.aprovadas, pasta, semente, base)
    registrar(f"aprovadas: {relatorio['aprovadas']} | suficiente: {relatorio['suficiente']}")
    return ResultadoDoDataset(relatorio, curadoria, brutos)


def _perguntas(teacher: Teacher, ficha: str, semente: int, pasta: Path) -> list[Pergunta]:
    """Evol-Instruct com cache em disco: retomar a geração não refaz as perguntas (nem gasta a cota)."""
    cache = pasta / "artefatos" / "perguntas_evoluidas.json"
    if cache.exists():
        return [Pergunta(**p) for p in json.loads(cache.read_text(encoding="utf8"))]
    perguntas = evoluir_perguntas(teacher, GERACOES_DE_EVOLUCAO, semente, ficha)
    cache.parent.mkdir(parents=True, exist_ok=True)
    conteudo = [{"texto": p.texto, "evolucao": p.evolucao} for p in perguntas]
    cache.write_text(json.dumps(conteudo, ensure_ascii=False, indent=1), encoding="utf8")
    return perguntas


def _relatorio_base(  # noqa: PLR0913 - um argumento por fonte do relatório
    *,
    lotes: Sequence[Lote],
    brutos: Sequence[RegistroBruto],
    curadoria: ResultadoDaCuradoria,
    perguntas: Sequence[Pergunta],
    casos: Sequence[CasoDeVeredito],
    teacher: Teacher,
) -> dict[str, Json]:
    return {
        "pedidos": sum(len(lote.entradas) for lote in lotes),
        "respostas": sum(1 for b in brutos if b["saida"] is not None),
        "rejeicoes": dict(curadoria.rejeicoes),
        "reparos": dict(curadoria.reparos),
        "origem_das_perguntas": dict(Counter(p.evolucao for p in perguntas)),
        "origem_dos_vereditos": dict(Counter(c.fonte for c in casos)),
        "uso_da_api": {"chamadas": getattr(teacher, "chamadas", 0), "falhas": getattr(teacher, "falhas", 0)},
    }
