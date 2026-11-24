"""Requisitos "Filtros comuns", "Filtros por tarefa" e "Reparos e desduplicação" da spec dataset-do-ze."""

import pytest

from desenha_ml.contratos_regras import Json
from desenha_ml.curadoria import (
    LIMITE_DE_SEMELHANCA,
    curar,
    jaccard_de_trigramas,
    reparar,
)
from desenha_ml.teacher import RegistroBruto

FICHA = "- A CNN acertou 91,2% dos desenhos. Imagem de 28 por 28 pixels."
PENSAMENTO = (
    "Vaca é malhada, muge, dá leite e vive no pasto; evito a palavra e uso o mugido como pista principal."
)


def _registro(tarefa: str, saida: str | None, **meta: str) -> RegistroBruto:
    metadados: dict[str, Json] = dict(meta)
    return {"lote_id": "l", "tarefa": tarefa, "entrada": "TAREFA: ...", "meta": metadados, "saida": saida}


def _fala(resposta: str, pensamento: str = PENSAMENTO) -> str:
    return f"<pensamento>{pensamento}</pensamento><resposta>{resposta}</resposta>"


def _codigo(registro: RegistroBruto) -> str | None:
    return curar([registro], FICHA).rejeicoes_por_amostra[0]


CHARADA_BOA = "Charada: Malhada e mansa, faz muuu no pasto e dá leite. Quem é?"
VEREDITO_BOM = "VEREDITO: QUASE\nNARRAÇÃO: Ô trem, quase! A LSTM jurou que era cavalo."
PERGUNTA_BOA = "Uai, a CNN olha o desenho como uma foto de 28 por 28 pixels e acerta 91,2% das vezes, sô."


@pytest.mark.parametrize(
    ("registro", "codigo"),
    [
        (_registro("CHARADA", None, palavra="vaca"), "vazia"),
        (_registro("CHARADA", "Olá! " + _fala(CHARADA_BOA), palavra="vaca"), "formato_invalido"),
        (
            _registro("CHARADA", _fala("Charada: Como uma IA, não posso fazer isso."), palavra="vaca"),
            "recusa",
        ),
        (
            _registro("CHARADA", _fala(CHARADA_BOA, pensamento="curto demais aqui"), palavra="vaca"),
            "tamanho_pensamento",
        ),
        (_registro("CHARADA", _fala("Charada: Muuu?"), palavra="vaca"), "tamanho_resposta"),
        (
            _registro(
                "CHARADA", _fala("Charada: Quem é a vaquinha malhada do pasto que dá leite?"), palavra="vaca"
            ),
            "vazou",
        ),
        (
            _registro("CHARADA", _fala("Malhada e mansa, faz muuu no pasto e dá leite."), palavra="vaca"),
            "formato_invalido",
        ),
        (
            _registro("VEREDITO", _fala("VEREDITO: ACERTOU\nNARRAÇÃO: Bão demais!"), regra="QUASE"),
            "veredito_errado",
        ),
        (_registro("VEREDITO", _fala("VEREDITO: QUASE"), regra="QUASE"), "formato_invalido"),
        (
            _registro(
                "PERGUNTA",
                _fala("Uai, a CNN acerta 97% dos desenhos, sô, é bão demais da conta."),
                pergunta="?",
            ),
            "numero_alucinado",
        ),
        (_registro("PERGUNTA", _fala("Curto."), pergunta="?"), "tamanho_resposta"),
    ],
)
def test_cada_codigo_de_rejeicao(registro: RegistroBruto, codigo: str) -> None:
    assert _codigo(registro) == codigo


@pytest.mark.parametrize(
    "registro",
    [
        _registro("CHARADA", _fala(CHARADA_BOA), palavra="vaca"),
        _registro("VEREDITO", _fala(VEREDITO_BOM), regra="QUASE"),
        _registro("PERGUNTA", _fala(PERGUNTA_BOA), pergunta="Como a IA enxerga?"),
    ],
)
def test_amostras_boas_sao_aprovadas(registro: RegistroBruto) -> None:
    resultado = curar([registro], FICHA)
    assert resultado.rejeicoes_por_amostra == [None]
    assert len(resultado.aprovadas) == 1


def test_numero_da_pergunta_e_aceito() -> None:
    fala = _fala("Uai, em 20 segundos dá pra desenhar bastante coisa no jogo, sô, é só caprichar.")
    registro = _registro("PERGUNTA", fala, pergunta="Dá pra desenhar em 20 segundos?")
    registro["entrada"] = "TAREFA: PERGUNTA\nVisitante: Dá pra desenhar em 20 segundos?"
    assert _codigo(registro) is None


