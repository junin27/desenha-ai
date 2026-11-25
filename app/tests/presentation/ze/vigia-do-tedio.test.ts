// @vitest-environment happy-dom
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { TEMPO_DO_TEDIO_MS, VigiaDoTedio } from "../../../src/presentation/ze/vigia-do-tedio";

describe("Requisito: Tédio sem interação (spec personagem-do-ze)", () => {
  let eventos: string[];
  let vigia: VigiaDoTedio;

  beforeEach(() => {
    vi.useFakeTimers();
    eventos = [];
    vigia = new VigiaDoTedio(window, {
      entediar: () => eventos.push("entediou"),
      acordar: () => eventos.push("acordou"),
    });
  });

  afterEach(() => {
    vigia.desligar();
    vi.useRealTimers();
  });

  it("test_tedio_chega_aos_30s_sem_interacao", () => {
    expect(TEMPO_DO_TEDIO_MS).toBe(30_000);
    vi.advanceTimersByTime(29_999);
    expect(eventos).toEqual([]);
    vi.advanceTimersByTime(1);
    expect(eventos).toEqual(["entediou"]);
  });

  it("test_interacao_reinicia_a_contagem", () => {
    vi.advanceTimersByTime(20_000);
    window.dispatchEvent(new Event("pointermove"));
    vi.advanceTimersByTime(20_000);
    expect(eventos).toEqual([]);
  });

  it("test_primeira_interacao_acorda_o_ze", () => {
    vi.advanceTimersByTime(30_000);
    window.dispatchEvent(new Event("pointerdown"));
    expect(eventos).toEqual(["entediou", "acordou"]);
  });

  it("test_na_tela_de_desenho_o_ze_nao_fica_entediado", () => {
    vigia.pausar(true);
    vi.advanceTimersByTime(60_000);
    expect(eventos).toEqual([]);
  });

  it("test_pausar_acorda_quem_estava_entediado", () => {
    vi.advanceTimersByTime(30_000);
    vigia.pausar(true);
    expect(eventos).toEqual(["entediou", "acordou"]);
  });
});
