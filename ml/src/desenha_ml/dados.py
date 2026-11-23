"""Separação dos conjuntos e montagem dos exemplos de treino/avaliação (spec treino-das-redes).

O processamento de cada desenho é uma função pura de topo (`processar_exemplo`), então o chamador pode
injetar um mapeamento paralelo (`multiprocessing.Pool.map` no Colab) sem mudar o resultado: todo sorteio
acontece antes, com a semente.

Exemplo:
    >>> from desenha_ml.desenho import Desenho
    >>> lote = montar_lote_de_avaliacao([(Desenho.de_arrays([[[0, 0], [9, 9]]]), 3)])
    >>> lote.imagens.shape, int(lote.rotulos[0])
    ((1, 28, 28), 3)
"""

from collections.abc import Callable, Iterable, Mapping, Sequence
from dataclasses import dataclass
from typing import NamedTuple

import numpy as np
from numpy.typing import NDArray

from desenha_ml.categorias import CATEGORIAS
from desenha_ml.desenho import Desenho
from desenha_ml.prefixo import prefixo
from desenha_ml.rasterizacao import ESPESSURA_PADRAO, SUBAMOSTRAS, rasterizar
from desenha_ml.resultado import Erro, Ok, Resultado
from desenha_ml.sequencia import MAXIMO_DE_PONTOS, sequenciar

FRACAO_MINIMA_NO_TREINO = 0.3
FRACAO_MAXIMA_NO_TREINO = 0.9
ESPESSURA_MINIMA_NO_TREINO = 1.2
ESPESSURA_MAXIMA_NO_TREINO = 2.0
_NIVEIS_DE_COBERTURA = SUBAMOSTRAS * SUBAMOSTRAS  # pixels valem k/16; guardamos k (uint8, exato)

ExemploRotulado = tuple[Desenho, int]


class TamanhosDosConjuntos(NamedTuple):
    treino: int = 7_000
    validacao: int = 1_000
    teste: int = 1_000


class ConjuntosDeDados(NamedTuple):
    treino: list[ExemploRotulado]
    validacao: list[ExemploRotulado]
    teste: list[ExemploRotulado]


@dataclass(frozen=True)
class LoteDeExemplos:
    imagens: NDArray[np.uint8]  # (n, 28, 28) com k de k/16; divida por 16 para obter [0, 1]
    sequencias: NDArray[np.float32]  # (n, 130, 3) com padding de zeros
    comprimentos: NDArray[np.int64]
    rotulos: NDArray[np.int64]
    fracoes: NDArray[np.float64]
    espessuras: NDArray[np.float64]


ArgumentosDoExemplo = tuple[Desenho, float, float]  # desenho, fração, espessura
ExemploProcessado = tuple[NDArray[np.uint8], NDArray[np.float32]]
Mapeador = Callable[
    [Callable[[ArgumentosDoExemplo], ExemploProcessado], Iterable[ArgumentosDoExemplo]],
    Iterable[ExemploProcessado],
]


def separar_conjuntos(
    desenhos_por_categoria: Mapping[str, Sequence[Desenho]], tamanhos: TamanhosDosConjuntos
) -> Resultado[ConjuntosDeDados]:
    """Blocos fixos por categoria, na ordem do arquivo: treino, depois validação, depois teste."""
    necessarios = sum(tamanhos)
    conjuntos = ConjuntosDeDados([], [], [])
    for rotulo, categoria in enumerate(CATEGORIAS):
        desenhos = desenhos_por_categoria.get(categoria.en, [])
        if len(desenhos) < necessarios:
            detalhe = (
                f"categoria {categoria.en!r} tem {len(desenhos)} desenhos; esperado ao menos {necessarios}"
            )
            return Erro("dados_insuficientes", detalhe)
        inicio_val, inicio_teste = tamanhos.treino, tamanhos.treino + tamanhos.validacao
        conjuntos.treino.extend((d, rotulo) for d in desenhos[:inicio_val])
        conjuntos.validacao.extend((d, rotulo) for d in desenhos[inicio_val:inicio_teste])
        conjuntos.teste.extend((d, rotulo) for d in desenhos[inicio_teste:necessarios])
    return Ok(conjuntos)


