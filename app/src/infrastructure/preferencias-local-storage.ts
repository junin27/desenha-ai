import type { PreferenciasDoEstande } from "../application/portas";
import type { ArmazenamentoDoNavegador } from "./placar-local-storage";

/** Versão na chave, como no placar: formato novo não quebra a leitura do antigo. */
export const CHAVE_DA_VOZ = "desenha-ai-so:voz:v1";
const LIGADA = "ligada";
const DESLIGADA = "desligada";

/**
 * Preferências do estande no `localStorage` (D3 do design da bancada-do-ze). Guarda uma cópia em
 * memória: se o navegador recusar a gravação, a escolha vale até a página fechar.
 *
 * @example
 * new PreferenciasLocalStorage(window.localStorage).gravarVozLigada(false);
 */
export class PreferenciasLocalStorage implements PreferenciasDoEstande {
  private voz: boolean | undefined;

  constructor(private readonly armazenamento: ArmazenamentoDoNavegador) {
    const valor = armazenamento.getItem(CHAVE_DA_VOZ);
    this.voz = valor === LIGADA ? true : valor === DESLIGADA ? false : undefined;
  }

  vozLigada(): boolean | undefined {
    return this.voz;
  }

  gravarVozLigada(ligada: boolean): void {
    this.voz = ligada;
    try {
      this.armazenamento.setItem(CHAVE_DA_VOZ, ligada ? LIGADA : DESLIGADA);
    } catch (erro) {
      console.warn("Preferência de voz não gravada no navegador; segue só em memória.", erro);
    }
  }
}
