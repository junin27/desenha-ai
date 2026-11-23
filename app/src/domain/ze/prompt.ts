import { INSTRUCAO_DE_SISTEMA } from "./conversa";

/**
 * Prompt de inferência do Qwen3, idêntico ao do treino (`desenha_ml.prompt_qwen`, contrato
 * `contratos/prompt_qwen.json`). O `<think>` vazio desliga o thinking nativo: o raciocínio do Zé fica em
 * `<pensamento>`. O jogo envia este texto ao llama-server e para a geração em `PARADA`.
 *
 * @example
 * promptDeInferencia("TAREFA: PERGUNTA\nVisitante: oi?").endsWith("<think>\n\n</think>\n\n"); // true
 */
export const PARADA = "<|im_end|>";
const INICIO_DA_RESPOSTA = "<|im_start|>assistant\n";
const PENSAMENTO_NATIVO_DESLIGADO = "<think>\n\n</think>\n\n";

export function promptDeInferencia(entrada: string, instrucao = INSTRUCAO_DE_SISTEMA): string {
  return (
    `<|im_start|>system\n${instrucao}${PARADA}\n` +
    `<|im_start|>user\n${entrada}${PARADA}\n` +
    `${INICIO_DA_RESPOSTA}${PENSAMENTO_NATIVO_DESLIGADO}`
  );
}
