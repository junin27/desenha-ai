import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import type { Resultado } from "../src/domain/resultado";
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
  type ErroDeConversa,
  type Palpites,
} from "../src/domain/ze/conversa";

// Contrato gerado por `desenha_ml.contratos_conversa` (o Python é a referência).
type NoContrato<T> = { ok: true; valor: T } | { ok: false; codigo: string };
interface ContratoDaConversa {
  instrucao_de_sistema: string;
  porcentagem: { p: number; valor: number }[];
  entrada_charada: { palavra: string; nivel: string; resultado: NoContrato<string> }[];
  entrada_veredito: {
    alvo: string;
    fracao: number;
    cnn: Palpites;
    lstm: Palpites;
    ensemble: Palpites;
    texto: string;
  }[];
  entrada_pergunta: { pergunta: string; resultado: NoContrato<string> }[];
  ler_fala: { texto: string; resultado: NoContrato<{ pensamento: string; resposta: string }> }[];
  ler_charada: { resposta: string; resultado: NoContrato<string> }[];
  ler_veredito: { resposta: string; resultado: NoContrato<[string, string]> }[];
  ler_parcial: { texto: string; etapa: string; pensamento: string; resposta: string }[];
}

const contrato = JSON.parse(
  readFileSync(resolve(import.meta.dirname, "..", "..", "contratos", "conversa.json"), "utf8"),
) as ContratoDaConversa;

function noContrato<T>(resultado: Resultado<T, ErroDeConversa>): NoContrato<T> {
  return resultado.ok ? { ok: true, valor: resultado.valor } : { ok: false, codigo: resultado.erro.codigo };
}

describe("contrato da conversa (Python → TypeScript)", () => {
  it("instrução de sistema idêntica", () => {
    expect(INSTRUCAO_DE_SISTEMA).toBe(contrato.instrucao_de_sistema);
  });

  it("porcentagens e entradas das três tarefas idênticas", () => {
    for (const c of contrato.porcentagem) expect(porcentagem(c.p), `p = ${c.p}`).toBe(c.valor);
    for (const c of contrato.entrada_charada) {
      expect(noContrato(entradaCharada(c.palavra, c.nivel))).toEqual(c.resultado);
    }
    for (const c of contrato.entrada_veredito) {
      expect(entradaVeredito(c.alvo, c.fracao, c.cnn, c.lstm, c.ensemble)).toBe(c.texto);
    }
    for (const c of contrato.entrada_pergunta)
      expect(noContrato(entradaPergunta(c.pergunta))).toEqual(c.resultado);
  });

  it("leitura da fala, da charada e do veredito idênticas", () => {
    for (const c of contrato.ler_fala) expect(noContrato(lerFala(c.texto)), c.texto).toEqual(c.resultado);
    for (const c of contrato.ler_charada) expect(noContrato(lerCharada(c.resposta))).toEqual(c.resultado);
    for (const c of contrato.ler_veredito) {
      const obtido = noContrato(lerVeredito(c.resposta));
      expect(obtido.ok ? { ok: true, valor: [...obtido.valor] } : obtido).toEqual(c.resultado);
    }
  });

  it(`leitura progressiva idêntica em todos os ${String(contrato.ler_parcial.length)} prefixos`, () => {
    for (const c of contrato.ler_parcial) {
      expect(lerParcial(c.texto), JSON.stringify(c.texto)).toEqual({
        etapa: c.etapa,
        pensamento: c.pensamento,
        resposta: c.resposta,
      });
    }
  });
});