def montar_lote_de_treino(
    exemplos: Sequence[ExemploRotulado], semente: int, mapear: Mapeador = map
) -> tuple[LoteDeExemplos, LoteDeExemplos]:
    """Desenho completo e prefixo sorteado, com a mesma espessura sorteada nos dois."""
    sorteio = np.random.default_rng(semente)
    fracoes = sorteio.uniform(FRACAO_MINIMA_NO_TREINO, FRACAO_MAXIMA_NO_TREINO, len(exemplos))
    espessuras = sorteio.uniform(ESPESSURA_MINIMA_NO_TREINO, ESPESSURA_MAXIMA_NO_TREINO, len(exemplos))
    completo = _montar(exemplos, np.ones(len(exemplos)), espessuras, mapear)
    parcial = _montar(exemplos, fracoes, espessuras, mapear)
    return completo, parcial


def montar_lote_de_avaliacao(
    exemplos: Sequence[ExemploRotulado], fracao: float = 1.0, mapear: Mapeador = map
) -> LoteDeExemplos:
    """Sem sorteio: espessura padrão e a mesma fração para todos (1,0 = desenho completo)."""
    quantidade = len(exemplos)
    return _montar(exemplos, np.full(quantidade, fracao), np.full(quantidade, ESPESSURA_PADRAO), mapear)


def processar_exemplo(argumentos: ArgumentosDoExemplo) -> ExemploProcessado:
    """Função de topo (serializável para multiprocessing): imagem em 16 avos e sequência stroke-3."""
    desenho, fracao, espessura = argumentos
    if fracao < 1.0:
        parcial = prefixo(desenho, fracao)
        if isinstance(parcial, Erro):
            raise ValueError(f"fração {fracao} gerou erro {parcial.codigo}; esperado 0 < fração <= 1")
        desenho = parcial.valor
    imagem = np.rint(rasterizar(desenho, espessura) * _NIVEIS_DE_COBERTURA).astype(np.uint8)
    return imagem, sequenciar(desenho)


def empacotar_sequencias(
    sequencias: Sequence[NDArray[np.float32]],
) -> tuple[NDArray[np.float32], NDArray[np.int64]]:
    """Padding com zeros até 130 pontos; sequência maior é bug do chamador (o sequenciar já corta)."""
    empacotadas = np.zeros((len(sequencias), MAXIMO_DE_PONTOS, 3), dtype=np.float32)
    comprimentos = np.zeros(len(sequencias), dtype=np.int64)
    for i, sequencia in enumerate(sequencias):
        if len(sequencia) > MAXIMO_DE_PONTOS:
            raise ValueError(f"sequência com {len(sequencia)} pontos; esperado no máximo {MAXIMO_DE_PONTOS}")
        empacotadas[i, : len(sequencia)] = sequencia
        comprimentos[i] = len(sequencia)
    return empacotadas, comprimentos


def _montar(
    exemplos: Sequence[ExemploRotulado],
    fracoes: NDArray[np.float64],
    espessuras: NDArray[np.float64],
    mapear: Mapeador,
) -> LoteDeExemplos:
    argumentos = [(d, float(f), float(e)) for (d, _), f, e in zip(exemplos, fracoes, espessuras, strict=True)]
    processados = list(mapear(processar_exemplo, argumentos))
    sequencias, comprimentos = empacotar_sequencias([s for _, s in processados])
    imagens = np.stack([i for i, _ in processados]) if processados else np.zeros((0, 28, 28), np.uint8)
    return LoteDeExemplos(
        imagens=imagens,
        sequencias=sequencias,
        comprimentos=comprimentos,
        rotulos=np.array([r for _, r in exemplos], dtype=np.int64),
        fracoes=np.asarray(fracoes, dtype=np.float64),
        espessuras=np.asarray(espessuras, dtype=np.float64),
    )
