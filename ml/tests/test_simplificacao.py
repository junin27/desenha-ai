"""Requisito "Simplificação de traços capturados" — spec pre-processamento-de-desenho."""

import numpy as np

from desenha_ml.desenho import Desenho
from desenha_ml.simplificacao import _ponto_mais_distante, preparar_desenho_capturado, simplificar_traco


def test_pontos_colineares_sao_removidos() -> None:
    desenho = Desenho.de_arrays([np.array([[0, 0], [50, 0.5], [100, 0], [255, 0]])])
    np.testing.assert_allclose(preparar_desenho_capturado(desenho).tracos[0], [[0.0, 0.0], [255.0, 0.0]])


def test_canto_do_traco_e_preservado() -> None:
    desenho = Desenho.de_arrays([np.array([[0, 0], [255, 0], [255, 255]])])
    np.testing.assert_allclose(
        preparar_desenho_capturado(desenho).tracos[0], [[0.0, 0.0], [255.0, 0.0], [255.0, 255.0]]
    )


def test_primeiro_e_ultimo_ponto_sempre_mantidos() -> None:
    traco = np.array([[0.0, 0.0], [1.0, 0.0], [2.0, 0.0]])
    simplificado = simplificar_traco(traco, epsilon=2.0)
    np.testing.assert_allclose(simplificado, [[0.0, 0.0], [2.0, 0.0]])


def test_traco_curto_fica_igual() -> None:
    for traco in (np.array([[5.0, 5.0]]), np.array([[0.0, 0.0], [9.0, 9.0]])):
        np.testing.assert_allclose(simplificar_traco(traco, epsilon=2.0), traco)


def test_traco_fechado_mantem_o_ponto_mais_distante() -> None:
    # Começa e termina no mesmo lugar: a distância é medida até o ponto inicial.
    traco = np.array([[0.0, 0.0], [100.0, 0.0], [100.0, 100.0], [0.0, 0.0]])
    simplificado = simplificar_traco(traco, epsilon=2.0)
    assert simplificado.shape[0] >= 3
    np.testing.assert_allclose(simplificado[0], [0.0, 0.0])
    np.testing.assert_allclose(simplificado[-1], [0.0, 0.0])


def test_traco_longo_nao_estoura_recursao() -> None:
    angulos = np.linspace(0, 40 * np.pi, 20_000)
    traco = np.stack([angulos, np.sin(angulos) * 50], axis=1)
    simplificado = simplificar_traco(traco, epsilon=2.0)
    assert 2 < simplificado.shape[0] < traco.shape[0]


def test_empate_de_distancias_escolhe_o_menor_indice() -> None:
    # Pontos simétricos ficam à mesma distância do segmento; diferenças na última casa decimal entre
    # Python e TypeScript não podem mudar o ponto escolhido (D8 do design).
    traco = np.array([[0.0, 0.0], [50.0, 30.0], [100.0, 0.0], [150.0, 30.0 + 1e-12], [200.0, 0.0]])
    traco_reduzido = np.array([traco[0], traco[1], traco[3], traco[4]])
    simplificado = simplificar_traco(traco_reduzido, epsilon=40.0)
    np.testing.assert_allclose(simplificado, [traco[0], traco[4]])
    assert _ponto_mais_distante(traco_reduzido, 0, 3)[0] == 1
