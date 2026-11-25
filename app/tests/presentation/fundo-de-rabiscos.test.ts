// @vitest-environment happy-dom
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { FundoDeRabiscos, MAXIMO_DE_RABISCOS } from "../../src/presentation/fundo-de-rabiscos";

let fundo: FundoDeRabiscos;

beforeEach(() => {
  vi.useFakeTimers();
  fundo = new FundoDeRabiscos();
  document.body.append(fundo.raiz);
});

afterEach(() => {
  fundo.parar();
  vi.useRealTimers();
});

describe("Requisito: Estilo de traço — fundo (spec identidade-visual)", () => {
  it("test_rabiscos_aparecem_e_nunca_passam_de_6_ao_mesmo_tempo", () => {
    fundo.comecar();
    let maximo = 0;
    for (let passo = 0; passo < 60; passo++) {
      vi.advanceTimersByTime(500);
      maximo = Math.max(maximo, fundo.raiz.querySelectorAll("path").length);
    }
    expect(maximo).toBeGreaterThan(0);
    expect(maximo).toBeLessThanOrEqual(MAXIMO_DE_RABISCOS);
    expect(MAXIMO_DE_RABISCOS).toBe(6);
  });

  it("test_fundo_nao_recebe_cliques", () => {
    expect(fundo.raiz.getAttribute("aria-hidden")).toBe("true");
    expect(fundo.raiz.classList.contains("fundo-de-rabiscos")).toBe(true);
  });

  it("test_parar_remove_os_rabiscos", () => {
    fundo.comecar();
    vi.advanceTimersByTime(3000);
    fundo.parar();
    expect(fundo.raiz.querySelectorAll("path").length).toBe(0);
  });
});
