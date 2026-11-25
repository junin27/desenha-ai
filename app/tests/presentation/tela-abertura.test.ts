// @vitest-environment happy-dom
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { TelaAbertura } from "../../src/presentation/telas/tela-abertura";
import { CATEGORIAS } from "../application/montagem";

const semEspera = (): Promise<void> => Promise.resolve();
let jogou: number;

function abertura(acuraciaDoEnsemble?: number): TelaAbertura {
  const informacoes = { nomesDasCategorias: CATEGORIAS, lerPlacar: () => [], acuraciaDoEnsemble };
  return new TelaAbertura(informacoes, () => (jogou += 1), { esperar: semEspera });
}

beforeEach(() => {
  vi.useFakeTimers();
  jogou = 0;
  document.body.innerHTML = "";
});

afterEach(() => {
  vi.useRealTimers();
});

describe("Requisito: Abertura antes da partida (spec tela-de-abertura)", () => {
  it("test_abertura_tem_jogar_agora_e_nao_pede_apelido", () => {
    const tela = abertura(0.947);
    expect(tela.raiz.querySelector("[data-acao=jogar-agora]")).not.toBeNull();
    expect(tela.raiz.querySelector("input")).toBeNull();
    expect(tela.raiz.textContent).toContain("redes neurais");
  });

  it("test_jogar_agora_chama_a_tela_de_apelido", () => {
    const tela = abertura(0.947);
    tela.raiz.querySelector<HTMLButtonElement>("[data-acao=jogar-agora]")?.click();
    expect(jogou).toBe(1);
  });
});

describe("Requisito: Números reais na abertura", () => {
  it("test_metricas_carregadas_mostram_94_7", () => {
    const tela = abertura(0.947);
    tela.mostrar();
    vi.advanceTimersByTime(5000);
    expect(tela.raiz.querySelector("[data-numero=acuracia]")?.textContent).toBe("94,7");
    expect(tela.raiz.querySelector("[data-numero=categorias]")?.textContent).toBe(String(CATEGORIAS.length));
    expect(tela.raiz.querySelector("[data-numero=segundos]")?.textContent).toBe("20");
  });

  it("test_sem_metricas_nao_mostra_percentual", () => {
    const tela = abertura(undefined);
    expect(tela.raiz.querySelector("[data-numero=acuracia]")).toBeNull();
    expect(tela.raiz.textContent).not.toContain("% de acerto");
  });
});

describe("Requisito: Demonstração em loop", () => {
  it("test_demonstracao_desenha_e_muda_os_palpites_em_6s", () => {
    const tela = abertura(0.947);
    tela.mostrar();
    vi.advanceTimersByTime(6000);
    expect(tela.raiz.querySelectorAll("[data-demo=desenho] path").length).toBeGreaterThanOrEqual(2);
    expect(tela.trocasDePalpite).toBeGreaterThanOrEqual(1);
  });

  it("test_demonstracao_para_fora_da_abertura", () => {
    const tela = abertura(0.947);
    tela.mostrar();
    vi.advanceTimersByTime(2000);
    tela.esconder();
    const tracos = tela.raiz.querySelectorAll("[data-demo=desenho] path").length;
    vi.advanceTimersByTime(10_000);
    expect(tela.raiz.querySelectorAll("[data-demo=desenho] path").length).toBe(tracos);
  });
});
