"""Arquiteturas do jogo: CNN para a imagem 28×28 e LSTM para a sequência de traços (spec treino-das-redes).

Requer o extra `[treino]`. Treino: `desenha_ml.treino`; exportação: `desenha_ml.exportacao_onnx`.

Exemplo (exige torch):
    >>> sum(p.numel() for p in RabiscoNet().parameters()) > 100_000
    True
"""

import torch
import torch.nn.functional as F  # noqa: N812 - convenção do PyTorch
from torch import nn
from torch.nn.utils.rnn import pack_padded_sequence

from desenha_ml.categorias import CATEGORIAS
from desenha_ml.rasterizacao import SUBAMOSTRAS

NUMERO_DE_CLASSES = len(CATEGORIAS)
NIVEIS_DE_COBERTURA = float(SUBAMOSTRAS * SUBAMOSTRAS)
_MEDIA_DOS_PIXELS, _DESVIO_DOS_PIXELS = 0.1, 0.25  # normalização fixa dentro da CNN (o ONNX recebe [0, 1])


# ----------------------------------------------------------------------------------------- arquiteturas
class _BlocoResidual(nn.Module):
    def __init__(self, entrada: int, saida: int, passo: int = 1) -> None:
        super().__init__()
        self.conv1 = nn.Conv2d(entrada, saida, 3, passo, 1, bias=False)
        self.norm1 = nn.BatchNorm2d(saida)
        self.conv2 = nn.Conv2d(saida, saida, 3, 1, 1, bias=False)
        self.norm2 = nn.BatchNorm2d(saida)
        self.atalho: nn.Module = nn.Identity()
        if passo != 1 or entrada != saida:
            self.atalho = nn.Sequential(
                nn.Conv2d(entrada, saida, 1, passo, bias=False), nn.BatchNorm2d(saida)
            )

    def forward(self, x: torch.Tensor) -> torch.Tensor:
        y: torch.Tensor = self.norm2(self.conv2(F.relu(self.norm1(self.conv1(x)))))
        atalho: torch.Tensor = self.atalho(x)
        return F.relu(y + atalho)


class RabiscoNet(nn.Module):
    """CNN residual para a imagem 28×28: 32 → 64 → 128 canais, GAP e camada densa (logits)."""

    def __init__(self) -> None:
        super().__init__()
        self.entrada = nn.Sequential(nn.Conv2d(1, 32, 3, 1, 1, bias=False), nn.BatchNorm2d(32), nn.ReLU())
        self.blocos = nn.Sequential(
            _BlocoResidual(32, 32),
            _BlocoResidual(32, 64, 2),
            _BlocoResidual(64, 64),
            _BlocoResidual(64, 128, 2),
            _BlocoResidual(128, 128),
        )
        self.saida = nn.Sequential(
            nn.AdaptiveAvgPool2d(1), nn.Flatten(), nn.Dropout(0.3), nn.Linear(128, NUMERO_DE_CLASSES)
        )

    def forward(self, imagem: torch.Tensor) -> torch.Tensor:
        normalizada = (imagem - _MEDIA_DOS_PIXELS) / _DESVIO_DOS_PIXELS
        logits: torch.Tensor = self.saida(self.blocos(self.entrada(normalizada)))
        return logits


class TracoLSTM(nn.Module):
    """Conv1D sobre os traços + LSTM bidirecional de 2 camadas; usa os estados finais de ida e de volta."""

    def __init__(self, unidades: int = 128) -> None:
        super().__init__()
        self.conv1 = nn.Conv1d(3, 64, 5, padding=2)
        self.conv2 = nn.Conv1d(64, 96, 5, padding=2)
        self.lstm = nn.LSTM(96, unidades, num_layers=2, batch_first=True, bidirectional=True, dropout=0.3)
        self.saida = nn.Sequential(nn.Dropout(0.3), nn.Linear(2 * unidades, NUMERO_DE_CLASSES))

    def caracteristicas(self, sequencia: torch.Tensor, mascara: torch.Tensor | None = None) -> torch.Tensor:
        """Duas Conv1D. Com padding, a máscara zera as posições depois do fim de cada sequência: sem ela,
        o viés da 1ª convolução "vaza" para a borda da 2ª e o treino (com padding) diverge do jogo (sem)."""
        x = sequencia.transpose(1, 2)
        for convolucao in (self.conv1, self.conv2):
            x = F.relu(convolucao(x))
            if mascara is not None:
                x = x * mascara[:, None, :]
        return x.transpose(1, 2)

    def forward(self, sequencia: torch.Tensor, comprimentos: torch.Tensor) -> torch.Tensor:
        posicoes = torch.arange(sequencia.shape[1], device=sequencia.device)
        mascara = (posicoes[None, :] < comprimentos.to(sequencia.device)[:, None]).to(sequencia.dtype)
        empacotada = pack_padded_sequence(
            self.caracteristicas(sequencia, mascara),
            comprimentos.cpu(),
            batch_first=True,
            enforce_sorted=False,
        )
        _, (estados, _) = self.lstm(empacotada)
        logits: torch.Tensor = self.saida(torch.cat([estados[-2], estados[-1]], dim=1))
        return logits


class CNNComSoftmax(nn.Module):
    def __init__(self, cnn: RabiscoNet) -> None:
        super().__init__()
        self.cnn = cnn

    def forward(self, imagem: torch.Tensor) -> torch.Tensor:
        return F.softmax(self.cnn(imagem), dim=1)


class LSTMComSoftmax(nn.Module):
    """Versão sem `pack_padded_sequence`, para o ONNX: no jogo o lote tem um desenho, sem padding."""

    def __init__(self, lstm: TracoLSTM) -> None:
        super().__init__()
        self.lstm = lstm

    def forward(self, sequencia: torch.Tensor) -> torch.Tensor:
        _, (estados, _) = self.lstm.lstm(self.lstm.caracteristicas(sequencia))
        return F.softmax(self.lstm.saida(torch.cat([estados[-2], estados[-1]], dim=1)), dim=1)
