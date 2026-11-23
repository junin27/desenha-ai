"""Requisitos "Separação dos dados" e "Exemplos de treino completos e parciais" — spec treino-das-redes."""

import io
import json
from collections.abc import Callable, Iterable, Iterator

import numpy as np
import pytest

from desenha_ml.categorias import CATEGORIAS
from desenha_ml.dados import (
    ESPESSURA_MAXIMA_NO_TREINO,
    ESPESSURA_MINIMA_NO_TREINO,
    FRACAO_MAXIMA_NO_TREINO,
    FRACAO_MINIMA_NO_TREINO,
    ArgumentosDoExemplo,
    ExemploProcessado,
    TamanhosDosConjuntos,
    empacotar_sequencias,
    montar_lote_de_avaliacao,
    montar_lote_de_treino,
    separar_conjuntos,
)
from desenha_ml.desenho import Desenho
from desenha_ml.leitura_quickdraw import ler_desenhos_ndjson
from desenha_ml.resultado import Erro, Ok
from desenha_ml.sequencia import MAXIMO_DE_PONTOS

PEQUENO = TamanhosDosConjuntos(treino=4, validacao=2, teste=2)


def _desenho(i: int) -> Desenho:
    return Desenho.de_arrays([[[0.0, 0.0], [10.0 + i, 5.0], [3.0, 20.0 + i]]])


def _por_categoria(quantidade: int) -> dict[str, list[Desenho]]:
    return {c.en: [_desenho(i) for i in range(quantidade)] for c in CATEGORIAS}


def test_blocos_sem_sobreposicao() -> None:
    resultado = separar_conjuntos(_por_categoria(9), PEQUENO)
    assert isinstance(resultado, Ok)
    conjuntos = resultado.valor
    assert (
        len(conjuntos.treino) == 4 * 30 and len(conjuntos.validacao) == 2 * 30 and len(conjuntos.teste) == 60
    )
    vaca = [d for d, rotulo in conjuntos.treino if rotulo == 0]
    assert vaca == [_desenho(i) for i in range(4)]
    assert [d for d, r in conjuntos.validacao if r == 0] == [_desenho(4), _desenho(5)]
    assert [d for d, r in conjuntos.teste if r == 0] == [_desenho(6), _desenho(7)]


def test_rotulo_e_o_indice_da_categoria() -> None:
    resultado = separar_conjuntos(_por_categoria(8), PEQUENO)
    assert isinstance(resultado, Ok)
    assert sorted({r for _, r in resultado.valor.teste}) == list(range(30))


def test_categoria_com_poucos_desenhos() -> None:
    dados = _por_categoria(8)
    dados["tractor"] = dados["tractor"][:5]
    resultado = separar_conjuntos(dados, PEQUENO)
    assert isinstance(resultado, Erro)
    assert resultado.codigo == "dados_insuficientes"
    assert "tractor" in resultado.detalhe and "5" in resultado.detalhe


def test_categoria_ausente_e_dados_insuficientes() -> None:
    dados = _por_categoria(8)
    del dados["cow"]
    resultado = separar_conjuntos(dados, PEQUENO)
    assert isinstance(resultado, Erro) and resultado.codigo == "dados_insuficientes"


def test_leitura_pode_descartar_desenhos_nao_reconhecidos() -> None:
    linhas = [
        json.dumps({"word": "cow", "recognized": True, "drawing": [[[0, 1], [0, 1]]]}),
        json.dumps({"word": "cow", "recognized": False, "drawing": [[[0, 2], [0, 2]]]}),
        json.dumps({"word": "cow", "drawing": [[[0, 3], [0, 3]]]}),  # sem o campo: tratado como reconhecido
    ]
    assert len(ler_desenhos_ndjson(io.StringIO("\n".join(linhas)), somente_reconhecidos=True)) == 2
    assert len(ler_desenhos_ndjson(io.StringIO("\n".join(linhas)))) == 3


