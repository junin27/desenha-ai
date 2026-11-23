"""Requisito "Prefixo do desenho" — spec pre-processamento-de-desenho."""

import numpy as np
import pytest

from desenha_ml.desenho import Desenho
from desenha_ml.prefixo import prefixo
from desenha_ml.resultado import Erro, Ok


def _desenho_4_mais_6() -> Desenho:
    return Desenho.de_arrays([np.arange(8).reshape(4, 2), np.arange(100, 112).reshape(6, 2)])


def _valor(resultado: Ok[Desenho] | Erro) -> Desenho:
    assert isinstance(resultado, Ok), resultado
    return resultado.valor


def test_prefixo_corta_no_meio_do_segundo_traco() -> None:
    parcial = _valor(prefixo(_desenho_4_mais_6(), 0.5))
    assert [len(t) for t in parcial.tracos] == [4, 1]


def test_prefixo_minimo_de_dois_pontos() -> None:
    parcial = _valor(prefixo(_desenho_4_mais_6(), 0.05))
    assert parcial.total_de_pontos == 2


def test_prefixo_de_desenho_com_um_ponto_tem_um_ponto() -> None:
    parcial = _valor(prefixo(Desenho.de_arrays([np.array([[3.0, 3.0]])]), 0.5))
    assert parcial.total_de_pontos == 1


def test_prefixo_e_renormalizado() -> None:
    parcial = _valor(prefixo(_desenho_4_mais_6(), 0.3))
    pontos = parcial.todos_os_pontos()
    assert float(np.min(pontos)) == 0.0
    assert float(np.max(pontos)) == 255.0


def test_fracao_sem_erro_de_ponto_flutuante() -> None:
    # 0,3 x 10 = 3,0000000000000004 em ponto flutuante; o teto tem de dar 3, não 4.
    parcial = _valor(prefixo(_desenho_4_mais_6(), 0.3))
    assert parcial.total_de_pontos == 3


def test_fracao_um_devolve_o_desenho_inteiro_normalizado() -> None:
    assert _valor(prefixo(_desenho_4_mais_6(), 1.0)).total_de_pontos == 10


@pytest.mark.parametrize("fracao", [0.0, -0.1, 1.2, float("nan")])
def test_fracao_invalida(fracao: float) -> None:
    resultado = prefixo(_desenho_4_mais_6(), fracao)
    assert isinstance(resultado, Erro)
    assert resultado.codigo == "fracao_invalida"
    assert "esperado 0 < p <= 1" in resultado.detalhe
