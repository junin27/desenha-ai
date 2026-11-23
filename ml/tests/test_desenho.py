"""Requisito "Formato do desenho" — spec pre-processamento-de-desenho."""

import numpy as np

from desenha_ml.desenho import Desenho, desenho_de_pontos, desenho_de_quickdraw
from desenha_ml.resultado import Erro, Ok


def test_desenho_vazio_sem_tracos_e_recusado() -> None:
    assert desenho_de_pontos([]) == Erro("desenho_vazio", "o desenho não tem pontos; esperado ao menos 1")


def test_desenho_so_com_tracos_sem_pontos_e_recusado() -> None:
    resultado = desenho_de_pontos([[], []])
    assert isinstance(resultado, Erro)
    assert resultado.codigo == "desenho_vazio"


def test_tracos_vazios_sao_ignorados() -> None:
    com_vazio = desenho_de_pontos([[(1.0, 2.0), (3.0, 4.0)], []])
    sem_vazio = desenho_de_pontos([[(1.0, 2.0), (3.0, 4.0)]])
    assert isinstance(com_vazio, Ok) and isinstance(sem_vazio, Ok)
    assert com_vazio.valor == sem_vazio.valor


def test_desenho_do_formato_quickdraw_xs_ys() -> None:
    resultado = desenho_de_quickdraw([[[0, 10, 20], [5, 5, 6]], [[3], [4]]])
    assert isinstance(resultado, Ok)
    desenho = resultado.valor
    assert desenho.total_de_pontos == 4
    np.testing.assert_array_equal(desenho.tracos[0], [[0, 5], [10, 5], [20, 6]])
    np.testing.assert_array_equal(desenho.tracos[1], [[3, 4]])


def test_desenho_e_imutavel() -> None:
    resultado = desenho_de_pontos([[(1.0, 2.0)]])
    assert isinstance(resultado, Ok)
    traco = resultado.valor.tracos[0]
    assert not traco.flags.writeable


def test_criar_desenho_nao_congela_o_array_de_quem_chamou() -> None:
    original = np.array([[1.0, 2.0]])
    Desenho.de_arrays([original])
    assert original.flags.writeable


def test_igualdade_compara_coordenadas() -> None:
    a = Desenho.de_arrays([np.array([[1.0, 2.0]])])
    b = Desenho.de_arrays([np.array([[1.0, 2.0]])])
    c = Desenho.de_arrays([np.array([[1.0, 2.5]])])
    assert a == b
    assert a != c
