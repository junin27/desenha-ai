"""Spec conversa-com-o-ze."""

import pytest

from desenha_ml.conversa import (
    INSTRUCAO_DE_SISTEMA,
    Fala,
    LeituraParcial,
    entrada_charada,
    entrada_pergunta,
    entrada_veredito,
    ler_charada,
    ler_fala,
    ler_parcial,
    ler_veredito,
    porcentagem,
)
from desenha_ml.resultado import Erro, Ok


def test_instrucao_de_sistema_fixa() -> None:
    assert INSTRUCAO_DE_SISTEMA.startswith("Você é o Zé do Rabisco, locutor de rodeio goiano")
    assert "<pensamento>...</pensamento>" in INSTRUCAO_DE_SISTEMA


def test_entrada_da_charada() -> None:
    assert entrada_charada("vaca", "fácil") == Ok("TAREFA: CHARADA\nPalavra secreta: vaca\nNível: fácil")


def test_nivel_invalido() -> None:
    resultado = entrada_charada("vaca", "facil")
    assert isinstance(resultado, Erro) and resultado.codigo == "nivel_invalido"


@pytest.mark.parametrize(("p", "esperado"), [(0.345, 35), (0.625, 63), (0.004, 0), (0.995, 100), (1.0, 100)])
def test_porcentagem_arredonda_meio_para_cima(p: float, esperado: int) -> None:
    assert porcentagem(p) == esperado


def test_entrada_do_veredito() -> None:
    top = [("vaca", 0.625), ("cavalo", 0.2), ("porco", 0.1), ("gato", 0.05), ("cachorro", 0.025)]
    texto = entrada_veredito("vaca", 0.345, cnn=top, lstm=top, ensemble=top)
    assert texto.split("\n") == [
        "TAREFA: VEREDITO",
        "Desafio: vaca",
        "Desenho concluído: 35%",
        "CNN (imagem): vaca 63%, cavalo 20%, porco 10%, gato 5%, cachorro 3%",
        "LSTM (traços): vaca 63%, cavalo 20%, porco 10%, gato 5%, cachorro 3%",
        "Ensemble: vaca 63%, cavalo 20%, porco 10%, gato 5%, cachorro 3%",
    ]


def test_entrada_da_pergunta_limpa_espacos() -> None:
    assert entrada_pergunta("  Como a IA   sabe? ") == Ok("TAREFA: PERGUNTA\nVisitante: Como a IA sabe?")


@pytest.mark.parametrize("pergunta", ["", "   ", "a" * 201])
def test_pergunta_invalida(pergunta: str) -> None:
    resultado = entrada_pergunta(pergunta)
    assert isinstance(resultado, Erro) and resultado.codigo == "pergunta_invalida"


def test_fala_valida() -> None:
    texto = "<pensamento> pensei </pensamento>\n<resposta>Charada: Muuu?</resposta>"
    assert ler_fala(texto) == Ok(Fala(pensamento="pensei", resposta="Charada: Muuu?"))


@pytest.mark.parametrize(
    "texto",
    [
        "Olá! <pensamento>x</pensamento><resposta>y</resposta>",
        "<pensamento>x</pensamento><resposta>y</resposta> tchau",
        "<resposta>y</resposta><pensamento>x</pensamento>",
        "<pensamento>x</pensamento><resposta>y",
        "<pensamento>x</pensamento><pensamento>z</pensamento><resposta>y</resposta>",
        "<pensamento>x</pensamento><resposta>a</resposta><resposta>b</resposta>",
    ],
)
def test_fala_invalida(texto: str) -> None:
    resultado = ler_fala(texto)
    assert isinstance(resultado, Erro) and resultado.codigo == "formato_invalido"


def test_veredito_lido() -> None:
    assert ler_veredito("VEREDITO: QUASE\nNARRAÇÃO: Ô trem, quase!") == Ok(("QUASE", "Ô trem, quase!"))


@pytest.mark.parametrize(
    "resposta", ["VEREDITO: TALVEZ\nNARRAÇÃO: x", "VEREDITO: ACERTOU", "NARRAÇÃO: x\nVEREDITO: ACERTOU"]
)
def test_veredito_fora_do_formato(resposta: str) -> None:
    resultado = ler_veredito(resposta)
    assert isinstance(resultado, Erro) and resultado.codigo == "formato_invalido"


def test_charada_lida() -> None:
    assert ler_charada("Charada: Muuu, quem sou?") == Ok("Muuu, quem sou?")


def test_charada_sem_prefixo() -> None:
    resultado = ler_charada("Muuu, quem sou eu?")
    assert isinstance(resultado, Erro) and resultado.codigo == "formato_invalido"


@pytest.mark.parametrize(
    ("texto", "esperado"),
    [
        ("", LeituraParcial("pensando", "", "")),
        ("<pensa", LeituraParcial("pensando", "", "")),
        ("<pensamento>A vaca tem malh", LeituraParcial("pensando", "A vaca tem malh", "")),
        ("<pensamento>ok</pens", LeituraParcial("pensando", "ok", "")),
        ("<pensamento>ok</pensamento><resp", LeituraParcial("respondendo", "ok", "")),
        (
            "<pensamento>ok</pensamento>\n<resposta>Charada: Mu",
            LeituraParcial("respondendo", "ok", "Charada: Mu"),
        ),
        ("<pensamento> ok </pensamento><resposta> fim </resposta>", LeituraParcial("completa", "ok", "fim")),
        ("<pensamento>a < b</pensamento>", LeituraParcial("respondendo", "a < b", "")),
    ],
)
def test_leitura_progressiva(texto: str, esperado: LeituraParcial) -> None:
    assert ler_parcial(texto) == esperado
