"""Montagem dos pedidos ao Teacher: charadas, vereditos balanceados e Evol-Instruct das perguntas.

Exemplo:
    >>> sum(len(lote.entradas) for lote in pedidos_de_charada(semente=0))
    180
"""

import random
from collections.abc import Mapping, Sequence
from dataclasses import dataclass

from desenha_ml.categorias import CATEGORIAS
from desenha_ml.contratos_regras import Json
from desenha_ml.conversa import NIVEIS, entrada_charada, entrada_pergunta, entrada_veredito
from desenha_ml.ficha_tecnica import montar_ficha
from desenha_ml.prompts_do_teacher import (
    DESCRICAO_DOS_NIVEIS,
    ESTILOS,
    EVOLUCAO_EM_AMPLITUDE,
    EVOLUCAO_EM_PROFUNDIDADE,
    SEEDS_CHARADA,
    SEEDS_PERGUNTA,
    prompt_de_charada,
    prompt_de_evolucao,
    prompt_de_pergunta,
    prompt_de_veredito,
)
from desenha_ml.resultado import Ok
from desenha_ml.teacher import Lote, Teacher
from desenha_ml.veredito import Veredito, veredito_por_posicoes

__all__ = ["SEEDS_PERGUNTA", "casos_de_veredito", "evoluir_perguntas", "pedidos_de_charada"]

ESTILOS_POR_NIVEL = 2
CASOS_POR_VEREDITO = 80
VEREDITOS: tuple[Veredito, ...] = ("ACERTOU", "QUASE", "ERROU")
CASOS_POR_LOTE_DE_VEREDITO = 6
PERGUNTAS_POR_LOTE = 5
PEDIDOS_POR_LOTE_DE_EVOLUCAO = 8
TEMPERATURA_CRIATIVA, TEMPERATURA_ANALITICA = 0.8, 0.3

Palpites = list[tuple[str, float]]


@dataclass(frozen=True)
class CasoDeVeredito:
    alvo: str
    fracao: float
    cnn: Palpites
    lstm: Palpites
    ensemble: Palpites
    veredito: Veredito
    fonte: str  # "real" (saída das redes) ou "sintetico"


@dataclass(frozen=True)
class Pergunta:
    texto: str
    evolucao: str  # "seed", "in_depth" ou "in_breadth"


# --------------------------------------------------------------------------------------------- charadas
def pedidos_de_charada(semente: int) -> list[Lote]:
    """30 categorias x 3 níveis x 2 estilos sorteados = 180 pedidos, um lote por categoria."""
    sorteio = random.Random(semente)
    return [_lote_de_charada(categoria.pt, sorteio) for categoria in CATEGORIAS]


def _lote_de_charada(palavra: str, sorteio: random.Random) -> Lote:
    pedidos = [(n, e) for n in NIVEIS for e in sorteio.sample(sorted(ESTILOS), ESTILOS_POR_NIVEL)]
    exemplos = "\n".join(f'- palavra "{p}", nível {n}: {c}' for p, n, c in sorteio.sample(SEEDS_CHARADA, 4))
    itens = "\n".join(
        f"{i + 1}. nível {n} ({DESCRICAO_DOS_NIVEIS[n]}), estilo {ESTILOS[e]}"
        for i, (n, e) in enumerate(pedidos)
    )
    entradas = [_valor(entrada_charada(palavra, nivel)) for nivel, _ in pedidos]
    metas: list[dict[str, Json]] = [{"palavra": palavra, "nivel": n, "estilo": e} for n, e in pedidos]
    prompt = prompt_de_charada(palavra, exemplos, itens, len(pedidos))
    return Lote(f"charada_{palavra}", "CHARADA", prompt, TEMPERATURA_CRIATIVA, entradas, metas)


def _valor(resultado: object) -> str:
    if not isinstance(resultado, Ok) or not isinstance(resultado.valor, str):
        raise ValueError(f"entrada inválida gerada internamente: {resultado!r}")
    return resultado.valor


# -------------------------------------------------------------------------------------------- vereditos
def veredito_esperado(alvo: str, ensemble: Sequence[tuple[str, float]]) -> Veredito:
    """A regra da spec julgamento-do-desenho sobre o top do ensemble, já ordenado (D5 do design)."""
    return veredito_por_posicoes(alvo, [nome for nome, _ in ensemble])


def casos_de_veredito(
    predicoes: Sequence[Mapping[str, object]], semente: int, por_veredito: int = CASOS_POR_VEREDITO
) -> list[CasoDeVeredito]:
    """80 casos de cada veredito, reais quando possível; o que faltar é completado com casos sintéticos."""
    sorteio = random.Random(semente)
    reais: dict[Veredito, list[CasoDeVeredito]] = {v: [] for v in VEREDITOS}
    for predicao in predicoes:
        caso = _caso_real(predicao)
        reais[caso.veredito].append(caso)
    casos: list[CasoDeVeredito] = []
    for veredito in VEREDITOS:
        escolhidos = sorteio.sample(reais[veredito], min(por_veredito, len(reais[veredito])))
        faltam = por_veredito - len(escolhidos)
        casos += escolhidos + [_caso_sintetico(veredito, sorteio) for _ in range(faltam)]
    sorteio.shuffle(casos)
    return casos


def _caso_real(predicao: Mapping[str, object]) -> CasoDeVeredito:
    ensemble = _palpites(predicao["ensemble"])
    alvo = str(predicao["alvo"])
    cnn, lstm = _palpites(predicao["cnn"]), _palpites(predicao["lstm"])
    fracao = float(str(predicao["fracao_desenho"]))
    return CasoDeVeredito(alvo, fracao, cnn, lstm, ensemble, veredito_esperado(alvo, ensemble), "real")


