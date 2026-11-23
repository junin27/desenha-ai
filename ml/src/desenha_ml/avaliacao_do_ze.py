"""Avaliação do Zé no conjunto de teste e critério de aprovação do fine-tuning (spec modelo-do-ze).

Usa as mesmas regras da curadoria (D2 do design): uma saída cumpre a tarefa quando passaria pelo filtro da
tarefa. Sem reparos (a saída do modelo é avaliada como veio) e sem os filtros de estilo do pensamento.

Exemplo:
    >>> avaliar_saida({"lote_id": "", "tarefa": "PERGUNTA", "entrada": "", "meta": {}, "saida": None},
    ...               "sem tags", ficha="").formato_ok
    False
"""

from collections import defaultdict
from collections.abc import Sequence
from dataclasses import dataclass

from desenha_ml.conversa import ler_fala
from desenha_ml.curadoria import filtro_da_tarefa
from desenha_ml.ficha_tecnica import numeros_da_ficha
from desenha_ml.resultado import Erro
from desenha_ml.teacher import RegistroBruto

METAS_DO_DESTILADO = {"formato": 0.95, "CHARADA": 0.85, "VEREDITO": 0.90, "PERGUNTA": 0.85}
MOTIVO_DO_ENSAIO = "modo ensaio: critério não aplicado"


@dataclass(frozen=True)
class SaidaAvaliada:
    tarefa: str
    formato_ok: bool
    tarefa_ok: bool
    codigo: str | None
    tokens: int = 0


@dataclass(frozen=True)
class ResumoDoModelo:
    formato: float
    por_tarefa: dict[str, float]
    tokens_medios: float


@dataclass(frozen=True)
class CriterioDoZe:
    aprovado: bool | None  # None no modo ensaio
    motivos: list[str]


def avaliar_saida(exemplo: RegistroBruto, saida: str, ficha: str, tokens: int = 0) -> SaidaAvaliada:
    fala = ler_fala(saida)
    if isinstance(fala, Erro):
        return SaidaAvaliada(exemplo["tarefa"], False, False, "formato_invalido", tokens)
    codigo = filtro_da_tarefa(exemplo, fala.valor, numeros_da_ficha(ficha))
    return SaidaAvaliada(exemplo["tarefa"], True, codigo is None, codigo, tokens)


def resumir(saidas: Sequence[SaidaAvaliada]) -> ResumoDoModelo:
    """Taxa de formato válido no total, taxa de tarefa cumprida por tarefa e média de tokens gerados."""
    por_tarefa: dict[str, list[bool]] = defaultdict(list)
    for saida in saidas:
        por_tarefa[saida.tarefa].append(saida.tarefa_ok)
    total = max(len(saidas), 1)
    return ResumoDoModelo(
        formato=sum(s.formato_ok for s in saidas) / total,
        por_tarefa={tarefa: sum(oks) / len(oks) for tarefa, oks in por_tarefa.items()},
        tokens_medios=sum(s.tokens for s in saidas) / total,
    )


def avaliar_criterio_do_ze(destilado: ResumoDoModelo, base: ResumoDoModelo, ensaio: bool) -> CriterioDoZe:
    if ensaio:
        return CriterioDoZe(None, [MOTIVO_DO_ENSAIO])
    motivos = []
    if destilado.formato < METAS_DO_DESTILADO["formato"]:
        motivos.append(
            f"formato: {_porcento(destilado.formato)} < {_porcento(METAS_DO_DESTILADO['formato'], 0)}"
        )
    for tarefa in ("CHARADA", "VEREDITO", "PERGUNTA"):
        taxa, meta = destilado.por_tarefa.get(tarefa, 0.0), METAS_DO_DESTILADO[tarefa]
        if taxa < meta:
            motivos.append(f"{tarefa}: {_porcento(taxa)} < {_porcento(meta, 0)}")
    if destilado.formato <= base.formato:
        motivos.append(
            f"formato: destilado {_porcento(destilado.formato)} não supera o base {_porcento(base.formato)}"
        )
    return CriterioDoZe(not motivos, motivos)


def _porcento(valor: float, casas: int = 1) -> str:
    return f"{100 * valor:.{casas}f}%".replace(".", ",")
