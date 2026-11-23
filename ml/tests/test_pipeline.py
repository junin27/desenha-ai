"""Pipeline completo do treino (o mesmo do ensaio local e do notebook), com dados sintéticos e 1 época."""

import json
from pathlib import Path

import numpy as np
import pytest

pytest.importorskip("torch")
pytest.importorskip("onnx")

from desenha_ml.categorias import CATEGORIAS
from desenha_ml.dados import TamanhosDosConjuntos
from desenha_ml.desenho import Desenho
from desenha_ml.pipeline import (
    ARQUIVOS_GERADOS,
    ParametrosDoPipeline,
    ResultadoDoPipeline,
    executar_pipeline,
)
from desenha_ml.resultado import Erro, Ok, Resultado
from desenha_ml.treino import ConfiguracaoDeTreino

RAPIDO = ConfiguracaoDeTreino(epocas=1, taxa=3e-3, lote=64)
PARAMETROS = ParametrosDoPipeline(
    tamanhos=TamanhosDosConjuntos(treino=6, validacao=8, teste=4),
    treino_cnn=RAPIDO,
    treino_lstm=RAPIDO,
    casos_de_predicao=40,
    exemplos_da_curva=30,
    exemplos_de_conferencia_onnx=10,
)


def _desenhos_sinteticos(quantidade: int) -> dict[str, list[Desenho]]:
    gerador = np.random.default_rng(0)

    def rabisco() -> Desenho:
        return Desenho.de_arrays(
            [np.cumsum(gerador.normal(0, 10, (int(gerador.integers(3, 15)), 2)), axis=0)]
        )

    return {c.en: [rabisco() for _ in range(quantidade)] for c in CATEGORIAS}


@pytest.fixture(scope="module")
def execucao(tmp_path_factory: pytest.TempPathFactory) -> tuple[Path, Resultado[ResultadoDoPipeline]]:
    pasta = tmp_path_factory.mktemp("saida")
    resultado = executar_pipeline(_desenhos_sinteticos(18), PARAMETROS, pasta, registrar=lambda _: None)
    return pasta, resultado


def test_gera_todos_os_arquivos(execucao: tuple[Path, Resultado[ResultadoDoPipeline]]) -> None:
    pasta, resultado = execucao
    assert isinstance(resultado, Ok)
    for nome in ARQUIVOS_GERADOS:
        assert (pasta / nome).exists(), nome


def test_relatorio_tem_criterio_e_conferencia_do_onnx(
    execucao: tuple[Path, Resultado[ResultadoDoPipeline]],
) -> None:
    pasta, _ = execucao
    relatorio = json.loads((pasta / "metricas_redes.json").read_text(encoding="utf8"))
    assert set(relatorio["teste"]) == {"CNN", "LSTM", "Ensemble"}
    assert relatorio["criterio_minimo"]["aprovado"] in (True, False)
    assert relatorio["conferencia_onnx"]["cnn"] <= 1e-4
    assert relatorio["conferencia_onnx"]["lstm"] <= 1e-4
    assert set(relatorio["curva_antecipada"]["Ensemble"]) == {
        "0.2",
        "0.3",
        "0.4",
        "0.5",
        "0.6",
        "0.7",
        "0.8",
        "0.9",
        "1.0",
    }


def test_predicoes_e_paridade(execucao: tuple[Path, Resultado[ResultadoDoPipeline]]) -> None:
    pasta, _ = execucao
    predicoes = json.loads((pasta / "predicoes_validacao.json").read_text(encoding="utf8"))
    paridade = json.loads((pasta / "teste_paridade_redes.json").read_text(encoding="utf8"))
    assert len(predicoes) == 40
    assert {p["fracao_desenho"] for p in predicoes} == {0.35, 0.5, 0.7, 1.0}
    assert len(paridade) == 8


def test_dados_insuficientes_viram_erro(tmp_path: Path) -> None:
    resultado = executar_pipeline(_desenhos_sinteticos(5), PARAMETROS, tmp_path, registrar=lambda _: None)
    assert isinstance(resultado, Erro) and resultado.codigo == "dados_insuficientes"
