"""Requisitos "Saídas das redes" e "Exportação ONNX conferida" — spec treino-das-redes.

Exigem o extra `[treino]` (torch, onnx); sem ele, os testes são pulados.
"""

from pathlib import Path

import numpy as np
import pytest

torch = pytest.importorskip("torch")
pytest.importorskip("onnx")

from desenha_ml.dados import montar_lote_de_avaliacao, montar_lote_de_treino  # noqa: E402
from desenha_ml.desenho import Desenho  # noqa: E402
from desenha_ml.exportacao_onnx import (  # noqa: E402
    conferir_onnx_cnn,
    conferir_onnx_lstm,
    exportar_cnn_onnx,
    exportar_lstm_onnx,
)
from desenha_ml.redes import NUMERO_DE_CLASSES, RabiscoNet, TracoLSTM  # noqa: E402
from desenha_ml.treino import (  # noqa: E402
    ConfiguracaoDeTreino,
    DadosDeTreino,
    prever_cnn,
    prever_lstm,
    treinar,
)

torch.manual_seed(0)


def test_saidas_com_30_probabilidades_que_somam_1(desenhos_da_amostra: list[tuple[str, Desenho]]) -> None:
    lote = montar_lote_de_avaliacao([(d, 0) for _, d in desenhos_da_amostra[:4]])
    p_cnn = prever_cnn(RabiscoNet(), lote.imagens)
    p_lstm = prever_lstm(TracoLSTM(), lote.sequencias, lote.comprimentos)
    for probabilidades in (p_cnn, p_lstm):
        assert probabilidades.shape == (4, NUMERO_DE_CLASSES)
        np.testing.assert_allclose(probabilidades.sum(axis=1), 1.0, atol=1e-5)


def test_lstm_ignora_o_padding(desenhos_da_amostra: list[tuple[str, Desenho]]) -> None:
    lote = montar_lote_de_avaliacao([(d, 0) for _, d in desenhos_da_amostra[:2]])
    modelo = TracoLSTM()
    juntos = prever_lstm(modelo, lote.sequencias, lote.comprimentos)
    sozinho = prever_lstm(modelo, lote.sequencias[:1, : lote.comprimentos[0]], lote.comprimentos[:1])
    np.testing.assert_allclose(juntos[0], sozinho[0], atol=1e-5)


@pytest.mark.parametrize("rede", ["cnn", "lstm"])
def test_perda_cai_no_mini_treino(rede: str, desenhos_da_amostra: list[tuple[str, Desenho]]) -> None:
    rotulos = {palavra: i for i, palavra in enumerate(dict.fromkeys(p for p, _ in desenhos_da_amostra))}
    exemplos = [(d, rotulos[p]) for p, d in desenhos_da_amostra]
    completo, parcial = montar_lote_de_treino(exemplos, semente=0)
    validacao = montar_lote_de_avaliacao(exemplos)
    modelo = RabiscoNet() if rede == "cnn" else TracoLSTM()
    dados = DadosDeTreino(completo, parcial, validacao)
    historico = treinar(modelo, dados, ConfiguracaoDeTreino(epocas=8, taxa=3e-3, lote=32))
    assert historico[-1].perda_de_treino < historico[0].perda_de_treino
    assert len(historico) == 8


def test_onnx_da_cnn_bate_com_o_pytorch(
    tmp_path: Path, desenhos_da_amostra: list[tuple[str, Desenho]]
) -> None:
    modelo = RabiscoNet().eval()
    caminho = tmp_path / "cnn.onnx"
    exportar_cnn_onnx(modelo, caminho)
    lote = montar_lote_de_avaliacao([(d, 0) for _, d in desenhos_da_amostra[:6]])
    assert conferir_onnx_cnn(caminho, modelo, lote.imagens) <= 1e-4


def test_onnx_da_lstm_aceita_5_e_130_pontos(tmp_path: Path) -> None:
    modelo = TracoLSTM().eval()
    caminho = tmp_path / "lstm.onnx"
    exportar_lstm_onnx(modelo, caminho)
    gerador = np.random.default_rng(0)
    sequencias = [gerador.normal(0, 0.1, (n, 3)).astype(np.float32) for n in (5, 130)]
    assert conferir_onnx_lstm(caminho, modelo, sequencias) <= 1e-4
