import { describe, expect, it } from "vitest";
import { SorteadorFixo } from "../application/dubles";
import {
  NARRACOES_MODELO,
  RESPOSTA_BLOQUEADA,
  RESPOSTAS_MODELO,
} from "../../src/infrastructure/reserva/narracoes";
import { lerCharadasDeReserva, ReservaDeArquivo } from "../../src/infrastructure/reserva/reserva-de-arquivo";
import type { Veredito } from "../../src/domain/rodada/veredito";

// Spec `partida` ("Charada com reserva" e "Veredito e pontos pela regra") e D6 do design.
const CHARADAS = {
  vaca: ["Malhada e mansa, quem é?", "Dá leite e muge, quem é?", "Pasta no curral, quem é?"],
};
const VEREDITOS: readonly Veredito[] = ["ACERTOU", "QUASE", "ERROU"];

function reserva(posicao = 0): ReservaDeArquivo {
  return new ReservaDeArquivo(CHARADAS, new SorteadorFixo([posicao]));
}

describe("charadas de reserva", () => {
  it("devolve uma charada de reserva da categoria, escolhida pelo sorteador", () => {
    expect(reserva(1).charada("vaca")).toBe("Dá leite e muge, quem é?");
  });

  it("categoria sem charada de reserva ainda devolve um texto para a rodada seguir", () => {
    expect(reserva().charada("trator").length).toBeGreaterThan(0);
  });

  it("le o charadas_reserva.json no formato categoria → lista de charadas", () => {
    expect(lerCharadasDeReserva(CHARADAS)).toEqual({ ok: true, valor: CHARADAS });
  });

  it.each([
    ["uma lista", ["Malhada"]],
    ["categoria com texto em vez de lista", { vaca: "Malhada" }],
    ["lista com número", { vaca: ["Malhada", 3] }],
  ])("recusa o arquivo de charadas fora do formato (%s)", (_, conteudo) => {
    const lido = lerCharadasDeReserva(conteudo);
    expect(lido.ok).toBe(false);
    if (!lido.ok) expect(lido.erro.detalhe).toContain("esperado");
  });
});

describe("narrações-modelo coerentes com o veredito", () => {
  it.each(VEREDITOS)("há 6 narrações-modelo de %s", (veredito) => {
    expect(NARRACOES_MODELO[veredito]).toHaveLength(6);
  });

  it.each(VEREDITOS)("toda narração de %s cita o desafio e não sobra marcador", (veredito) => {
    for (let posicao = 0; posicao < 6; posicao++) {
      const texto = reserva(posicao).narracao(veredito, "vaca", "cavalo");
      expect(texto.toLowerCase()).toContain("vaca");
      expect(texto).not.toMatch(/[{}]/);
    }
  });

  it("narrações de QUASE e ERROU citam o que as redes viram", () => {
    for (const veredito of ["QUASE", "ERROU"] as const) {
      for (let posicao = 0; posicao < 6; posicao++) {
        expect(reserva(posicao).narracao(veredito, "vaca", "cavalo")).toContain("cavalo");
      }
    }
  });

  it("narração de ACERTOU não fala em erro nem em quase, e a de ERROU não comemora acerto", () => {
    const textos = (veredito: Veredito) => NARRACOES_MODELO[veredito].join(" ").toLowerCase();
    expect(textos("ACERTOU")).not.toMatch(/errou|quase|faltou/);
    expect(textos("ERROU")).not.toMatch(/acertou|cravou|cravaram/);
  });

  it("narrações-modelo sem artigo antes do desafio ou do palpite ('o banana', 'o cobra' erravam o gênero)", () => {
    const todas = Object.values(NARRACOES_MODELO).flat();
    const comArtigo = todas.filter((frase) =>
      /\b(o|a|os|as|do|da|no|na|ao|pelo|pela)\s+\{(desafio|palpite)\}/iu.test(frase),
    );
    expect(comArtigo).toEqual([]);
  });

  it("narração de reserva começa cada frase com maiúscula, mesmo quando a frase começa pelo desafio", () => {
    for (const veredito of ["ACERTOU", "QUASE", "ERROU"] as const) {
      for (let posicao = 0; posicao < 6; posicao++) {
        const texto = reserva(posicao).narracao(veredito, "banana", "lua");
        expect(texto).not.toMatch(/(^|[.!?]\s+)\p{Ll}/u);
      }
    }
  });

  it("o sorteador escolhe qual narração-modelo é usada", () => {
    expect(reserva(0).narracao("ACERTOU", "vaca", "vaca")).not.toBe(
      reserva(1).narracao("ACERTOU", "vaca", "vaca"),
    );
  });
});

// Spec `pergunte-ao-ze`, requisitos "Resposta de reserva" e "Bloqueio de perguntas ofensivas".
describe("respostas de reserva do Pergunte ao Zé", () => {
  it("há 6 respostas-modelo, escolhidas pelo sorteador", () => {
    expect(RESPOSTAS_MODELO).toHaveLength(6);
    expect(reserva(2).resposta()).toBe(RESPOSTAS_MODELO[2]);
  });

  it("respostas-modelo não têm marcadores nem as marcas da fala do Zé", () => {
    for (const texto of [...RESPOSTAS_MODELO, RESPOSTA_BLOQUEADA]) {
      expect(texto).not.toMatch(/[{}<>]/);
      expect(texto.length).toBeGreaterThan(20);
    }
  });

  it("a resposta de bloqueio é educada e sempre a mesma", () => {
    expect(reserva(0).respostaBloqueada()).toBe(RESPOSTA_BLOQUEADA);
    expect(reserva(5).respostaBloqueada()).toBe(RESPOSTA_BLOQUEADA);
  });
});
