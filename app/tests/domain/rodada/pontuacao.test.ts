import { describe, expect, it } from "vitest";
import {
  limparNome,
  ordenarPlacar,
  pontosDaPartida,
  pontosDaRodada,
  type PartidaNoPlacar,
} from "../../../src/domain/rodada/pontuacao";

describe("Requisito: Pontos da rodada", () => {
  it.each([
    ["ACERTOU", 10, 125],
    ["ACERTOU", 0.7, 101],
    ["QUASE", 15, 30],
    ["ERROU", 15, 0],
    ["ACERTOU", -3, 100],
    ["ACERTOU", 25, 150],
    ["ACERTOU", 20, 150],
  ] as const)("%s com %s s restantes vale %s", (veredito, restantes, pontos) => {
    expect(pontosDaRodada(veredito, restantes)).toBe(pontos);
  });
});

describe("Requisito: Pontos da partida", () => {
  it("soma as rodadas", () => {
    expect(pontosDaPartida([125, 30, 0])).toBe(155);
  });
});

describe("Requisito: Nome no placar", () => {
  it("limpa espaços", () => {
    expect(limparNome("  Zé   da  Roça ")).toEqual({ ok: true, valor: "Zé da Roça" });
    expect(limparNome("Ana\t\u00a0Maria")).toEqual({ ok: true, valor: "Ana Maria" });
  });

  it("emoji conta como um caractere", () => {
    expect(limparNome("🤠".repeat(16))).toEqual({ ok: true, valor: "🤠".repeat(16) });
  });

  it.each(["", "    ", "a".repeat(17), "Gilberto Aparecid", "🤠".repeat(17)])("recusa %j", (nome) => {
    const resultado = limparNome(nome);
    expect(resultado.ok ? null : resultado.erro.codigo).toBe("nome_invalido");
  });
});

describe("Requisito: Ordem do placar", () => {
  const partida = (nome: string, pontos: number, minuto: number): PartidaNoPlacar => ({
    nome,
    pontos,
    terminadaEmMs: minuto * 60_000,
  });

  it("empate decidido por quem jogou antes", () => {
    const ana = partida("Ana", 200, 5);
    const bia = partida("Bia", 200, 1);
    const caio = partida("Caio", 250, 10);
    expect(ordenarPlacar([ana, bia, caio])).toEqual([caio, bia, ana]);
  });

  it("mostra só as 10 melhores", () => {
    const placar = ordenarPlacar(Array.from({ length: 12 }, (_, i) => partida(`J${i}`, i * 10, i)));
    expect(placar).toHaveLength(10);
    expect(placar[0]?.nome).toBe("J11");
  });
});
