"""Exportação ONNX (softmax incluso) conferida contra o PyTorch sem onnxruntime (spec treino-das-redes).

A conferência usa `onnx.reference.ReferenceEvaluator`, em Python puro. Requer o extra `[treino]`.
"""

from collections.abc import Sequence
from pathlib import Path

import numpy as np
import onnx
import torch
from numpy.typing import NDArray
from onnx.reference import ReferenceEvaluator
from torch import nn

from desenha_ml.redes import NIVEIS_DE_COBERTURA, CNNComSoftmax, LSTMComSoftmax, RabiscoNet, TracoLSTM
from desenha_ml.treino import prever_cnn, prever_lstm

OPSET_ONNX = 17


# ----------------------------------------------------------------------------------------------- ONNX
def _exportar(
    modulo: nn.Module, exemplo: torch.Tensor, entrada: str, eixos: dict[int, str], caminho: Path
) -> None:
    """Exportador clássico (operador LSTM nativo); se a versão do PyTorch não o tiver, usa o dynamo."""
    modulo = modulo.cpu().eval()
    eixos_dinamicos = {entrada: eixos, "probs": {0: "lote"}}
    try:
        torch.onnx.export(
            modulo,
            (exemplo,),
            str(caminho),
            input_names=[entrada],
            output_names=["probs"],
            dynamic_axes=eixos_dinamicos,
            opset_version=OPSET_ONNX,
            dynamo=False,
        )
    except Exception:  # qualquer falha do exportador clássico cai no dynamo; o resultado é conferido depois
        torch.onnx.export(
            modulo,
            (exemplo,),
            str(caminho),
            input_names=[entrada],
            output_names=["probs"],
            dynamic_axes=eixos_dinamicos,
            dynamo=True,
        )
    onnx.checker.check_model(onnx.load(str(caminho)))


def exportar_cnn_onnx(modelo: RabiscoNet, caminho: Path) -> None:
    _exportar(CNNComSoftmax(modelo), torch.zeros(1, 1, 28, 28), "imagem", {0: "lote"}, caminho)


def exportar_lstm_onnx(modelo: TracoLSTM, caminho: Path) -> None:
    _exportar(LSTMComSoftmax(modelo), torch.zeros(1, 20, 3), "sequencia", {0: "lote", 1: "tempo"}, caminho)


def conferir_onnx_cnn(caminho: Path, modelo: RabiscoNet, imagens: NDArray[np.uint8]) -> float:
    """Maior diferença absoluta entre o ONNX (avaliador de referência) e o PyTorch."""
    avaliador = ReferenceEvaluator(onnx.load(str(caminho)))
    entrada = imagens[:, None].astype(np.float32) / NIVEIS_DE_COBERTURA
    (saida_onnx,) = avaliador.run(None, {"imagem": entrada})
    return float(np.max(np.abs(np.asarray(saida_onnx) - prever_cnn(modelo, imagens))))


def conferir_onnx_lstm(caminho: Path, modelo: TracoLSTM, sequencias: Sequence[NDArray[np.float32]]) -> float:
    avaliador = ReferenceEvaluator(onnx.load(str(caminho)))
    diferencas = []
    for sequencia in sequencias:
        (saida_onnx,) = avaliador.run(None, {"sequencia": sequencia[None].astype(np.float32)})
        esperado = prever_lstm(modelo, sequencia[None], np.array([len(sequencia)]))
        diferencas.append(float(np.max(np.abs(np.asarray(saida_onnx) - esperado))))
    return max(diferencas)
