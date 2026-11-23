"""Requisitos "Veredito" e "Vitória antecipada" — spec julgamento-do-desenho."""

import pytest

from desenha_ml.resultado import Erro, Ok
from desenha_ml.veredito import deve_encerrar_antes, veredito


def test_acertou() -> None:
    assert veredito(alvo=2, probabilidades=[0.1, 0.3, 0.6]) == Ok("ACERTOU")


def test_quase() -> None:
    assert veredito(alvo=0, probabilidades=[0.25, 0.45, 0.3]) == Ok("QUASE")


def test_errou() -> None:
    assert veredito(alvo=0, probabilidades=[0.05, 0.5, 0.3, 0.15]) == Ok("ERROU")


def test_empate_no_primeiro_lugar_favorece_o_menor_indice() -> None:
    assert veredito(alvo=2, probabilidades=[0.1, 0.45, 0.45]) == Ok("QUASE")


@pytest.mark.parametrize("alvo", [-1, 3])
def test_alvo_invalido(alvo: int) -> None:
    resultado = veredito(alvo=alvo, probabilidades=[0.2, 0.5, 0.3])
    assert isinstance(resultado, Erro)
    assert resultado.codigo == "alvo_invalido"


def test_vitoria_antecipada_quando_reconhece_cedo_com_confianca() -> None:
    assert deve_encerrar_antes(alvo=0, probabilidades=[0.85, 0.15], segundos_decorridos=6.0) == Ok(True)


def test_continua_com_confianca_insuficiente() -> None:
    assert deve_encerrar_antes(alvo=0, probabilidades=[0.79, 0.21], segundos_decorridos=10.0) == Ok(False)


def test_continua_quando_e_cedo_demais() -> None:
    assert deve_encerrar_antes(alvo=0, probabilidades=[0.95, 0.05], segundos_decorridos=1.5) == Ok(False)


def test_limites_exatos_encerram() -> None:
    assert deve_encerrar_antes(alvo=1, probabilidades=[0.2, 0.8], segundos_decorridos=2.0) == Ok(True)


def test_continua_quando_o_primeiro_palpite_e_outro() -> None:
    assert deve_encerrar_antes(alvo=1, probabilidades=[0.9, 0.1], segundos_decorridos=8.0) == Ok(False)
