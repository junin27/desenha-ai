// @vitest-environment happy-dom
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { DURACAO_DA_PINCELADA_MS, TransicaoPorPincelada } from "../../src/presentation/transicao";

beforeEach(() => {
  vi.useFakeTimers();
});

afterEach(() => {
  vi.useRealTimers();
});

describe("Requisito: Transição entre telas (spec identidade-visual)", () => {
  it("test_pincelada_troca_a_tela_quando_cobre_e_termina_em_ate_1_2s", () => {
    expect(DURACAO_DA_PINCELADA_MS).toBeLessThanOrEqual(1200);
    const transicao = new TransicaoPorPincelada(450);
    let trocou = false;
    transicao.trocar(() => (trocou = true));
    expect(transicao.raiz.classList.contains("vai")).toBe(true);
    vi.advanceTimersByTime(449);
    expect(trocou).toBe(false);
    vi.advanceTimersByTime(1);
    expect(trocou).toBe(true);
  });

  it("test_sem_atraso_a_troca_e_imediata", () => {
    const transicao = new TransicaoPorPincelada(0);
    let trocou = false;
    transicao.trocar(() => (trocou = true));
    expect(trocou).toBe(true);
    expect(transicao.raiz.classList.contains("vai")).toBe(false);
  });

  it("test_pincelada_nao_recebe_cliques_porque_fica_por_cima_so_como_desenho", () => {
    const transicao = new TransicaoPorPincelada(450);
    expect(transicao.raiz.classList.contains("pincelada")).toBe(true);
    expect(transicao.raiz.querySelector("svg")?.getAttribute("aria-hidden")).toBe("true");
  });
});