def test_reparo_de_markdown_e_emoji() -> None:
    texto, reparos = reparar(
        _fala("**Ô trem bão!** 🤠 Charada: Malhada e mansa, faz muuu no pasto e dá leite.")
    )
    assert "**" not in texto and "🤠" not in texto
    assert reparos == ["markdown", "emoji"]


def test_reparos_sao_contados() -> None:
    fala = _fala("Charada: **Malhada** e mansa, faz muuu no pasto e dá leite. Quem é?")
    resultado = curar([_registro("CHARADA", fala, palavra="vaca")], FICHA)
    assert resultado.reparos == {"markdown": 1}
    saida = resultado.aprovadas[0]["saida"]
    assert saida is not None and "**" not in saida


def test_pensamento_fechado_com_tag_de_resposta_e_reparado() -> None:
    """Achado no Colab (24/11): 50 amostras saíram com `</resposta>` onde devia ser `</pensamento>`."""
    bruto = f"<pensamento>{PENSAMENTO}</resposta><resposta>{CHARADA_BOA}</resposta>"

    texto, reparos = reparar(bruto)

    assert texto == f"<pensamento>{PENSAMENTO}</pensamento><resposta>{CHARADA_BOA}</resposta>"
    assert reparos == ["tags_trocadas"]


def test_tag_de_resposta_duplicada_e_reparada() -> None:
    bruto = (
        f"<pensamento>{PENSAMENTO}</pensamento><resposta><resposta>Charada: Malhada.</resposta></resposta>"
    )

    texto, reparos = reparar(bruto)

    assert texto == _fala("Charada: Malhada.")
    assert reparos == ["tag_duplicada"]


def test_resposta_fechada_antes_do_fim_do_pensamento_e_reparada() -> None:
    bruto = f"<pensamento>{PENSAMENTO}</resposta></pensamento><resposta>Charada: Malhada.</resposta>"

    texto, reparos = reparar(bruto)

    assert texto == _fala("Charada: Malhada.")
    assert reparos == ["tags_trocadas"]


def test_quebra_de_linha_literal_no_veredito_e_reparada() -> None:
    texto, reparos = reparar(
        _fala("VEREDITO: ERROU" + chr(92) + "nNARRAÇÃO: Ô loco, que solzão bonito, uai!")
    )

    assert "VEREDITO: ERROU" + chr(10) + "NARRAÇÃO: Ô loco" in texto
    assert reparos == ["quebra_literal"]


def test_barra_n_fora_do_veredito_nao_e_mexida() -> None:
    texto, reparos = reparar(_fala("Charada: use a barra " + chr(92) + "n para quebrar linha."))

    assert chr(92) + "n" in texto and reparos == []


def test_texto_correto_nao_recebe_reparo_nenhum() -> None:
    assert reparar(_fala("Charada: Malhada e mansa.")) == (_fala("Charada: Malhada e mansa."), [])


def test_resposta_truncada_sem_tag_de_resposta_continua_invalida() -> None:
    truncada = f"<pensamento>{PENSAMENTO}</pensamento>"

    assert reparar(truncada) == (truncada, [])
    assert _codigo(_registro("PERGUNTA", truncada)) == "formato_invalido"


def test_amostra_reparada_e_aprovada_e_o_reparo_entra_na_contagem() -> None:
    bruto = f"<pensamento>{PENSAMENTO}</resposta><resposta>{CHARADA_BOA}</resposta>"

    resultado = curar([_registro("CHARADA", bruto, palavra="vaca")], FICHA)

    assert resultado.rejeicoes_por_amostra == [None]
    assert resultado.reparos == {"tags_trocadas": 1}


def test_jaccard_de_trigramas() -> None:
    assert jaccard_de_trigramas("a b c d", "a b c d") == 1.0
    assert jaccard_de_trigramas("a b c d", "x y z w") == 0.0


def test_quase_duplicata_na_mesma_tarefa_e_rejeitada() -> None:
    primeira = _registro("CHARADA", _fala(CHARADA_BOA), palavra="vaca")
    quase_igual = _registro("CHARADA", _fala(CHARADA_BOA.replace("Quem é?", "Quem será?")), palavra="vaca")
    resultado = curar([primeira, quase_igual], FICHA)
    assert resultado.rejeicoes_por_amostra == [None, "duplicata"]
    assert LIMITE_DE_SEMELHANCA == 0.7
