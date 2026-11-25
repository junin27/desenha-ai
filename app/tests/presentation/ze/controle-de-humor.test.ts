import { describe, expect, it } from "vitest";
import {
  ESTADO_INICIAL,
  type EstadoDaPartida,
  type ResultadoDaRodada,
} from "../../../src/application/estado-da-partida";
import { humorDaPartida } from "../../../src/presentation/ze/controle-de-humor";

const CHARADA = { texto: "Tem telhado e porta", origem: "ze" } as const;

function resultado(veredito: ResultadoDaRodada["veredito"]): ResultadoDaRodada {
  return {
    categoria: 0,
    veredito,
    pontos: 0,
    segundosRestantes: 0,
    narracao: "",
    origemDaNarracao: "ze",
    discordanciaDoZe: false,
  };
}

function estado(alteracao: Partial<EstadoDaPartida>): EstadoDaPartida {
  return { ...ESTADO_INICIAL, nome: "Ana", categorias: [0, 1, 2], ...alteracao };
}

describe("Requisito: Quando cada humor aparece (spec personagem-do-ze)", () => {
  it("test_gerando_a_charada_o_ze_fica_pensando", () => {
    expect(humorDaPartida(estado({ etapa: "charada", charada: undefined }), { semTracos: false })).toBe(
      "pensando",
    );
  });

  it("test_charada_pronta_o_ze_fica_neutro", () => {
    expect(humorDaPartida(estado({ etapa: "charada", charada: CHARADA }), { semTracos: false })).toBe(
      "neutro",
    );
  });

  it("test_durante_o_desenho_o_ze_torce", () => {
    expect(humorDaPartida(estado({ etapa: "desenhando", segundosRestantes: 12 }), { semTracos: false })).toBe(
      "torcendo",
    );
  });

  it("test_tempo_acabando_a_5s_o_ze_fica_assustado", () => {
    expect(humorDaPartida(estado({ etapa: "desenhando", segundosRestantes: 5 }), { semTracos: false })).toBe(
      "assustado",
    );
  });

  it("test_julgando_o_ze_pensa_na_narracao", () => {
    expect(humorDaPartida(estado({ etapa: "julgando" }), { semTracos: false })).toBe("pensando");
  });

  it("test_acerto_o_ze_comemora", () => {
    const final = estado({ etapa: "resultado", resultados: [resultado("ACERTOU")] });
    expect(humorDaPartida(final, { semTracos: false })).toBe("comemorando");
  });

  it("test_quase_e_errou_o_ze_coca_a_cabeca", () => {
    for (const veredito of ["QUASE", "ERROU"] as const) {
      const final = estado({ etapa: "resultado", resultados: [resultado(veredito)] });
      expect(humorDaPartida(final, { semTracos: false })).toBe("coçando-a-cabeça");
    }
  });

  it("test_pronto_sem_desenhar_o_ze_fica_bravo", () => {
    const final = estado({ etapa: "resultado", resultados: [resultado("ERROU")] });
    expect(humorDaPartida(final, { semTracos: true })).toBe("bravo");
  });

  it("test_no_inicio_e_no_fim_o_ze_fica_neutro", () => {
    expect(humorDaPartida(estado({ etapa: "inicio" }), { semTracos: false })).toBe("neutro");
    expect(humorDaPartida(estado({ etapa: "fim" }), { semTracos: false })).toBe("neutro");
  });
});
