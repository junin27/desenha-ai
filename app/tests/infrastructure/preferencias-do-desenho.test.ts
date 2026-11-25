import { describe, expect, it } from "vitest";
import { PreferenciasDoDesenhoLocalStorage } from "../../src/infrastructure/preferencias-do-desenho";
import type { ArmazenamentoDoNavegador } from "../../src/infrastructure/placar-local-storage";

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

class ArmazenamentoQueRecusa extends ArmazenamentoEmMemoria {
  override setItem(): void {
    throw new Error("cota cheia");
  }
}

describe("Requisito: Som do desenho e Modo de desenho — preferências (specs lapis-no-quadro e desenho-com-a-mao)", () => {
  it("test_sem_escolha_som_ligado_e_modo_mouse", () => {
    const preferencias = new PreferenciasDoDesenhoLocalStorage(new ArmazenamentoEmMemoria());
    expect(preferencias.somLigado()).toBe(true);
    expect(preferencias.modo()).toBe("mouse");
  });

  it("test_escolhas_lembradas_depois_de_recarregar", () => {
    const armazenamento = new ArmazenamentoEmMemoria();
    const antes = new PreferenciasDoDesenhoLocalStorage(armazenamento);
    antes.gravarSomLigado(false);
    antes.gravarModo("mao");
    const depois = new PreferenciasDoDesenhoLocalStorage(armazenamento);
    expect([depois.somLigado(), depois.modo()]).toEqual([false, "mao"]);
  });

  it("test_valor_estranho_vale_o_padrao", () => {
    const armazenamento = new ArmazenamentoEmMemoria();
    armazenamento.setItem("desenha-ai-so:desenho:v1", "{lixo");
    const preferencias = new PreferenciasDoDesenhoLocalStorage(armazenamento);
    expect([preferencias.somLigado(), preferencias.modo()]).toEqual([true, "mouse"]);
  });

  it("test_navegador_que_recusa_gravar_mantem_em_memoria", () => {
    const preferencias = new PreferenciasDoDesenhoLocalStorage(new ArmazenamentoQueRecusa());
    preferencias.gravarModo("mao");
    expect(preferencias.modo()).toBe("mao");
  });
});
