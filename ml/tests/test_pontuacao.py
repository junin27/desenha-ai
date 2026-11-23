"""Spec pontuacao-e-placar."""

import pytest

from desenha_ml.pontuacao import (
    PartidaNoPlacar,
    limpar_nome,
    ordenar_placar,
    pontos_da_partida,
    pontos_da_rodada,
)
from desenha_ml.resultado import Erro, Ok
from desenha_ml.veredito import Veredito


@pytest.mark.parametrize(
    ("veredito", "segundos_restantes", "pontos"),
    [
        ("ACERTOU", 10.0, 125),
        ("ACERTOU", 0.7, 101),  # piso de 1,75
        ("QUASE", 15.0, 30),
        ("ERROU", 15.0, 0),
        ("ACERTOU", -3.0, 100),
        ("ACERTOU", 25.0, 150),
        ("ACERTOU", 20.0, 150),
    ],
)
def test_pontos_da_rodada(veredito: Veredito, segundos_restantes: float, pontos: int) -> None:
    assert pontos_da_rodada(veredito, segundos_restantes) == pontos


def test_pontos_da_partida_somam_as_rodadas() -> None:
    assert pontos_da_partida([125, 30, 0]) == 155


def test_nome_limpo() -> None:
    assert limpar_nome("  Zé   da  Roça ") == Ok("Zé da Roça")


def test_nome_com_tabulacao_e_espaco_inseparavel() -> None:
    assert limpar_nome("Ana\t Maria") == Ok("Ana Maria")


def test_emoji_conta_como_um_caractere() -> None:
    assert limpar_nome("🤠" * 16) == Ok("🤠" * 16)


@pytest.mark.parametrize("nome", ["", "    ", "a" * 17, "Gilberto Aparecid"])
def test_nome_invalido(nome: str) -> None:
    resultado = limpar_nome(nome)
    assert isinstance(resultado, Erro)
    assert resultado.codigo == "nome_invalido"


def _partida(nome: str, pontos: int, minuto: int) -> PartidaNoPlacar:
    return PartidaNoPlacar(nome=nome, pontos=pontos, terminada_em_ms=minuto * 60_000)


def test_empate_decidido_por_quem_jogou_antes() -> None:
    ana, bia, caio = _partida("Ana", 200, 5), _partida("Bia", 200, 1), _partida("Caio", 250, 10)
    assert ordenar_placar([ana, bia, caio]) == [caio, bia, ana]


def test_placar_mostra_so_as_10_melhores() -> None:
    partidas = [_partida(f"J{i}", i * 10, i) for i in range(12)]
    placar = ordenar_placar(partidas)
    assert len(placar) == 10
    assert placar[0].nome == "J11"
    assert placar[-1].nome == "J2"
