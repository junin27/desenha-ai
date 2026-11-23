"""Prompt de inferência do Qwen3 e texto de treino (perda só na resposta) — spec modelo-do-ze."""

from desenha_ml.conversa import INSTRUCAO_DE_SISTEMA
from desenha_ml.prompt_qwen import (
    INICIO_DA_RESPOSTA,
    PARADA,
    prompt_de_inferencia,
    texto_de_treino,
)

ENTRADA = "TAREFA: CHARADA\nPalavra secreta: vaca\nNível: fácil"
RESPOSTA = "<pensamento>malhada</pensamento>\n<resposta>Charada: Muuu?</resposta>"


def test_prompt_de_uma_charada() -> None:
    prompt = prompt_de_inferencia(ENTRADA)
    assert prompt.startswith(f"<|im_start|>system\n{INSTRUCAO_DE_SISTEMA}<|im_end|>\n<|im_start|>user\n")
    assert prompt.endswith("Nível: fácil<|im_end|>\n<|im_start|>assistant\n<think>\n\n</think>\n\n")


def test_parada_e_o_fim_de_turno() -> None:
    assert PARADA == "<|im_end|>"


def test_texto_de_treino_comeca_pelo_prompt_e_termina_na_resposta() -> None:
    texto = texto_de_treino(ENTRADA, RESPOSTA)
    assert texto.startswith(prompt_de_inferencia(ENTRADA))
    assert texto.endswith("</resposta><|im_end|>\n")


def test_marcador_do_loss_masking_aparece_uma_vez_antes_da_resposta() -> None:
    texto = texto_de_treino(ENTRADA, RESPOSTA)
    assert INICIO_DA_RESPOSTA == "<|im_start|>assistant\n"
    assert texto.count(INICIO_DA_RESPOSTA) == 1
    # a instrução de sistema também cita a tag; o que importa é o pensamento da resposta
    assert texto.index(INICIO_DA_RESPOSTA) < texto.index("<pensamento>malhada")
