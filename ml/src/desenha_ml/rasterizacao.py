"""Imagem 28×28 da CNN por cobertura geométrica (D1 e D2 do design).

Cada pixel vale a fração dos seus 16 subpontos (grade 4×4) que estão a até `espessura / 2` de algum
segmento do traço. A mesma conta existe em `app/src/domain/desenho/rasterizacao.ts`, para o jogo
enxergar o desenho exatamente como as redes viram no treino (canvas e OpenCV têm antialias diferentes).

Exemplo:
    >>> imagem = rasterizar(Desenho.de_arrays([[[0.0, 0.0], [255.0, 0.0]]]))
    >>> float(imagem[13, 10]), float(imagem[0, 0])
    (0.75, 0.0)
"""

import itertools
import math

import numpy as np
from numpy.typing import NDArray

from desenha_ml.desenho import Desenho
from desenha_ml.normalizacao import ESCALA_MAXIMA, normalizar

LADO_DA_IMAGEM = 28
LADO_DA_CAIXA = 22  # o desenho ocupa 22 dos 28 pixels (220 de 280 no rascunho original)
SUBAMOSTRAS = 4  # subpontos por eixo em cada pixel
ESPESSURA_PADRAO = 1.6  # em pixels da imagem 28×28 (16 px na escala 280)

_LADO_DA_MASCARA = LADO_DA_IMAGEM * SUBAMOSTRAS


def rasterizar(desenho: Desenho, espessura: float = ESPESSURA_PADRAO) -> NDArray[np.float32]:
    mascara = np.zeros((_LADO_DA_MASCARA, _LADO_DA_MASCARA), dtype=bool)
    raio = espessura / 2
    for traco in _tracos_em_pixels(desenho):
        for inicio, fim in _segmentos(traco):
            _pintar_segmento(mascara, inicio, fim, raio)
    blocos = mascara.reshape(LADO_DA_IMAGEM, SUBAMOSTRAS, LADO_DA_IMAGEM, SUBAMOSTRAS)
    return np.asarray(blocos.mean(axis=(1, 3)), dtype=np.float32)


def _tracos_em_pixels(desenho: Desenho) -> list[NDArray[np.float64]]:
    """Escala o desenho normalizado para a caixa de 22 px e centraliza na grade 28×28."""
    normalizado = normalizar(desenho)
    escala = LADO_DA_CAIXA / ESCALA_MAXIMA
    tamanho = np.max(normalizado.todos_os_pontos(), axis=0) * escala
    deslocamento = (LADO_DA_IMAGEM - tamanho) / 2
    return [t * escala + deslocamento for t in normalizado.tracos]


def _segmentos(traco: NDArray[np.float64]) -> list[tuple[NDArray[np.float64], NDArray[np.float64]]]:
    if len(traco) == 1:  # ponto isolado: segmento degenerado, vira um disco
        return [(traco[0], traco[0])]
    return list(itertools.pairwise(traco))


def _pintar_segmento(
    mascara: NDArray[np.bool_], inicio: NDArray[np.float64], fim: NDArray[np.float64], raio: float
) -> None:
    """Marca os subpontos a até `raio` do segmento, avaliando só a caixa ao redor dele.

    Compara distâncias ao quadrado (sem raiz) e usa broadcasting linha × coluna: é a parte mais
    quente do pré-processamento do dataset. O TypeScript usa a mesma comparação.
    """
    ax, ay, bx, by = float(inicio[0]), float(inicio[1]), float(fim[0]), float(fim[1])
    colunas = _faixa_de_indices(min(ax, bx) - raio, max(ax, bx) + raio)
    linhas = _faixa_de_indices(min(ay, by) - raio, max(ay, by) + raio)
    if colunas is None or linhas is None:
        return
    xs = (np.arange(colunas[0], colunas[1] + 1) + 0.5) / SUBAMOSTRAS - ax
    ys = ((np.arange(linhas[0], linhas[1] + 1) + 0.5) / SUBAMOSTRAS - ay)[:, None]
    dx, dy = bx - ax, by - ay
    comprimento2 = dx * dx + dy * dy
    t = np.clip((xs * dx + ys * dy) / comprimento2, 0.0, 1.0) if comprimento2 > 0 else 0.0
    distancia2 = (xs - t * dx) ** 2 + (ys - t * dy) ** 2
    mascara[linhas[0] : linhas[1] + 1, colunas[0] : colunas[1] + 1] |= distancia2 <= raio * raio


def _faixa_de_indices(minimo: float, maximo: float) -> tuple[int, int] | None:
    """Primeiro e último índice de subponto cujo centro (u + 0,5) / 4 cai em [minimo, maximo]."""
    primeiro = max(math.ceil(minimo * SUBAMOSTRAS - 0.5), 0)
    ultimo = min(math.floor(maximo * SUBAMOSTRAS - 0.5), _LADO_DA_MASCARA - 1)
    return (primeiro, ultimo) if primeiro <= ultimo else None
