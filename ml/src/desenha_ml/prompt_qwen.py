"""Prompt de inferência do Qwen3 e texto de treino do Zé (spec modelo-do-ze).

Montado à mão (sem `apply_chat_template`) para ser idêntico no treino (Unsloth), na avaliação e no jogo
(`app/src/domain/ze/prompt.ts`, que envia o texto ao llama-server). O bloco `<think>` vazio desliga o thinking
mode nativo do Qwen3: o raciocínio do Zé fica nas tags `<pensamento>`, curtas e controladas (latência em CPU).

Exemplo:
    >>> prompt_de_inferencia("TAREFA: PERGUNTA\\nVisitante: oi?").endswith("<think>\\n\\n</think>\\n\\n")
    True
"""

from desenha_ml.conversa import INSTRUCAO_DE_SISTEMA

PARADA = "<|im_end|>"
INICIO_DA_RESPOSTA = "<|im_start|>assistant\n"  # o loss masking começa depois deste marcador
PENSAMENTO_NATIVO_DESLIGADO = "<think>\n\n</think>\n\n"


def prompt_de_inferencia(entrada: str, instrucao: str = INSTRUCAO_DE_SISTEMA) -> str:
    return (
        f"<|im_start|>system\n{instrucao}{PARADA}\n"
        f"<|im_start|>user\n{entrada}{PARADA}\n"
        f"{INICIO_DA_RESPOSTA}{PENSAMENTO_NATIVO_DESLIGADO}"
    )


def texto_de_treino(entrada: str, resposta: str, instrucao: str = INSTRUCAO_DE_SISTEMA) -> str:
    """Prompt + resposta do Teacher + fim de turno: o que o Student aprende a completar."""
    return f"{prompt_de_inferencia(entrada, instrucao)}{resposta}{PARADA}\n"
