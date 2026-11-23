// @vitest-environment happy-dom
import { beforeEach, describe, expect, it } from "vitest";
import { CATEGORIAS } from "../application/montagem";
import { ESTADO_INICIAL } from "../../src/application/estado-da-partida";
import { MedicoesDaSessao } from "../../src/application/medicoes-da-sessao";
import type { MetricasDasRedes } from "../../src/application/metricas-do-treino";
import type { ModeloDoZe } from "../../src/application/portas";
import { InterfaceDoJogo } from "../../src/presentation/interface-do-jogo";
import { PainelTecnico } from "../../src/presentation/painel-tecnico";
import { ComandosEspioes } from "./comandos-espioes";

// Spec `painel-tecnico` e chave da spec `comparacao-base-destilado`.
class EscolhaDoNarrador {
  escolhido: ModeloDoZe = "destilado";
  escolher(modelo: ModeloDoZe): void {
    this.escolhido = modelo;
  }
}

const REDES: MetricasDasRedes = {
  redes: [
    { nome: "CNN", acuracia: 0.912, top3: 0.98 },
    { nome: "LSTM", acuracia: 0.85, top3: 0.95 },
    { nome: "Ensemble", acuracia: 0.93, top3: 0.99 },
  ],
  pesoDaCnn: 0.6,
};

let medicoes: MedicoesDaSessao;
let narrador: EscolhaDoNarrador;
let painel: PainelTecnico;

function texto(seletor: string): string {
  return painel.raiz.querySelector(seletor)?.textContent ?? "";
}

function apertarF2(): void {
  document.dispatchEvent(new KeyboardEvent("keydown", { key: "F2" }));
}

beforeEach(() => {
  document.body.innerHTML = "<main></main>";
  medicoes = new MedicoesDaSessao();
  narrador = new EscolhaDoNarrador();
  painel = new PainelTecnico({ medicoes, narrador, metricasDasRedes: REDES, metricasDoSlm: undefined });
  document.body.append(painel.raiz, painel.botao);
  painel.instalarAtalho(document);
});

describe("abrir e fechar os bastidores", () => {
  it("o botão Bastidores e a tecla F2 alternam o painel", () => {
    expect(painel.raiz.hidden).toBe(true);
    painel.botao.click();
    expect(painel.raiz.hidden).toBe(false);
    apertarF2();
    expect(painel.raiz.hidden).toBe(true);
  });

  it("painel durante o desenho: abre sem esconder a tela e o cronômetro segue atualizando", () => {
    const raiz = document.querySelector("main") ?? document.body;
    const semConversa = {
      abrir: () => undefined,
      perguntar: () => Promise.resolve(),
      voltar: () => undefined,
    };
    const informacoes = { nomesDasCategorias: CATEGORIAS, lerPlacar: () => [] };
    const tela = new InterfaceDoJogo(raiz, new ComandosEspioes(), informacoes, semConversa);
    tela.mostrar({ ...ESTADO_INICIAL, etapa: "desenhando", segundosRestantes: 15 });
    apertarF2();
    tela.mostrar({ ...ESTADO_INICIAL, etapa: "desenhando", segundosRestantes: 12 });
    expect(painel.raiz.hidden).toBe(false);
    expect(raiz.querySelector<HTMLElement>("[data-tela=desenho]")?.hidden).toBe(false);
    expect(raiz.querySelector("[data-texto=cronometro]")?.textContent).toBe("12");
  });
});

describe("medições", () => {
  it("depois de um traço mostra os milissegundos da CNN e da LSTM", () => {
    medicoes.registrarRedes({ cnnMs: 3.24, lstmMs: 18.5, totalMs: 23.1 });
    expect(texto("[data-texto=redes]")).toContain("CNN 3,2 ms");
    expect(texto("[data-texto=redes]")).toContain("LSTM 18,5 ms");
  });

  it("fala medida: mostra tokens, tokens/s e o tempo até o 1º token", () => {
    medicoes.registrarFala({
      modelo: "base",
      ateOPrimeiroTokenMs: 850,
      duracaoMs: 8000,
      tokens: 120,
      tokensPorSegundo: 15,
    });
    const fala = texto("[data-texto=ultima-fala]");
    expect(fala).toContain("Qwen3 base");
    expect(fala).toContain("120 tokens");
    expect(fala).toContain("15,0 tokens/s");
    expect(fala).toContain("1º token em 850 ms");
  });

  it("servidor desligado contado: o contador do modelo aparece", () => {
    medicoes.registrarFalha("destilado", "narrador_indisponivel");
    expect(texto("[data-contador=destilado-narrador_indisponivel]")).toBe("1");
  });

  it("mostra a paridade conferida", () => {
    medicoes.registrarParidade({ passou: true, casos: 8, maiorDiferenca: 2e-7 });
    expect(texto("[data-texto=paridade]")).toContain("8 desenhos");
  });
});

describe("chave base × destilado", () => {
  it("troca o narrador e marca a opção escolhida", () => {
    painel.raiz.querySelector<HTMLButtonElement>("[data-acao=modelo-base]")?.click();
    expect(narrador.escolhido).toBe("base");
    expect(painel.raiz.querySelector("[data-acao=modelo-base]")?.getAttribute("aria-pressed")).toBe("true");
  });
});

describe("métricas do treino", () => {
  it("mostra as acurácias das redes", () => {
    expect(texto("[data-texto=metricas-redes]")).toContain("CNN 91,2%");
  });

  it("sem métricas do SLM, a seção mostra — e o resto funciona", () => {
    expect(texto("[data-texto=metricas-slm]")).toBe("—");
    medicoes.registrarRedes({ cnnMs: 1, lstmMs: 2, totalMs: 3 });
    expect(texto("[data-texto=redes]")).toContain("CNN 1,0 ms");
  });
});