def _palpites(valor: object) -> Palpites:
    if not isinstance(valor, list):
        raise ValueError(f"top-5 inválido: {valor!r}; esperado lista de [nome, probabilidade]")
    return [(str(nome), float(p)) for nome, p in valor]


def _caso_sintetico(veredito: Veredito, sorteio: random.Random) -> CasoDeVeredito:
    alvo, *outros = sorteio.sample([c.pt for c in CATEGORIAS], 6)
    ordem = {"ACERTOU": [alvo, *outros[:4]], "QUASE": [outros[0], alvo, *outros[1:4]], "ERROU": outros[:5]}[
        veredito
    ]
    ensemble = _distribuicao_decrescente(ordem, sorteio)
    cnn, lstm = (_distribuicao_decrescente(sorteio.sample(ordem, 5), sorteio) for _ in range(2))
    fracao = sorteio.choice((0.35, 0.5, 0.7, 1.0))
    return CasoDeVeredito(alvo, fracao, cnn, lstm, ensemble, veredito, "sintetico")


def _distribuicao_decrescente(nomes: Sequence[str], sorteio: random.Random) -> Palpites:
    """Probabilidades estritamente decrescentes (sem empates) que somam menos que 1."""
    pesos = sorted((sorteio.random() ** 2 + 0.01 for _ in nomes), reverse=True)
    total = sum(pesos) * 1.25
    return [
        (nome, round(peso / total, 4) - i * 1e-4)
        for i, (nome, peso) in enumerate(zip(nomes, pesos, strict=True))
    ]


def lotes_de_veredito(
    casos: Sequence[CasoDeVeredito], tamanho: int = CASOS_POR_LOTE_DE_VEREDITO
) -> list[Lote]:
    lotes = []
    for inicio in range(0, len(casos), tamanho):
        grupo = casos[inicio : inicio + tamanho]
        entradas = [entrada_veredito(c.alvo, c.fracao, c.cnn, c.lstm, c.ensemble) for c in grupo]
        texto_dos_casos = "\n\n".join(f"CASO {i + 1}:\n{e}" for i, e in enumerate(entradas))
        metas: list[dict[str, Json]] = [
            {"regra": c.veredito, "fonte": c.fonte, "alvo": c.alvo} for c in grupo
        ]
        lotes.append(Lote(f"veredito_{inicio}", "VEREDITO", prompt_de_veredito(texto_dos_casos),
                          TEMPERATURA_ANALITICA, entradas, metas))  # fmt: skip
    return lotes


# ------------------------------------------------------------------------------------------- perguntas
def evoluir_perguntas(
    teacher: Teacher, geracoes: int, semente: int, ficha: str | None = None
) -> list[Pergunta]:
    """Evol-Instruct: cada pergunta gera uma variação in-depth e uma in-breadth, por `geracoes` gerações."""
    sorteio, ficha_usada = random.Random(semente), ficha or montar_ficha(None)
    perguntas = [Pergunta(texto, "seed") for texto in SEEDS_PERGUNTA]
    geracao_atual = perguntas
    for _ in range(geracoes):
        geracao_atual = _uma_geracao(geracao_atual, teacher, sorteio, ficha_usada)
        perguntas = perguntas + geracao_atual
    return perguntas


def _uma_geracao(
    origem: list[Pergunta], teacher: Teacher, sorteio: random.Random, ficha: str
) -> list[Pergunta]:
    pedidos = [
        (p.texto, tipo, sorteio.choice(instrucoes))
        for p in origem
        for tipo, instrucoes in (
            ("in_depth", EVOLUCAO_EM_PROFUNDIDADE),
            ("in_breadth", EVOLUCAO_EM_AMPLITUDE),
        )
    ]
    novas: list[Pergunta] = []
    for inicio in range(0, len(pedidos), PEDIDOS_POR_LOTE_DE_EVOLUCAO):
        lote = pedidos[inicio : inicio + PEDIDOS_POR_LOTE_DE_EVOLUCAO]
        texto = "\n".join(
            f'{i + 1}. Original: "{o}" → {instrucao}' for i, (o, _, instrucao) in enumerate(lote)
        )
        resposta = teacher.gerar(prompt_de_evolucao(ficha, texto), temperatura=0.9)
        geradas = resposta.get("perguntas", []) if isinstance(resposta, dict) else []
        novas += [
            Pergunta(str(q).strip(), tipo)
            for (_, tipo, _), q in zip(lote, geradas, strict=False)
            if _valida(q)
        ]
    return novas


def _valida(pergunta: object) -> bool:
    return isinstance(pergunta, str) and isinstance(entrada_pergunta(pergunta), Ok)


def lotes_de_pergunta(
    perguntas: Sequence[Pergunta], ficha: str, tamanho: int = PERGUNTAS_POR_LOTE
) -> list[Lote]:
    lotes = []
    for inicio in range(0, len(perguntas), tamanho):
        grupo = perguntas[inicio : inicio + tamanho]
        entradas = [_valor(entrada_pergunta(p.texto)) for p in grupo]
        texto = "\n".join(f"{i + 1}. {p.texto}" for i, p in enumerate(grupo))
        metas: list[dict[str, Json]] = [{"evolucao": p.evolucao, "pergunta": p.texto} for p in grupo]
        lotes.append(Lote(f"pergunta_{inicio}", "PERGUNTA", prompt_de_pergunta(ficha, texto),
                          TEMPERATURA_CRIATIVA, entradas, metas))  # fmt: skip
    return lotes
