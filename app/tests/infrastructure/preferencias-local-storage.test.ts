import { describe, expect, it } from "vitest";
import { CHAVE_DA_VOZ, PreferenciasLocalStorage } from "../../src/infrastructure/preferencias-local-storage";
import type { ArmazenamentoDoNavegador } from "../../src/infrastructure/placar-local-storage";

// Spec `voz-do-ze`, requisito "Botão liga/desliga".
class ArmazenamentoEmMemoria implements ArmazenamentoDoNavegador {
  readonly valores = new Map<string, string>();
  getItem(chave: string): string | null {
    return this.valores.get(chave) ?? null;
  }
  setItem(chave: string, valor: string): void {
    this.valores.set(chave, valor);
  }
  removeItem(chave: string): void {
    this.valores.delete(chave);
  }
}

describe("preferência da voz no navegador", () => {
  it("recarregar mantém a escolha: voz desligada continua desligada", () => {
    const armazenamento = new ArmazenamentoEmMemoria();
    new PreferenciasLocalStorage(armazenamento).gravarVozLigada(false);
    expect(new PreferenciasLocalStorage(armazenamento).vozLigada()).toBe(false);
  });

  it("sem escolha gravada, não há preferência (o jogo decide pelo padrão)", () => {
    expect(new PreferenciasLocalStorage(new ArmazenamentoEmMemoria()).vozLigada()).toBeUndefined();
  });

  it("valor estranho na chave vale como sem escolha", () => {
    const armazenamento = new ArmazenamentoEmMemoria();
    armazenamento.setItem(CHAVE_DA_VOZ, "talvez");
    expect(new PreferenciasLocalStorage(armazenamento).vozLigada()).toBeUndefined();
  });

  it("navegador que recusa gravar não trava o jogo", () => {
    const cheio = new ArmazenamentoEmMemoria();
    cheio.setItem = () => {
      throw new Error("QuotaExceededError");
    };
    const preferencias = new PreferenciasLocalStorage(cheio);
    preferencias.gravarVozLigada(true);
    expect(preferencias.vozLigada()).toBe(true);
  });
});
