// @vitest-environment happy-dom
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { Confete, DURACAO_DO_CONFETE_MS } from "../../src/presentation/confete";

/** Pincel falso: conta quantos quadradinhos foram pintados desde a última limpeza total. */
class PincelFalso {
  pintadosDesdeALimpeza = 0;
  fillStyle = "";
  clearRect(): void {
    this.pintadosDesdeALimpeza = 0;
  }
  fillRect(): void {
    this.pintadosDesdeALimpeza += 1;
  }
  save(): void {}
  restore(): void {}
  translate(): void {}
  rotate(): void {}
  scale(): void {}
}

let pincel: PincelFalso;
let confete: Confete;

beforeEach(() => {
  vi.useFakeTimers({ toFake: ["requestAnimationFrame", "performance", "setTimeout"] });
  pincel = new PincelFalso();
  const canvas = document.createElement("canvas");
  confete = new Confete(canvas, () => pincel as unknown as CanvasRenderingContext2D);
});

afterEach(() => {
  vi.useRealTimers();
});

describe("Requisito: Comemoração no acerto (spec veredito-ilustrado)", () => {
  it("test_confete_pinta_e_some_sozinho_em_ate_4s", () => {
    expect(DURACAO_DO_CONFETE_MS).toBeLessThanOrEqual(4000);
    confete.disparar();
    vi.advanceTimersByTime(100);
    expect(pincel.pintadosDesdeALimpeza).toBeGreaterThan(0);
    vi.advanceTimersByTime(4000);
    expect(pincel.pintadosDesdeALimpeza).toBe(0);
    expect(confete.ativo).toBe(false);
  });
});
