"""As 30 categorias do jogo: fonte única para o treino, o dataset do SLM, os contratos e o app.

A ordem define o índice da classe nas redes neurais; não reordene sem retreinar.

Exemplo:
    >>> CATEGORIAS[0]
    Categoria(en='cow', pt='vaca', plural='vacas')
"""

from typing import NamedTuple


class Categoria(NamedTuple):
    en: str  # nome do arquivo no Quick, Draw!
    pt: str  # nome no jogo
    plural: str  # usado nos testes de vazamento


CATEGORIAS: tuple[Categoria, ...] = (
    Categoria("cow", "vaca", "vacas"),
    Categoria("horse", "cavalo", "cavalos"),
    Categoria("pig", "porco", "porcos"),
    Categoria("cat", "gato", "gatos"),
    Categoria("dog", "cachorro", "cachorros"),
    Categoria("bird", "passarinho", "passarinhos"),
    Categoria("fish", "peixe", "peixes"),
    Categoria("snake", "cobra", "cobras"),
    Categoria("spider", "aranha", "aranhas"),
    Categoria("butterfly", "borboleta", "borboletas"),
    Categoria("tractor", "trator", "tratores"),
    Categoria("pickup truck", "caminhonete", "caminhonetes"),
    Categoria("barn", "celeiro", "celeiros"),
    Categoria("guitar", "violão", "violões"),
    Categoria("hat", "chapéu", "chapéus"),
    Categoria("sun", "sol", "sóis"),
    Categoria("moon", "lua", "luas"),
    Categoria("cloud", "nuvem", "nuvens"),
    Categoria("lightning", "raio", "raios"),
    Categoria("tree", "árvore", "árvores"),
    Categoria("flower", "flor", "flores"),
    Categoria("banana", "banana", "bananas"),
    Categoria("watermelon", "melancia", "melancias"),
    Categoria("pineapple", "abacaxi", "abacaxis"),
    Categoria("house", "casa", "casas"),
    Categoria("bicycle", "bicicleta", "bicicletas"),
    Categoria("airplane", "avião", "aviões"),
    Categoria("campfire", "fogueira", "fogueiras"),
    Categoria("coffee cup", "xícara de café", "xícaras de café"),
    Categoria("eyeglasses", "óculos", "óculos"),
)
