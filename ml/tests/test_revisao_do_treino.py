"""Requisitos "Raciocínio do veredito pela regra" e "Pensamento da charada sem a palavra" (dataset-do-ze)."""

from desenha_ml.revisao_do_treino import (
    abertura_sem_repeticao,
    pensamento_do_veredito,
    pensamento_sem_a_palavra,
    revisar_saida,
)

ENTRADA_CHAPEU = (
    "TAREFA: VEREDITO\nDesafio: chapéu\nDesenho concluído: 50%\n"
    "CNN (imagem): passarinho 50%, chapéu 20%, melancia 10%, sol 5%, gato 1%\n"
    "LSTM (traços): melancia 40%, passarinho 30%, chapéu 10%, sol 5%, gato 1%\n"
    "Ensemble: passarinho 40%, melancia 30%, chapéu 10%, sol 5%, gato 1%"
)
ENTRADA_SEM_O_DESAFIO = ENTRADA_CHAPEU.replace("Desafio: chapéu", "Desafio: violão")
SAIDA_DO_TEACHER = (
    "<pensamento>Texto livre do Teacher sobre o desenho e as redes, com bastante coisa.</pensamento>\n"
    "<resposta>VEREDITO: QUASE\nNARRAÇÃO: Quase, sô!</resposta>"
)


def test_veredito_pela_regra_com_o_desafio_em_terceiro() -> None:
    pensamento = pensamento_do_veredito(ENTRADA_CHAPEU, "QUASE")

    assert pensamento is not None
    assert "O primeiro palpite do Ensemble foi passarinho com 40%" in pensamento
    assert "chapéu está em 3º lugar no Ensemble, dentro do top-3" in pensamento
    assert pensamento.endswith("o veredito é QUASE.")


def test_veredito_pela_regra_com_o_desafio_fora_da_lista() -> None:
    pensamento = pensamento_do_veredito(ENTRADA_SEM_O_DESAFIO, "ERROU")

    assert pensamento is not None
    assert "violão não aparece entre os palpites do Ensemble" in pensamento
    assert pensamento.endswith("o veredito é ERROU.")


def test_veredito_pela_regra_divergente_da_amostra_nao_e_trocado() -> None:
    assert pensamento_do_veredito(ENTRADA_CHAPEU, "ACERTOU") is None


def test_veredito_pela_regra_mantem_a_narracao_do_teacher() -> None:
    revisada, motivos = revisar_saida("VEREDITO", ENTRADA_CHAPEU, {"regra": "QUASE"}, SAIDA_DO_TEACHER)

    assert motivos == ("veredito_pela_regra",)
    assert revisada is not None
    assert "dentro do top-3" in revisada
    assert revisada.endswith("<resposta>VEREDITO: QUASE\nNARRAÇÃO: Quase, sô!</resposta>")


def test_pensamento_da_charada_sem_a_frase_que_cita_a_palavra() -> None:
    pensamento = "A palavra é sol. Vou falar do calor e da luz que aquece o peão na roça bem cedinho."

    assert pensamento_sem_a_palavra(pensamento, "sol") == (
        "Vou falar do calor e da luz que aquece o peão na roça bem cedinho."
    )


def test_pensamento_da_charada_curto_demais_sai_do_treino() -> None:
    assert pensamento_sem_a_palavra("A palavra é sol. Vou falar do calor.", "sol") is None


def test_charada_sem_vazamento_no_pensamento_fica_igual() -> None:
    saida = (
        "<pensamento>Vou falar do calor e da luz que aquece o peão na roça bem cedinho.</pensamento>\n"
        "<resposta>Charada: Esquenta a roça.</resposta>"
    )

    assert revisar_saida("CHARADA", "", {"palavra": "sol"}, saida) == (saida, ())


def test_pergunta_nao_e_revisada() -> None:
    assert revisar_saida("PERGUNTA", "", {}, SAIDA_DO_TEACHER) == (SAIDA_DO_TEACHER, ())


def test_abertura_da_charada_sem_repeticao_no_comeco() -> None:
    assert abertura_sem_repeticao("Charada: O que e, o que e, mastiga o dia inteiro o verde do pasto") == (
        "Charada: O que é, mastiga o dia inteiro o verde do pasto"
    )


def test_abertura_da_charada_sem_repeticao_mantem_pontuacao_e_minuscula() -> None:
    assert abertura_sem_repeticao("Vou usar o classico o que e o que e: folhas e raizes.") == (
        "Vou usar o classico o que é: folhas e raizes."
    )


def test_abertura_da_charada_sem_repeticao_conta_junto_com_a_palavra() -> None:
    saida = (
        "<pensamento>A palavra é sol. Vou falar do calor e da luz que aquece o peão na roça bem cedinho."
        "</pensamento>\n<resposta>Charada: O que é, o que é, esquenta a roça?</resposta>"
    )

    revisada, motivos = revisar_saida("CHARADA", "", {"palavra": "sol"}, saida)

    assert revisada == (
        "<pensamento>Vou falar do calor e da luz que aquece o peão na roça bem cedinho.</pensamento>\n"
        "<resposta>Charada: O que é, esquenta a roça?</resposta>"
    )
    assert motivos == ("charada_sem_repeticao", "charada_sem_palavra")
