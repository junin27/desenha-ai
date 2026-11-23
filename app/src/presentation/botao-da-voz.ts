import { botao } from "./dom";

/** O que o botão precisa da voz (o `LeitorEmVoz` da aplicação satisfaz). */
export interface ControleDaVoz {
  readonly ligada: boolean;
  readonly disponivel: boolean;
  alternar(): void;
  aoMudar(ouvinte: () => void): () => void;
}

const SEM_VOZ = "Voz pt-BR não instalada";

/**
 * Botão liga/desliga da voz do Zé (spec `voz-do-ze`). Sem voz local em português, fica desativado e
 * diz por quê; quando as vozes terminam de carregar, ele se atualiza sozinho.
 *
 * @example
 * document.body.append(criarBotaoDaVoz(leitorEmVoz));
 */
export function criarBotaoDaVoz(controle: ControleDaVoz): HTMLButtonElement {
  const elemento = botao("", "voz", () => {
    controle.alternar();
  });
  const atualizar = (): void => {
    elemento.disabled = !controle.disponivel;
    elemento.textContent = controle.disponivel
      ? `Voz do Zé: ${controle.ligada ? "ligada" : "desligada"}`
      : SEM_VOZ;
  };
  controle.aoMudar(atualizar);
  atualizar();
  return elemento;
}
