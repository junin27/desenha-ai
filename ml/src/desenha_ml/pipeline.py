"""Pipeline completo do treino das redes: o mesmo código no ensaio local (CPU) e no Colab (GPU).

Separa os dados, monta os exemplos, treina a CNN e a LSTM, escolhe o peso do ensemble na validação, avalia
no teste, exporta e confere os ONNX e grava os artefatos (spec treino-das-redes). Requer o extra `[treino]`.
"""

import functools
import json
import time
from collections.abc import Callable, Mapping, Sequence
from dataclasses import dataclass, field
from pathlib import Path

import numpy as np
import torch
from numpy.typing import NDArray

from desenha_ml import artefatos as fmt
from desenha_ml.avaliacao import (
    avaliar_criterio_minimo,
    escolher_peso_do_ensemble,
    matriz_de_confusao,
    previsoes,
)
from desenha_ml.categorias import CATEGORIAS
from desenha_ml.dados import (
    ConjuntosDeDados,
    LoteDeExemplos,
    Mapeador,
    TamanhosDosConjuntos,
    montar_lote_de_avaliacao,
    montar_lote_de_treino,
    separar_conjuntos,
)
from desenha_ml.desenho import Desenho
from desenha_ml.etapas_de_avaliacao import (
    ContextoDeAvaliacao,
    calcular_curva,
    gerar_paridade,
    gerar_predicoes,
    maiores_confusoes,
    medir_latencias,
)
from desenha_ml.exportacao_onnx import (
    conferir_onnx_cnn,
    conferir_onnx_lstm,
    exportar_cnn_onnx,
    exportar_lstm_onnx,
)
from desenha_ml.redes import RabiscoNet, TracoLSTM
from desenha_ml.resultado import Erro, Ok, Resultado
from desenha_ml.treino import ConfiguracaoDeTreino, DadosDeTreino, EpocaDoTreino, treinar

DIFERENCA_MAXIMA_ONNX = 1e-4
ARQUIVOS_GERADOS = (
    "cnn.onnx",
    "lstm.onnx",
    "classes.json",
    "metricas_redes.json",
    "predicoes_validacao.json",
    "teste_paridade_redes.json",
)


@dataclass(frozen=True)
class ParametrosDoPipeline:
    tamanhos: TamanhosDosConjuntos = field(default_factory=TamanhosDosConjuntos)
    treino_cnn: ConfiguracaoDeTreino = field(
        default_factory=lambda: ConfiguracaoDeTreino(epocas=15, taxa=3e-3)
    )
    treino_lstm: ConfiguracaoDeTreino = field(
        default_factory=lambda: ConfiguracaoDeTreino(epocas=15, taxa=2e-3)
    )
    casos_de_predicao: int = fmt.CASOS_DE_PREDICAO
    exemplos_da_curva: int = 3_000
    exemplos_de_conferencia_onnx: int = 64
    semente: int = 42
    dispositivo: str = "cpu"


@dataclass
class ResultadoDoPipeline:
    cnn: RabiscoNet
    lstm: TracoLSTM
    historico_cnn: list[EpocaDoTreino]
    historico_lstm: list[EpocaDoTreino]
    relatorio: fmt.RelatorioDeMetricas
    matriz_de_confusao: NDArray[np.int64]
    tempos_segundos: dict[str, float] = field(default_factory=dict)


@dataclass(frozen=True)
class _Lotes:
    completo: LoteDeExemplos
    parcial: LoteDeExemplos
    validacao: LoteDeExemplos
    teste: LoteDeExemplos


def executar_pipeline(
    desenhos_por_categoria: Mapping[str, Sequence[Desenho]],
    parametros: ParametrosDoPipeline,
    pasta: Path,
    mapear: Mapeador = map,
    registrar: Callable[[str], None] = print,
) -> Resultado[ResultadoDoPipeline]:
    """Roda tudo e grava os 6 arquivos em `pasta`; devolve modelos, históricos e relatório."""
    separacao = separar_conjuntos(desenhos_por_categoria, parametros.tamanhos)
    if isinstance(separacao, Erro):
        return separacao
    tempos: dict[str, float] = {}
    inicio = time.perf_counter()
    lotes = _montar_lotes(separacao.valor, parametros.semente, mapear)
    tempos["pre_processamento"] = time.perf_counter() - inicio
    cnn, lstm, historico_cnn, historico_lstm = _treinar_as_duas(lotes, parametros, registrar, tempos)
    w_cnn = escolher_peso_do_ensemble(lotes.validacao.rotulos, *_prever(cnn, lstm, lotes.validacao))
    contexto = ContextoDeAvaliacao(cnn, lstm, w_cnn, mapear)
    relatorio, matriz = _avaliar_e_gravar(contexto, separacao.valor, lotes, parametros, pasta)
    registrar(f"Critério mínimo: {relatorio['criterio_minimo']}")
    return Ok(ResultadoDoPipeline(cnn, lstm, historico_cnn, historico_lstm, relatorio, matriz, tempos))


def _montar_lotes(conjuntos: ConjuntosDeDados, semente: int, mapear: Mapeador) -> _Lotes:
    completo, parcial = montar_lote_de_treino(conjuntos.treino, semente, mapear)
    validacao = montar_lote_de_avaliacao(conjuntos.validacao, mapear=mapear)
    return _Lotes(completo, parcial, validacao, montar_lote_de_avaliacao(conjuntos.teste, mapear=mapear))


def _prever(
    cnn: RabiscoNet, lstm: TracoLSTM, lote: LoteDeExemplos
) -> tuple[NDArray[np.float32], NDArray[np.float32]]:
    return ContextoDeAvaliacao(cnn, lstm, w_cnn=0.5).prever(lote)


