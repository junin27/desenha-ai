"""Métricas verificáveis no teste e critério de aprovação do Zé destilado — spec modelo-do-ze."""

import pytest

from desenha_ml.avaliacao_do_ze import (
    ResumoDoModelo,
    SaidaAvaliada,
    avaliar_criterio_do_ze,
    avaliar_saida,
    resumir,
)
from desenha_ml.contratos_regras import Json
from desenha_ml.teacher import RegistroBruto

FICHA = "- A CNN acertou 91,2% dos desenhos."
PENSAMENTO = "Comparo o desafio com o primeiro palpite do ensemble e aplico a regra do jogo com calma."


def _exemplo(tarefa: str, entrada: str = "TAREFA: ...", **meta: str) -> RegistroBruto:
    metadados: dict[str, Json] = dict(meta)
    return {"lote_id": "teste", "tarefa": tarefa, "entrada": entrada, "meta": metadados, "saida": None}


def _fala(resposta: str) -> str:
    return f"<pensamento>{PENSAMENTO}</pensamento><resposta>{resposta}</resposta>"


def test_saida_fora_do_formato() -> None:
    avaliada = avaliar_saida(_exemplo("CHARADA", palavra="vaca"), "Claro! A charada é: muuu", FICHA)
    assert (avaliada.formato_ok, avaliada.tarefa_ok, avaliada.codigo) == (False, False, "formato_invalido")


def test_veredito_correto() -> None:
    saida = _fala("VEREDITO: QUASE\nNARRAÇÃO: Ô trem, quase!")
    avaliada = avaliar_saida(_exemplo("VEREDITO", regra="QUASE"), saida, FICHA)
    assert (avaliada.formato_ok, avaliada.tarefa_ok) == (True, True)


def test_veredito_errado_tem_formato_mas_nao_cumpre() -> None:
    saida = _fala("VEREDITO: ACERTOU\nNARRAÇÃO: Bão demais!")
    avaliada = avaliar_saida(_exemplo("VEREDITO", regra="QUASE"), saida, FICHA)
    assert (avaliada.formato_ok, avaliada.tarefa_ok, avaliada.codigo) == (True, False, "veredito_errado")


def test_charada_que_vaza() -> None:
    saida = _fala("Charada: Quem é a vaquinha malhada que dá leite no pasto?")
    assert avaliar_saida(_exemplo("CHARADA", palavra="vaca"), saida, FICHA).codigo == "vazou"


def test_pergunta_com_numero_inventado() -> None:
    saida = _fala("Uai, a CNN acerta 97% dos desenhos, sô, é bão demais da conta mesmo.")
    assert avaliar_saida(_exemplo("PERGUNTA"), saida, FICHA).codigo == "numero_alucinado"


def test_pensamento_curto_nao_reprova_a_tarefa() -> None:
    saida = "<pensamento>ok</pensamento><resposta>VEREDITO: QUASE\nNARRAÇÃO: Quase, sô!</resposta>"
    assert avaliar_saida(_exemplo("VEREDITO", regra="QUASE"), saida, FICHA).tarefa_ok


def test_resumo_por_tarefa_e_tokens() -> None:
    saidas = [
        SaidaAvaliada("VEREDITO", formato_ok=True, tarefa_ok=True, codigo=None, tokens=100),
        SaidaAvaliada("VEREDITO", formato_ok=True, tarefa_ok=False, codigo="veredito_errado", tokens=60),
        SaidaAvaliada("CHARADA", formato_ok=False, tarefa_ok=False, codigo="formato_invalido", tokens=20),
    ]
    resumo = resumir(saidas)
    assert resumo.formato == pytest.approx(2 / 3)
    assert resumo.por_tarefa == {"VEREDITO": 0.5, "CHARADA": 0.0}
    assert resumo.tokens_medios == 60.0


def _resumo(formato: float, charada: float, veredito: float, pergunta: float) -> ResumoDoModelo:
    return ResumoDoModelo(formato, {"CHARADA": charada, "VEREDITO": veredito, "PERGUNTA": pergunta}, 80.0)


BASE = _resumo(0.20, 0.1, 0.3, 0.2)


def test_aprovado() -> None:
    criterio = avaliar_criterio_do_ze(_resumo(0.98, 0.90, 0.93, 0.88), BASE, ensaio=False)
    assert criterio.aprovado is True and criterio.motivos == []


def test_reprovado_no_veredito() -> None:
    criterio = avaliar_criterio_do_ze(_resumo(0.98, 0.90, 0.84, 0.88), BASE, ensaio=False)
    assert criterio.aprovado is False
    assert criterio.motivos == ["VEREDITO: 84,0% < 90%"]


def test_reprovado_se_nao_supera_o_base_no_formato() -> None:
    base_bom = _resumo(0.99, 0.1, 0.3, 0.2)
    criterio = avaliar_criterio_do_ze(_resumo(0.98, 0.90, 0.93, 0.88), base_bom, ensaio=False)
    assert criterio.motivos == ["formato: destilado 98,0% não supera o base 99,0%"]


def test_modo_ensaio_nao_aplica_o_criterio() -> None:
    criterio = avaliar_criterio_do_ze(_resumo(0.10, 0.0, 0.0, 0.0), BASE, ensaio=True)
    assert criterio.aprovado is None
    assert criterio.motivos == ["modo ensaio: critério não aplicado"]
