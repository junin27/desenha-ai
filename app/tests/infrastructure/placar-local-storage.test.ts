import { describe, expect, it } from "vitest";
import {
  CHAVE_DO_PLACAR,
  PlacarLocalStorage,
  type ArmazenamentoDoNavegador,
} from "../../src/infrastructure/placar-local-storage";

// Spec `placar-local`.
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

/** Simula o navegador em modo privado ou sem espaço: toda gravação falha. */
class ArmazenamentoCheio extends ArmazenamentoEmMemoria {
  override setItem(): void {
    throw new Error("QuotaExceededError");
  }
}

const partida = (nome: string, pontos: number) => ({ nome, pontos, terminadaEmMs: pontos * 1000 });

describe("persistência no navegador", () => {
  it("recarregar a pagina mantém as 5 partidas gravadas", () => {
    const armazenamento = new ArmazenamentoEmMemoria();
    const antes = new PlacarLocalStorage(armazenamento);
    for (const pontos of [10, 50, 30, 165, 0]) antes.gravar(partida(`J${pontos}`, pontos));
    const depois = new PlacarLocalStorage(armazenamento);
    expect(depois.ler()).toEqual(antes.ler());
    expect(depois.ler()).toHaveLength(5);
  });

  it.each([
    ["JSON inválido", "{não é json"],
    ["outro formato", JSON.stringify({ partidas: 3 })],
    ["item sem pontos", JSON.stringify([{ nome: "Ana", terminadaEmMs: 1 }])],
    ["pontos não numéricos", JSON.stringify([{ nome: "Ana", pontos: "10", terminadaEmMs: 1 }])],
  ])("dados corrompidos (%s) começam um placar vazio sem travar", (_, valor) => {
    const armazenamento = new ArmazenamentoEmMemoria();
    armazenamento.setItem(CHAVE_DO_PLACAR, valor);
    const placar = new PlacarLocalStorage(armazenamento);
    expect(placar.ler()).toEqual([]);
    placar.gravar(partida("Ana", 30));
    expect(new PlacarLocalStorage(armazenamento).ler()).toEqual([partida("Ana", 30)]);
  });

  it("navegador sem espaço continua com o placar em memória", () => {
    const placar = new PlacarLocalStorage(new ArmazenamentoCheio());
    placar.gravar(partida("Ana", 30));
    expect(placar.ler()).toEqual([partida("Ana", 30)]);
  });
});

describe("zerar o placar", () => {
  it("placar zerado fica vazio e não mexe em outras chaves", () => {
    const armazenamento = new ArmazenamentoEmMemoria();
    armazenamento.setItem("outra-configuracao", "ligada");
    const placar = new PlacarLocalStorage(armazenamento);
    placar.gravar(partida("Ana", 30));
    placar.zerar();
    expect(placar.ler()).toEqual([]);
    expect(new PlacarLocalStorage(armazenamento).ler()).toEqual([]);
    expect(armazenamento.getItem("outra-configuracao")).toBe("ligada");
  });
});
