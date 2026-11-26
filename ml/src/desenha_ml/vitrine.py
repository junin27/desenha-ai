"""Desenhos reais do Quick, Draw! mostrados na vitrine do jogo (change vitrine-viva, decisão D5).

A vitrine mostra a CNN e a LSTM palpitando sobre um desenho de verdade. Para a história fazer sentido,
escolhemos, por categoria, o primeiro desenho do conjunto de teste que o ensemble acerta com folga e que
tem poucos traços (fica legível sendo traçado na tela). A escolha é determinística: mesma entrada, mesmo
arquivo. As probabilidades vêm do notebook (que roda as redes); este módulo só decide e formata.

Exemplo:
    >>> import numpy as np
    >>> from desenha_ml.desenho import Desenho
    >>> p = np.zeros(30); p[15] = 0.9
    >>> c = CandidatoDaVitrine("sun", 15, Desenho.de_arrays([[[0, 0], [1, 1]], [[2, 2], [3, 3]]]), p)
    >>> [e.categoria for e in escolher_desenhos_da_vitrine([c], categorias=("sun",))]
    ['sun']
"""

from collections.abc import Callable, Iterable, Mapping, Sequence
from dataclasses import dataclass
from typing import TypedDict

import numpy as np
from numpy.typing import NDArray

from desenha_ml.categorias import CATEGORIAS
from desenha_ml.dados import TamanhosDosConjuntos
from desenha_ml.desenho import Desenho

# Categorias (nome em inglês, como em classes.json) com desenhos que se leem bem sendo traçados.
CATEGORIAS_DA_VITRINE = ("sun", "house", "fish", "tree", "flower", "cat", "guitar", "bicycle")
PROBABILIDADE_MINIMA_DO_ALVO = 0.8
TRACOS_MINIMOS = 2
TRACOS_MAXIMOS = 8
FONTE_DOS_DESENHOS = "Quick, Draw! (Google) · CC BY 4.0 · conjunto de teste"


@dataclass(frozen=True, eq=False)
class CandidatoDaVitrine:
    categoria: str
    indice_da_categoria: int
    desenho: Desenho
    probabilidades_do_ensemble: NDArray[np.float64]


class DesenhoDaVitrine(TypedDict):
    categoria: str
    indice: int
    tracos: list[list[list[int]]]


class ArquivoDaVitrine(TypedDict):
    fonte: str
    desenhos: list[DesenhoDaVitrine]


def escolher_desenhos_da_vitrine(
    candidatos: Iterable[CandidatoDaVitrine], categorias: Sequence[str] = CATEGORIAS_DA_VITRINE
) -> list[CandidatoDaVitrine]:
    """Um desenho por categoria, na ordem de `categorias`: o 1º candidato (na ordem recebida) que serve."""
    escolhidos: dict[str, CandidatoDaVitrine] = {}
    for candidato in candidatos:
        if candidato.categoria in categorias and candidato.categoria not in escolhidos and _serve(candidato):
            escolhidos[candidato.categoria] = candidato
    return [escolhidos[nome] for nome in categorias if nome in escolhidos]


ClassificadorDoEnsemble = Callable[[Desenho], NDArray[np.float64]]
"""Recebe um desenho completo e devolve as 30 probabilidades do ensemble (o script injeta as redes)."""


def primeiro_que_serve(
    categoria: str, indice: int, desenhos: Iterable[Desenho], classificar: ClassificadorDoEnsemble
) -> CandidatoDaVitrine | None:
    """Varre `desenhos` na ordem e para no 1º que serve; só classifica os que têm de 2 a 8 traços.

    Preguiçoso de propósito: o avaliador de referência do ONNX é lento, então não vale classificar
    os mil desenhos de teste de cada categoria para usar um só.
    """
    for desenho in desenhos:
        if not TRACOS_MINIMOS <= len(desenho.tracos) <= TRACOS_MAXIMOS:
            continue
        candidato = CandidatoDaVitrine(categoria, indice, desenho, classificar(desenho))
        if _serve(candidato):
            return candidato
    return None


BaixarDesenhos = Callable[[str, int], Sequence[Desenho]]
"""Como `fonte_quickdraw.baixar_desenhos`: os primeiros `quantidade` desenhos reconhecidos da categoria."""


def montar_arquivo_da_vitrine(
    baixar: BaixarDesenhos,
    classificar: ClassificadorDoEnsemble,
    categorias: Sequence[str] = CATEGORIAS_DA_VITRINE,
    tamanhos: tuple[int, int, int] = (
        TamanhosDosConjuntos().treino,
        TamanhosDosConjuntos().validacao,
        TamanhosDosConjuntos().teste,
    ),
) -> ArquivoDaVitrine:
    """Só o bloco de TESTE de cada categoria (a mesma separação do treino), um desenho por categoria."""
    treino, validacao, teste = tamanhos
    indices = {c.en: i for i, c in enumerate(CATEGORIAS)}
    escolhidos = []
    for categoria in categorias:
        desenhos = baixar(categoria, treino + validacao + teste)
        bloco_de_teste = desenhos[treino + validacao : treino + validacao + teste]
        candidato = primeiro_que_serve(categoria, indices[categoria], bloco_de_teste, classificar)
        if candidato is not None:
            escolhidos.append(candidato)
    return exportar_vitrine(escolhidos, nomes={c.en: c.pt for c in CATEGORIAS})


def exportar_vitrine(escolhidos: Sequence[CandidatoDaVitrine], nomes: Mapping[str, str]) -> ArquivoDaVitrine:
    """Formato de `vitrine_tracos.json`: nome em português, índice da classe e traços em pontos inteiros."""
    return {
        "fonte": FONTE_DOS_DESENHOS,
        "desenhos": [
            {
                "categoria": nomes[c.categoria],
                "indice": c.indice_da_categoria,
                "tracos": _tracos_inteiros(c.desenho),
            }
            for c in escolhidos
        ],
    }


def _serve(candidato: CandidatoDaVitrine) -> bool:
    probabilidades = candidato.probabilidades_do_ensemble
    acertou = int(np.argmax(probabilidades)) == candidato.indice_da_categoria
    com_folga = float(probabilidades[candidato.indice_da_categoria]) >= PROBABILIDADE_MINIMA_DO_ALVO
    return acertou and com_folga and TRACOS_MINIMOS <= len(candidato.desenho.tracos) <= TRACOS_MAXIMOS


def _tracos_inteiros(desenho: Desenho) -> list[list[list[int]]]:
    return [[[round(float(x)), round(float(y))] for x, y in traco] for traco in desenho.tracos]
