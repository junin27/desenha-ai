"""Erros esperados como valores (D3 do design): o chamador trata o erro sem try/except.

Exemplo:
    >>> from desenha_ml.desenho import desenho_de_pontos
    >>> resultado = desenho_de_pontos([])
    >>> isinstance(resultado, Erro) and resultado.codigo == "desenho_vazio"
    True
"""

from dataclasses import dataclass
from typing import Generic, Literal, TypeVar

T = TypeVar("T")

CodigoDeErro = Literal[
    "desenho_vazio",
    "fracao_invalida",
    "probabilidades_invalidas",
    "peso_invalido",
    "k_invalido",
    "alvo_invalido",
    "nome_invalido",
]


@dataclass(frozen=True)
class Ok(Generic[T]):
    valor: T


@dataclass(frozen=True)
class Erro:
    codigo: CodigoDeErro
    detalhe: str


Resultado = Ok[T] | Erro
