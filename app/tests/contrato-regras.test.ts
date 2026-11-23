import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import type { Resultado } from "../src/domain/resultado";
import { combinar, topK } from "../src/domain/rodada/ensemble";
import type { ErroDeRegra } from "../src/domain/rodada/erros";
import {
  limparNome,
  ordenarPlacar,
  pontosDaRodada,
  type PartidaNoPlacar,
} from "../src/domain/rodada/pontuacao";
import { formaComparavel, vaza } from "../src/domain/rodada/vazamento";
import { deveEncerrarAntes, veredito, type Veredito } from "../src/domain/rodada/veredito";

// Contrato gerado por `desenha_ml.contratos_regras` (o Python é a referência).
type ResultadoNoContrato<T> = { ok: true; valor: T } | { ok: false; codigo: string };

interface ContratoDeRegras {
  ensemble: { p_cnn: number[]; p_lstm: number[]; w_cnn: number; resultado: ResultadoNoContrato<number[]> }[];
  top_k: { probabilidades: number[]; k: number; resultado: ResultadoNoContrato<[number, number][]> }[];
  veredito: { alvo: number; probabilidades: number[]; resultado: ResultadoNoContrato<Veredito> }[];
  vitoria_antecipada: {
    alvo: number;
    probabilidades: number[];
    segundos_decorridos: number;
    resultado: ResultadoNoContrato<boolean>;
  }[];
  pontos_da_rodada: { veredito: Veredito; segundos_restantes: number; pontos: number }[];
  nome: { entrada: string; resultado: ResultadoNoContrato<string> }[];
  placar: { partidas: { nome: string; pontos: number; terminada_em_ms: number }[]; ordem: string[] }[];
  forma_comparavel: { texto: string; palavras: string[] }[];
  vazamento: { secreta: string; texto: string; vaza: boolean }[];
}

const TOLERANCIA_DO_ENSEMBLE = 1e-12;

const contrato = JSON.parse(
  readFileSync(resolve(import.meta.dirname, "..", "..", "contratos", "regras.json"), "utf8"),
) as ContratoDeRegras;

function noFormatoDoContrato<T>(resultado: Resultado<T, ErroDeRegra>): ResultadoNoContrato<T> {
  return resultado.ok ? { ok: true, valor: resultado.valor } : { ok: false, codigo: resultado.erro.codigo };
}

describe("contrato de regras (Python → TypeScript)", () => {
  it("ensemble: mesmos valores (até 1e-12) e mesmos erros", () => {
    for (const caso of contrato.ensemble) {
      const obtido = noFormatoDoContrato(combinar(caso.p_cnn, caso.p_lstm, caso.w_cnn));
      if (!caso.resultado.ok || !obtido.ok) {
        expect(obtido).toEqual(caso.resultado);
        continue;
      }
      const esperado = caso.resultado.valor;
      obtido.valor.forEach((p, i) => {
        expect(Math.abs(p - (esperado[i] ?? Number.NaN))).toBeLessThanOrEqual(TOLERANCIA_DO_ENSEMBLE);
      });
    }
  });

  it("top-k, veredito e vitória antecipada: resultados idênticos", () => {
    for (const c of contrato.top_k)
      expect(noFormatoDoContrato(topK(c.probabilidades, c.k))).toEqual(c.resultado);
    for (const c of contrato.veredito) {
      expect(noFormatoDoContrato(veredito(c.alvo, c.probabilidades))).toEqual(c.resultado);
    }
    for (const c of contrato.vitoria_antecipada) {
      const obtido = deveEncerrarAntes(c.alvo, c.probabilidades, c.segundos_decorridos);
      expect(noFormatoDoContrato(obtido)).toEqual(c.resultado);
    }
  });

  it("pontos, nome e placar: resultados idênticos", () => {
    for (const c of contrato.pontos_da_rodada) {
      expect(pontosDaRodada(c.veredito, c.segundos_restantes)).toBe(c.pontos);
    }
    for (const c of contrato.nome) expect(noFormatoDoContrato(limparNome(c.entrada))).toEqual(c.resultado);
    for (const c of contrato.placar) {
      const partidas: PartidaNoPlacar[] = c.partidas.map((p) => ({
        nome: p.nome,
        pontos: p.pontos,
        terminadaEmMs: p.terminada_em_ms,
      }));
      expect(ordenarPlacar(partidas).map((p) => p.nome)).toEqual(c.ordem);
    }
  });

  it("forma comparável e vazamento: resultados idênticos", () => {
    for (const c of contrato.forma_comparavel) expect(formaComparavel(c.texto)).toEqual(c.palavras);
    for (const c of contrato.vazamento)
      expect(vaza(c.secreta, c.texto), `${c.secreta} / ${c.texto}`).toBe(c.vaza);
  });

  it("cobre o plural das 30 categorias", () => {
    expect(contrato.vazamento.filter((c) => c.texto.startsWith("Desenhei ")).length).toBe(30);
  });
});
