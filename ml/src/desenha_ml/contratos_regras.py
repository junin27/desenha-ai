"""Gera `contratos/regras.json`: casos de referência das regras do jogo para o TypeScript (D6 do design).

Exemplo:
    >>> sorted(gerar_contrato_de_regras())[:3]
    ['constantes', 'ensemble', 'forma_comparavel']
"""

import itertools
import random
from collections.abc import Callable, Sequence
from typing import TypeVar

from desenha_ml import pontuacao, veredito
from desenha_ml.categorias import CATEGORIAS
from desenha_ml.ensemble import combinar, top_k
from desenha_ml.pontuacao import PartidaNoPlacar, limpar_nome, ordenar_placar, pontos_da_rodada
from desenha_ml.resultado import Erro, Ok, Resultado
from desenha_ml.vazamento import forma_comparavel, vaza

Json = None | bool | int | float | str | list["Json"] | dict[str, "Json"]
Caso = dict[str, Json]
T = TypeVar("T")

SEMENTE = 2026
DISTRIBUICOES_ALEATORIAS = 20


def gerar_contrato_de_regras() -> dict[str, Json]:
    sorteio = random.Random(SEMENTE)
    aleatorias = [_distribuicao(sorteio, len(CATEGORIAS)) for _ in range(DISTRIBUICOES_ALEATORIAS)]
    return {
        "versao": 1,
        "constantes": _constantes(),
        "ensemble": _casos_de_ensemble(aleatorias),
        "top_k": _casos_de_top_k(aleatorias),
        "veredito": _casos_de_veredito(aleatorias),
        "vitoria_antecipada": _casos_de_vitoria(),
        "pontos_da_rodada": _casos_de_pontos(),
        "nome": [{"entrada": n, "resultado": _json(limpar_nome(n), str)} for n in _NOMES],
        "placar": _casos_de_placar(),
        "forma_comparavel": [
            {"texto": t, "palavras": list(forma_comparavel(t))} for t in _TEXTOS_COMPARAVEIS
        ],
        "vazamento": _casos_de_vazamento(),
    }


def _json(resultado: Resultado[T], converter: Callable[[T], Json]) -> Json:
    if isinstance(resultado, Erro):
        return {"ok": False, "codigo": resultado.codigo}
    assert isinstance(resultado, Ok)
    return {"ok": True, "valor": converter(resultado.valor)}


def _distribuicao(sorteio: random.Random, tamanho: int) -> list[float]:
    pesos = [sorteio.random() ** 3 for _ in range(tamanho)]  # ao cubo: concentra a massa, como um softmax
    soma = sum(pesos)
    return [p / soma for p in pesos]


def _constantes() -> dict[str, Json]:
    return {
        "probabilidade_de_vitoria_antecipada": veredito.PROBABILIDADE_DE_VITORIA_ANTECIPADA,
        "segundos_minimos_para_vitoria": veredito.SEGUNDOS_MINIMOS_PARA_VITORIA,
        "segundos_da_rodada": pontuacao.SEGUNDOS_DA_RODADA,
        "rodadas_por_partida": pontuacao.RODADAS_POR_PARTIDA,
        "pontos_acertou": pontuacao.PONTOS_ACERTOU,
        "pontos_quase": pontuacao.PONTOS_QUASE,
        "bonus_maximo": pontuacao.BONUS_MAXIMO,
        "tamanho_do_placar": pontuacao.TAMANHO_DO_PLACAR,
        "tamanho_maximo_do_nome": pontuacao.TAMANHO_MAXIMO_DO_NOME,
    }


def _lista(valores: Sequence[float]) -> Json:
    return [float(v) for v in valores]


def _casos_de_ensemble(aleatorias: list[list[float]]) -> list[Json]:
    entradas: list[tuple[list[float], list[float], float]] = [
        ([0.6, 0.4], [0.2, 0.8], 0.75),
        ([1 / 30] * 30, [1 / 29] * 29, 0.5),
        ([0.5, 0.5], [0.5, 0.5], 1.2),
        ([0.7, 0.4], [0.5, 0.5], 0.5),
        *[(a, b, round(0.05 * i, 2)) for i, (a, b) in enumerate(itertools.pairwise(aleatorias))],
    ]
    return [
        {"p_cnn": _lista(a), "p_lstm": _lista(b), "w_cnn": w, "resultado": _json(combinar(a, b, w), _lista)}
        for a, b, w in entradas
    ]


