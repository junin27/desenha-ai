import { describe, expect, it } from "vitest";
import { montarPartida } from "./montagem";

// Spec `partida`: requisitos "Etapas da partida" e "Categorias sorteadas sem repetição".
describe("etapas da partida", () => {
  it("partida completa percorre inicio, 3 vezes (charada, desenhando, julgando, resultado) e fim", async () => {
    const { partida, etapas } = montarPartida();
    await partida.comecar("Ana");
    for (let rodada = 0; rodada < 3; rodada++) {
      partida.desenhar();
      await partida.pronto();
      await partida.proximaRodada();
    }
    const rodada = ["charada", "desenhando", "julgando", "resultado"];
    expect(etapas).toEqual(["inicio", ...rodada, ...rodada, ...rodada, "fim"]);
  });

  it("nome invalido mantém a partida em inicio com o erro nome_invalido", async () => {
    const { partida } = montarPartida();
    await partida.comecar("   ");
    expect(partida.estado.etapa).toBe("inicio");
    expect(partida.estado.erro?.codigo).toBe("nome_invalido");
  });

  it("nome valido é limpo e leva à charada da primeira rodada", async () => {
    const { partida } = montarPartida();
    await partida.comecar("  Zé   da Roça ");
    expect(partida.estado.nome).toBe("Zé da Roça");
    expect(partida.estado.etapa).toBe("charada");
    expect(partida.estado.rodada).toBe(0);
  });

  it("comandos fora da etapa certa são ignorados", async () => {
    const { partida, etapas } = montarPartida();
    partida.desenhar();
    await partida.pronto();
    await partida.proximaRodada();
    expect(etapas).toEqual(["inicio"]);
  });

  it("nova partida volta ao inicio sem nome nem resultados", async () => {
    const { partida } = montarPartida();
    await partida.comecar("Ana");
    partida.novaPartida();
    expect(partida.estado.etapa).toBe("inicio");
    expect(partida.estado.nome).toBe("");
  });
});

describe("categorias sorteadas sem repetição", () => {
  it("tres categorias diferentes, na ordem do sorteador injetado", async () => {
    const { partida } = montarPartida([7, 2, 9, 4]);
    await partida.comecar("Ana");
    expect(partida.estado.categorias).toEqual([7, 2, 9]);
    expect(new Set(partida.estado.categorias).size).toBe(3);
  });
});
