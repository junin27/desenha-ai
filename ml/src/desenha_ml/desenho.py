"""Formato canônico de um desenho: traços ordenados, cada um com pontos (x, y) na ordem do desenho.

Exemplo:
    >>> desenho_de_quickdraw([[[0, 10], [5, 5]]]).valor.total_de_pontos
    2
"""

from collections.abc import Iterable, Sequence
from dataclasses import dataclass

import numpy as np
from numpy.typing import ArrayLike, NDArray

from desenha_ml.resultado import Erro, Ok, Resultado

Traco = NDArray[np.float64]
"""Array (n, 2) somente leitura com as colunas x e y."""


@dataclass(frozen=True, eq=False)
class Desenho:
    tracos: tuple[Traco, ...]

    @staticmethod
    def de_arrays(tracos: Iterable[ArrayLike]) -> "Desenho":
        """Cria o desenho sem validar; use `desenho_de_pontos` para entradas externas."""
        # Copia para não congelar (setflags) o array de quem chamou.
        return Desenho(tuple(_congelar(np.array(t, dtype=np.float64).reshape(-1, 2)) for t in tracos))

    @property
    def total_de_pontos(self) -> int:
        return sum(len(t) for t in self.tracos)

    def todos_os_pontos(self) -> NDArray[np.float64]:
        return np.concatenate(self.tracos, axis=0)

    def __eq__(self, outro: object) -> bool:
        if not isinstance(outro, Desenho) or len(self.tracos) != len(outro.tracos):
            return False
        return all(np.array_equal(a, b) for a, b in zip(self.tracos, outro.tracos, strict=True))

    def __hash__(self) -> int:
        return hash(tuple(t.tobytes() for t in self.tracos))


def desenho_de_pontos(tracos: Sequence[Sequence[tuple[float, float]]]) -> Resultado[Desenho]:
    """Valida traços no formato [[(x, y), ...], ...], ignorando traços sem pontos."""
    com_pontos = [np.asarray(t, dtype=np.float64).reshape(-1, 2) for t in tracos if len(t) > 0]
    if not com_pontos:
        return Erro("desenho_vazio", "o desenho não tem pontos; esperado ao menos 1")
    return Ok(Desenho.de_arrays(com_pontos))


def desenho_de_quickdraw(tracos: Sequence[Sequence[Sequence[float]]]) -> Resultado[Desenho]:
    """Converte o formato do Quick, Draw! ([[xs], [ys]] por traço) para o formato canônico."""
    return desenho_de_pontos([list(zip(t[0], t[1], strict=True)) for t in tracos])


def _congelar(array: NDArray[np.float64]) -> NDArray[np.float64]:
    array.setflags(write=False)
    return array
