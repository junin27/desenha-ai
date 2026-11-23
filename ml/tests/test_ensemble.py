"""Requisitos "Combinação no ensemble" e "Palpites ordenados (top-k)" — spec julgamento-do-desenho."""

import pytest

from desenha_ml.ensemble import combinar, top_k
from desenha_ml.resultado import Erro, Ok

UNIFORME_30 = [1 / 30] * 30


def test_media_ponderada() -> None:
    resultado = combinar([0.6, 0.4], [0.2, 0.8], w_cnn=0.75)
    assert isinstance(resultado, Ok)
    assert resultado.valor == pytest.approx((0.5, 0.5), abs=1e-12)


def test_peso_extremos_devolvem_uma_das_redes() -> None:
    assert combinar([0.6, 0.4], [0.2, 0.8], w_cnn=1.0) == Ok((0.6, 0.4))
    assert combinar([0.6, 0.4], [0.2, 0.8], w_cnn=0.0) == Ok((0.2, 0.8))


def test_tamanhos_diferentes() -> None:
    resultado = combinar(UNIFORME_30, [1 / 29] * 29, w_cnn=0.5)
    assert isinstance(resultado, Erro)
    assert resultado.codigo == "probabilidades_invalidas"
    assert "30" in resultado.detalhe and "29" in resultado.detalhe


@pytest.mark.parametrize("probabilidades", [[0.5, 0.4], [0.7, 0.4], [1.2, -0.2], []])
def test_probabilidades_fora_do_formato(probabilidades: list[float]) -> None:
    resultado = combinar(probabilidades, probabilidades, w_cnn=0.5)
    assert isinstance(resultado, Erro)
    assert resultado.codigo == "probabilidades_invalidas"


@pytest.mark.parametrize("peso", [1.2, -0.1, float("nan")])
def test_peso_invalido(peso: float) -> None:
    resultado = combinar([0.5, 0.5], [0.5, 0.5], w_cnn=peso)
    assert isinstance(resultado, Erro)
    assert resultado.codigo == "peso_invalido"


def test_empate_decidido_pelo_indice() -> None:
    assert top_k([0.1, 0.45, 0.45], k=3) == Ok(((1, 0.45), (2, 0.45), (0, 0.1)))


def test_top_k_corta_em_k() -> None:
    assert top_k([0.2, 0.5, 0.3], k=1) == Ok(((1, 0.5),))


@pytest.mark.parametrize("k", [0, 4])
def test_k_fora_do_intervalo(k: int) -> None:
    resultado = top_k([0.2, 0.5, 0.3], k=k)
    assert isinstance(resultado, Erro)
    assert resultado.codigo == "k_invalido"
