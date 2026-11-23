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

import numpy as np
from numpy.typing import NDArray

from desenha_ml.desenho import Desenho
from desenha_ml.geometria import distancias_ao_segmento
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
    """Marca os subpontos a até `raio` do segmento, avaliando só a caixa ao redor dele."""
    colunas = _indices_na_faixa(min(inicio[0], fim[0]) - raio, max(inicio[0], fim[0]) + raio)
    linhas = _indices_na_faixa(min(inicio[1], fim[1]) - raio, max(inicio[1], fim[1]) + raio)
    if colunas.size == 0 or linhas.size == 0:
        return
    xs, ys = np.meshgrid(_centros(colunas), _centros(linhas))
    pontos = np.stack([xs.ravel(), ys.ravel()], axis=1)
    dentro = (distancias_ao_segmento(pontos, inicio, fim) <= raio).reshape(xs.shape)
    mascara[linhas[0] : linhas[-1] + 1, colunas[0] : colunas[-1] + 1] |= dentro


def _indices_na_faixa(minimo: float, maximo: float) -> NDArray[np.int64]:
    """Índices de subpontos cujo centro (u + 0,5) / 4 cai em [minimo, maximo]."""
    primeiro = max(int(np.ceil(minimo * SUBAMOSTRAS - 0.5)), 0)
    ultimo = min(int(np.floor(maximo * SUBAMOSTRAS - 0.5)), _LADO_DA_MASCARA - 1)
    return np.arange(primeiro, ultimo + 1, dtype=np.int64)


def _centros(indices: NDArray[np.int64]) -> NDArray[np.float64]:
    return (indices + 0.5) / SUBAMOSTRAS