def _treinar_as_duas(
    lotes: _Lotes,
    parametros: ParametrosDoPipeline,
    registrar: Callable[[str], None],
    tempos: dict[str, float],
) -> tuple[RabiscoNet, TracoLSTM, list[EpocaDoTreino], list[EpocaDoTreino]]:
    dispositivo = torch.device(parametros.dispositivo)
    dados = DadosDeTreino(lotes.completo, lotes.parcial, lotes.validacao)
    cnn, lstm = RabiscoNet().to(dispositivo), TracoLSTM().to(dispositivo)
    historicos: list[list[EpocaDoTreino]] = []
    for nome, modelo, configuracao in (
        ("CNN", cnn, parametros.treino_cnn),
        ("LSTM", lstm, parametros.treino_lstm),
    ):
        inicio = time.perf_counter()
        historicos.append(
            treinar(modelo, dados, configuracao, functools.partial(_registrar_epoca, registrar, nome))
        )
        tempos[f"treino_{nome.lower()}"] = time.perf_counter() - inicio
    return cnn, lstm, historicos[0], historicos[1]


def _registrar_epoca(registrar: Callable[[str], None], nome: str, epoca: EpocaDoTreino) -> None:
    registrar(
        f"[{nome}] época {epoca.epoca:2d}"
        f" | perda {epoca.perda_de_treino:.4f} acc {epoca.acuracia_de_treino:.4f}"
        f" | val_perda {epoca.perda_de_validacao:.4f} val_acc {epoca.acuracia_de_validacao:.4f}"
        f" | {epoca.segundos:.0f}s"
    )


def _avaliar_e_gravar(
    contexto: ContextoDeAvaliacao,
    conjuntos: ConjuntosDeDados,
    lotes: _Lotes,
    parametros: ParametrosDoPipeline,
    pasta: Path,
) -> tuple[fmt.RelatorioDeMetricas, NDArray[np.int64]]:
    p_teste = contexto.prever(lotes.teste)
    rotulos = lotes.teste.rotulos
    teste = {
        "CNN": fmt.metricas_de_teste(rotulos, p_teste[0]),
        "LSTM": fmt.metricas_de_teste(rotulos, p_teste[1]),
        "Ensemble": fmt.metricas_de_teste(rotulos, contexto.ensemble(p_teste)),
    }
    matriz = matriz_de_confusao(rotulos, previsoes(contexto.ensemble(p_teste)), len(CATEGORIAS))
    curva = calcular_curva(contexto, conjuntos.teste, parametros.exemplos_da_curva, parametros.semente)
    predicoes = gerar_predicoes(
        contexto, conjuntos.validacao, parametros.casos_de_predicao, parametros.semente
    )
    pasta.mkdir(parents=True, exist_ok=True)
    conferencia = _exportar_e_conferir(contexto, lotes.teste, parametros.exemplos_de_conferencia_onnx, pasta)
    relatorio = fmt.metricas_redes_json(
        teste=teste,
        criterio=avaliar_criterio_minimo({nome: m.acuracia for nome, m in teste.items()}),
        w_cnn=contexto.w_cnn,
        curva=curva,
        parametros={"cnn": _parametros(contexto.cnn), "lstm": _parametros(contexto.lstm)},
        latencia_cpu_ms=medir_latencias(contexto, lotes.teste),
        tamanhos={
            "treino": len(conjuntos.treino),
            "validacao": len(conjuntos.validacao),
            "teste": len(conjuntos.teste),
        },
        confusoes=maiores_confusoes(matriz),
        conferencia_onnx=conferencia,
    )
    paridade = gerar_paridade(conjuntos.teste, lotes.teste, pasta)
    arquivos = {
        "classes.json": fmt.classes_json(contexto.w_cnn),
        "metricas_redes.json": relatorio,
        "predicoes_validacao.json": predicoes,
        "teste_paridade_redes.json": paridade,
    }
    _gravar_json(pasta, arquivos)
    return relatorio, matriz


def _exportar_e_conferir(
    contexto: ContextoDeAvaliacao, teste: LoteDeExemplos, quantidade: int, pasta: Path
) -> dict[str, float]:
    """Exporta (o que move os modelos para a CPU) e confere contra o PyTorch; divergência é erro."""
    exportar_cnn_onnx(contexto.cnn, pasta / "cnn.onnx")
    exportar_lstm_onnx(contexto.lstm, pasta / "lstm.onnx")
    sequencias = [teste.sequencias[i, : teste.comprimentos[i]] for i in range(quantidade)]
    conferencia = {
        "cnn": conferir_onnx_cnn(pasta / "cnn.onnx", contexto.cnn, teste.imagens[:quantidade]),
        "lstm": conferir_onnx_lstm(pasta / "lstm.onnx", contexto.lstm, sequencias),
    }
    if max(conferencia.values()) > DIFERENCA_MAXIMA_ONNX:
        raise RuntimeError(
            f"ONNX diverge do PyTorch: {conferencia}; esperado no máximo {DIFERENCA_MAXIMA_ONNX}"
        )
    return conferencia


def _parametros(modelo: torch.nn.Module) -> int:
    return sum(p.numel() for p in modelo.parameters())


def _gravar_json(pasta: Path, arquivos: Mapping[str, object]) -> None:
    for nome, conteudo in arquivos.items():
        (pasta / nome).write_text(json.dumps(conteudo, ensure_ascii=False, indent=1) + "\n", encoding="utf8")