def _exemplos(quantidade: int) -> list[tuple[Desenho, int]]:
    return [(_desenho(i), i % 30) for i in range(quantidade)]


def test_treino_reprodutivel_com_a_mesma_semente() -> None:
    a_completo, a_parcial = montar_lote_de_treino(_exemplos(12), semente=7)
    b_completo, b_parcial = montar_lote_de_treino(_exemplos(12), semente=7)
    for x, y in ((a_completo, b_completo), (a_parcial, b_parcial)):
        np.testing.assert_array_equal(x.imagens, y.imagens)
        np.testing.assert_array_equal(x.sequencias, y.sequencias)
        np.testing.assert_array_equal(x.fracoes, y.fracoes)
        np.testing.assert_array_equal(x.espessuras, y.espessuras)


def test_semente_diferente_muda_o_sorteio() -> None:
    _, a = montar_lote_de_treino(_exemplos(12), semente=7)
    _, b = montar_lote_de_treino(_exemplos(12), semente=8)
    assert not np.array_equal(a.fracoes, b.fracoes)


def test_fracoes_e_espessuras_nos_intervalos() -> None:
    completo, parcial = montar_lote_de_treino(_exemplos(200), semente=1)
    assert np.all(completo.fracoes == 1.0)
    assert (
        float(np.min(parcial.fracoes)) >= FRACAO_MINIMA_NO_TREINO
        and float(np.max(parcial.fracoes)) <= FRACAO_MAXIMA_NO_TREINO
    )
    assert float(np.min(completo.espessuras)) >= ESPESSURA_MINIMA_NO_TREINO
    assert float(np.max(completo.espessuras)) <= ESPESSURA_MAXIMA_NO_TREINO
    np.testing.assert_array_equal(completo.espessuras, parcial.espessuras)


def test_avaliacao_sem_sorteio() -> None:
    lote = montar_lote_de_avaliacao(_exemplos(5))
    assert np.all(lote.fracoes == 1.0)
    assert np.all(lote.espessuras == 1.6)
    np.testing.assert_array_equal(lote.rotulos, [0, 1, 2, 3, 4])


def test_avaliacao_com_fracao_do_desenho() -> None:
    lote = montar_lote_de_avaliacao(_exemplos(3), fracao=0.5)
    assert np.all(lote.fracoes == 0.5)


def test_imagens_guardadas_em_dezesseis_avos() -> None:
    lote = montar_lote_de_avaliacao(_exemplos(3))
    assert lote.imagens.dtype == np.uint8
    assert lote.imagens.shape == (3, 28, 28)
    assert int(float(np.max(lote.imagens))) <= 16


def test_mapeamento_injetado_e_usado() -> None:
    chamadas: list[int] = []

    def mapear_contando(
        funcao: Callable[[ArgumentosDoExemplo], ExemploProcessado], itens: Iterable[ArgumentosDoExemplo]
    ) -> Iterator[ExemploProcessado]:
        lista = list(itens)
        chamadas.append(len(lista))
        return map(funcao, lista)

    montar_lote_de_avaliacao(_exemplos(4), mapear=mapear_contando)
    assert chamadas == [4]


def test_empacotar_sequencias_com_padding() -> None:
    sequencias = [np.ones((3, 3), np.float32), np.ones((MAXIMO_DE_PONTOS, 3), np.float32)]
    empacotadas, comprimentos = empacotar_sequencias(sequencias)
    assert empacotadas.shape == (2, MAXIMO_DE_PONTOS, 3)
    np.testing.assert_array_equal(comprimentos, [3, MAXIMO_DE_PONTOS])
    assert float(empacotadas[0, 3:].sum()) == 0.0


def test_empacotar_recusa_sequencia_longa_demais() -> None:
    with pytest.raises(ValueError, match="131"):
        empacotar_sequencias([np.ones((MAXIMO_DE_PONTOS + 1, 3), np.float32)])
