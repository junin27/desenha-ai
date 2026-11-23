"""Spec vazamento-da-palavra-secreta."""

import pytest

from desenha_ml.categorias import CATEGORIAS, Categoria
from desenha_ml.vazamento import forma_comparavel, vaza


@pytest.mark.parametrize(
    ("texto", "esperado"),
    [
        ("Chapéu", ["chapeu"]),
        ("CHAPEU", ["chapeu"]),
        ("vaquinha", ["vacinha"]),
        ("aviões", ["aviao"]),
        ("sóis", ["sol"]),
        ("Xícara de café!", ["xicara", "de", "cafe"]),
        ("porquinho-da-índia", ["porcinho", "da", "india"]),
        ("guitarra", ["gitarra"]),
        ("pães e mãos", ["pao", "e", "mao"]),
    ],
)
def test_forma_comparavel(texto: str, esperado: list[str]) -> None:
    assert forma_comparavel(texto) == esperado


@pytest.mark.parametrize(
    ("secreta", "texto"),
    [
        ("vaca", "A vaca malhada dá leite"),
        ("vaca", "Quem é a vaquinha do pasto?"),
        ("avião", "Vários aviões no céu"),
        ("xícara de café", "Serve o cafezinho da tarde"),
        ("sol", "O soldado marchou"),
        ("chapéu", "Todo peão usa CHAPEU"),
    ],
)
def test_ha_vazamento(secreta: str, texto: str) -> None:
    assert vaza(secreta, texto)


@pytest.mark.parametrize(
    ("secreta", "texto"),
    [
        ("vaca", "Malhada, mansa, faz muuu e dá leite"),
        ("trator", "Tem roda grande atrás e puxa a grade na lavoura"),
        ("xícara de café", "De manhã cedo ela esquenta a mão"),
    ],
)
def test_nao_ha_vazamento(secreta: str, texto: str) -> None:
    assert not vaza(secreta, texto)


@pytest.mark.parametrize("categoria", CATEGORIAS, ids=lambda c: c.pt)
def test_plural_de_cada_categoria_vaza(categoria: Categoria) -> None:
    assert vaza(categoria.pt, f"Desenhei {categoria.plural} ontem")


def test_preposicao_da_secreta_e_ignorada() -> None:
    assert not vaza("xícara de café", "um desenho de criança")
