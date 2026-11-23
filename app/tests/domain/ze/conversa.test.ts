import { describe, expect, it } from "vitest";
import {
  INSTRUCAO_DE_SISTEMA,
  entradaCharada,
  entradaPergunta,
  entradaVeredito,
  lerCharada,
  lerFala,
  lerParcial,
  lerVeredito,
  porcentagem,
} from "../../../src/domain/ze/conversa";

describe("Requisito: Instrução de sistema fixa", () => {
  it("começa pela persona do Zé", () => {
    expect(INSTRUCAO_DE_SISTEMA.startsWith("Você é o Zé do Rabisco, locutor de rodeio goiano")).toBe(true);
  });
});

describe("Requisitos: Entradas das tarefas", () => {
  it("charada fácil de vaca", () => {
    expect(entradaCharada("vaca", "fácil")).toEqual({
      ok: true,
      valor: "TAREFA: CHARADA\nPalavra secreta: vaca\nNível: fácil",
    });
  });

  it("nível inválido", () => {
    const resultado = entradaCharada("vaca", "facil");
    expect(resultado.ok ? null : resultado.erro.codigo).toBe("nivel_invalido");
  });

  it.each([
    [0.345, 35],
    [0.625, 63],
    [0.995, 100],
  ])("porcentagem(%s) = %s", (p, esperado) => {
    expect(porcentagem(p)).toBe(esperado);
  });

  it("veredito com arredondamento meio para cima", () => {
    const top = [
      ["vaca", 0.625],
      ["cavalo", 0.2],
    ] as const;
    const texto = entradaVeredito("vaca", 0.345, top, top, top);
    expect(texto).toContain("Desenho concluído: 35%");
    expect(texto).toContain("Ensemble: vaca 63%, cavalo 20%");
  });

  it("pergunta limpa e pergunta inválida", () => {
    expect(entradaPergunta("  Como a IA   sabe? ")).toEqual({
      ok: true,
      valor: "TAREFA: PERGUNTA\nVisitante: Como a IA sabe?",
    });
    const vazia = entradaPergunta("   ");
    expect(vazia.ok ? null : vazia.erro.codigo).toBe("pergunta_invalida");
  });
});

describe("Requisitos: Leitura da fala", () => {
  it("fala válida", () => {
    expect(lerFala("<pensamento> pensei </pensamento>\n<resposta>Charada: Muuu?</resposta>")).toEqual({
      ok: true,
      valor: { pensamento: "pensei", resposta: "Charada: Muuu?" },
    });
  });

  it("texto fora das tags é inválido", () => {
    const resultado = lerFala("Olá! <pensamento>x</pensamento><resposta>y</resposta>");
    expect(resultado.ok ? null : resultado.erro.codigo).toBe("formato_invalido");
  });

  it("veredito lido e charada sem prefixo", () => {
    expect(lerVeredito("VEREDITO: QUASE\nNARRAÇÃO: Ô trem, quase!")).toEqual({
      ok: true,
      valor: ["QUASE", "Ô trem, quase!"],
    });
    const charada = lerCharada("Muuu, quem sou eu?");
    expect(charada.ok ? null : charada.erro.codigo).toBe("formato_invalido");
  });
});

describe("Requisito: Leitura progressiva durante o streaming", () => {
  it("no meio do pensamento", () => {
    expect(lerParcial("<pensamento>A vaca tem malh")).toEqual({
      etapa: "pensando",
      pensamento: "A vaca tem malh",
      resposta: "",
    });
  });

  it("pedaço de tag no fim", () => {
    expect(lerParcial("<pensamento>ok</pensamento><resp")).toEqual({
      etapa: "respondendo",
      pensamento: "ok",
      resposta: "",
    });
  });
});