def _palpites(palpites: tuple[tuple[int, float], ...]) -> Json:
    return [[indice, p] for indice, p in palpites]


def _casos_de_top_k(aleatorias: list[list[float]]) -> list[Json]:
    entradas = [
        ([0.1, 0.45, 0.45], 3),
        ([0.2, 0.5, 0.3], 0),
        ([0.2, 0.5, 0.3], 4),
        *[(p, 5) for p in aleatorias],
    ]
    return [
        {"probabilidades": _lista(p), "k": k, "resultado": _json(top_k(p, k), _palpites)} for p, k in entradas
    ]


def _casos_de_veredito(aleatorias: list[list[float]]) -> list[Json]:
    entradas = [
        (2, [0.1, 0.3, 0.6]),
        (0, [0.25, 0.45, 0.3]),
        (0, [0.05, 0.5, 0.3, 0.15]),
        (2, [0.1, 0.45, 0.45]),
        (3, [0.2, 0.5, 0.3]),
        *[(i % len(CATEGORIAS), p) for i, p in enumerate(aleatorias)],
    ]
    return [
        {"alvo": alvo, "probabilidades": _lista(p), "resultado": _json(veredito.veredito(alvo, p), str)}
        for alvo, p in entradas
    ]


def _casos_de_vitoria() -> list[Json]:
    entradas = [
        (0, [0.85, 0.15], 6.0),
        (0, [0.79, 0.21], 10.0),
        (0, [0.95, 0.05], 1.5),
        (1, [0.2, 0.8], 2.0),
        (1, [0.9, 0.1], 8.0),
    ]
    return [
        {
            "alvo": alvo,
            "probabilidades": _lista(p),
            "segundos_decorridos": s,
            "resultado": _json(veredito.deve_encerrar_antes(alvo, p, s), bool),
        }
        for alvo, p, s in entradas
    ]


def _casos_de_pontos() -> list[Json]:
    entradas: list[tuple[veredito.Veredito, float]] = [
        ("ACERTOU", 10.0), ("ACERTOU", 0.7), ("QUASE", 15.0), ("ERROU", 15.0),
        ("ACERTOU", -3.0), ("ACERTOU", 25.0), ("ACERTOU", 20.0), ("ACERTOU", 7.9999),
    ]  # fmt: skip
    return [{"veredito": v, "segundos_restantes": s, "pontos": pontos_da_rodada(v, s)} for v, s in entradas]


_NOMES = [
    "  Zé   da  Roça ",
    "Ana\t\u00a0Maria",
    "🤠" * 16,
    "🤠" * 17,
    "",
    "    ",
    "a" * 17,
    "Gilberto Aparecid",
]


def _casos_de_placar() -> list[Json]:
    def partida(nome: str, pontos: int, minuto: int) -> PartidaNoPlacar:
        return PartidaNoPlacar(nome, pontos, minuto * 60_000)

    cenarios = [
        [partida("Ana", 200, 5), partida("Bia", 200, 1), partida("Caio", 250, 10)],
        [partida(f"J{i}", i * 10, i) for i in range(12)],
    ]
    return [
        {
            "partidas": [
                {"nome": p.nome, "pontos": p.pontos, "terminada_em_ms": p.terminada_em_ms} for p in c
            ],
            "ordem": [p.nome for p in ordenar_placar(c)],
        }
        for c in cenarios
    ]


_TEXTOS_COMPARAVEIS = [
    "Chapéu", "CHAPEU", "vaquinha", "aviões", "sóis", "Xícara de café!", "porquinho-da-índia",
    "guitarra", "pães e mãos", "Ação, coração e pinhão", "Você já viu o pôr do sol?",
]  # fmt: skip

_VAZAMENTOS_DA_SPEC = [
    ("vaca", "A vaca malhada dá leite"),
    ("vaca", "Quem é a vaquinha do pasto?"),
    ("avião", "Vários aviões no céu"),
    ("xícara de café", "Serve o cafezinho da tarde"),
    ("vaca", "Malhada, mansa, faz muuu e dá leite"),
    ("sol", "O soldado marchou"),
    ("xícara de café", "um desenho de criança"),
    ("trator", "Tem roda grande atrás e puxa a grade na lavoura"),
]


def _casos_de_vazamento() -> list[Json]:
    entradas = [*_VAZAMENTOS_DA_SPEC, *[(c.pt, f"Desenhei {c.plural} ontem") for c in CATEGORIAS]]
    return [{"secreta": s, "texto": t, "vaza": vaza(s, t)} for s, t in entradas]
