// @vitest-environment happy-dom
import { beforeEach, describe, expect, it } from "vitest";
import {
  ESTADO_INICIAL,
  type EstadoDaPartida,
  type ResultadoDaRodada,
} from "../../src/application/estado-da-partida";
import type { Traco } from "../../src/domain/desenho/desenho";
import { TelaVeredito } from "../../src/presentation/telas/tela-veredito";
import { probabilidadesCom } from "../application/dubles";
import { CATEGORIAS } from "../application/montagem";
import { ComandosEspioes } from "./comandos-espioes";

// CATEGORIAS[0] é "vaca"; o desafio da rodada é a categoria 0.
const semEspera = (): Promise<void> => Promise.resolve();
const TRES_TRACOS: Traco[] = [
  [
    [0, 0],
    [10, 10],
  ],
  [
    [20, 20],
    [30, 30],
  ],
  [
    [40, 40],
    [50, 50],
  ],
];
let comemoracoes: number;
let tela: TelaVeredito;

function resultado(veredito: ResultadoDaRodada["veredito"], pontos: number): ResultadoDaRodada {
  return {
    categoria: 0,
    veredito,
    pontos,
    segundosRestantes: 10,
    narracao: "Ô trem bão!",
    origemDaNarracao: "ze",
    discordanciaDoZe: false,
  };
}

function estado(alteracao: Partial<EstadoDaPartida>): EstadoDaPartida {
  return { ...ESTADO_INICIAL, nome: "Ana", categorias: [0, 1, 2], etapa: "resultado", ...alteracao };
}

function texto(seletor: string): string {
  return tela.raiz.querySelector(seletor)?.textContent ?? "";
}

async function falasTerminadas(): Promise<void> {
  await new Promise((resolver) => setTimeout(resolver, 0));
}

beforeEach(() => {
  comemoracoes = 0;
  tela = new TelaVeredito(
    new ComandosEspioes(),
    { nomesDasCategorias: CATEGORIAS, lerPlacar: () => [] },
    { esperar: semEspera, comemorar: () => (comemoracoes += 1) },
  );
});

describe("Requisito: Desenho do visitante no veredito (spec veredito-ilustrado)", () => {
  it("test_veredito_mostra_os_tracos_que_sobraram_e_o_desafio", () => {
    tela.definirTracos(TRES_TRACOS);
    tela.atualizar(estado({ resultados: [resultado("ACERTOU", 125)] }));
    expect(tela.raiz.querySelector<HTMLElement>("[data-parte=meu-desenho]")?.dataset["tracos"]).toBe("3");
    expect(texto("[data-texto=desafio]")).toBe(`Era: ${CATEGORIAS[0] ?? ""}`);
  });
});

describe("Requisito: Selo do resultado", () => {
  it("test_selo_de_quase_com_pontos_e_total", () => {
    tela.definirTracos(TRES_TRACOS);
    tela.atualizar(estado({ resultados: [resultado("ACERTOU", 125), resultado("QUASE", 30)], rodada: 1 }));
    expect(tela.raiz.querySelector<HTMLElement>("[data-texto=veredito]")?.dataset["veredito"]).toBe("QUASE");
    expect(texto("[data-texto=pontos]")).toContain("+30");
    expect(texto("[data-texto=pontos]")).toContain("155");
  });
});

describe("Requisito: O que cada rede achou", () => {
  it("test_redes_que_discordam_ficam_em_vermelho_e_as_certas_em_verde", () => {
    tela.definirTracos(TRES_TRACOS);
    const certa = probabilidadesCom(0, 0.61);
    const errada = probabilidadesCom(1, 0.52);
    tela.atualizar(
      estado({
        resultados: [resultado("ACERTOU", 125)],
        palpite: { cnn: errada, lstm: certa, ensemble: certa },
      }),
    );
    const redes = [...tela.raiz.querySelectorAll<HTMLElement>("[data-rede]")];
    expect(redes.map((rede) => [rede.dataset["rede"], rede.dataset["acerto"]])).toEqual([
      ["cnn", "errada"],
      ["lstm", "certa"],
      ["ensemble", "certa"],
    ]);
    expect(redes[0]?.textContent).toContain(`${CATEGORIAS[1] ?? ""} 52%`);
    expect(redes[1]?.textContent).toContain("61%");
  });

  it("test_sem_tracos_as_tres_redes_mostram_traco", () => {
    tela.definirTracos([]);
    tela.atualizar(estado({ resultados: [resultado("ERROU", 0)], palpite: undefined }));
    const redes = [...tela.raiz.querySelectorAll<HTMLElement>("[data-rede] .palpite-da-rede")];
    expect(redes.map((rede) => rede.textContent)).toEqual(["—", "—", "—"]);
  });
});

describe("Requisito: Comemoração no acerto", () => {
  it("test_acerto_comemora_uma_vez", () => {
    tela.definirTracos(TRES_TRACOS);
    tela.atualizar(estado({ resultados: [resultado("ACERTOU", 125)] }));
    tela.atualizar(estado({ resultados: [resultado("ACERTOU", 125)] }));
    expect(comemoracoes).toBe(1);
  });

  it("test_errou_nao_comemora", () => {
    tela.definirTracos(TRES_TRACOS);
    tela.atualizar(estado({ resultados: [resultado("ERROU", 0)] }));
    expect(comemoracoes).toBe(0);
  });
});

describe("Requisito: Quando cada humor aparece no veredito (spec personagem-do-ze)", () => {
  it("test_pronto_sem_desenhar_deixa_o_ze_bravo", async () => {
    tela.definirTracos([]);
    tela.atualizar(estado({ resultados: [resultado("ERROU", 0)] }));
    await falasTerminadas();
    expect(tela.raiz.querySelector<SVGElement>(".ze-svg")?.dataset["humor"]).toBe("bravo");
  });

  it("test_acerto_deixa_o_ze_comemorando_depois_da_narracao", async () => {
    tela.definirTracos(TRES_TRACOS);
    tela.atualizar(estado({ resultados: [resultado("ACERTOU", 125)] }));
    await falasTerminadas();
    expect(tela.raiz.querySelector<SVGElement>(".ze-svg")?.dataset["humor"]).toBe("comemorando");
    expect(texto("[data-texto=narracao]")).toBe("Ô trem bão!");
  });
});
