// @vitest-environment happy-dom
import { beforeEach, describe, expect, it } from "vitest";
import { CapturaDoDesenho } from "../../src/presentation/captura-do-desenho";
import type { Traco } from "../../src/domain/desenho/desenho";

// Spec `interface-do-jogo`, requisito "Captura do desenho".
interface Aviso {
  readonly tracos: readonly Traco[];
  readonly tracoTerminado: boolean;
}

let canvas: HTMLCanvasElement;
let avisos: Aviso[];
let captura: CapturaDoDesenho;

function ponteiro(tipo: string, x: number, y: number, pointerType = "mouse"): void {
  canvas.dispatchEvent(
    new PointerEvent(tipo, { clientX: x, clientY: y, pointerId: 1, pointerType, bubbles: true }),
  );
}

beforeEach(() => {
  document.body.innerHTML = "";
  canvas = document.createElement("canvas");
  document.body.append(canvas);
  avisos = [];
  captura = new CapturaDoDesenho(canvas, (tracos, tracoTerminado) => avisos.push({ tracos, tracoTerminado }));
});

describe("captura do desenho", () => {
  it("registra cada traço como a sequência de pontos (x, y) do mouse", () => {
    ponteiro("pointerdown", 10, 20);
    ponteiro("pointermove", 30, 40);
    ponteiro("pointerup", 50, 60);
    ponteiro("pointerdown", 5, 5);
    ponteiro("pointerup", 6, 6);
    expect(captura.tracos).toEqual([
      [
        [10, 20],
        [30, 40],
        [50, 60],
      ],
      [
        [5, 5],
        [6, 6],
      ],
    ]);
  });

  it("avisa durante o traço e ao soltar, sempre com o desenho inteiro", () => {
    ponteiro("pointerdown", 10, 20);
    ponteiro("pointermove", 30, 40);
    ponteiro("pointerup", 30, 40);
    expect(avisos.map((a) => a.tracoTerminado)).toEqual([false, false, true]);
    expect(avisos.at(-1)?.tracos).toEqual(captura.tracos);
  });

  it("desenho por toque é capturado como com o mouse, sem rolar a página", () => {
    ponteiro("pointerdown", 10, 20, "touch");
    ponteiro("pointermove", 30, 40, "touch");
    ponteiro("pointerup", 30, 40, "touch");
    expect(captura.tracos).toHaveLength(1);
    expect(canvas.style.touchAction).toBe("none");
  });

  it("caneta também desenha", () => {
    ponteiro("pointerdown", 1, 2, "pen");
    ponteiro("pointerup", 3, 4, "pen");
    expect(captura.tracos).toEqual([
      [
        [1, 2],
        [3, 4],
      ],
    ]);
  });

  it("movimento sem botão pressionado não desenha", () => {
    ponteiro("pointermove", 30, 40);
    expect(captura.tracos).toEqual([]);
    expect(avisos).toEqual([]);
  });

  it("ponteiro que sai do canvas encerra o traço", () => {
    ponteiro("pointerdown", 10, 20);
    ponteiro("pointercancel", 12, 22);
    ponteiro("pointermove", 30, 40);
    expect(captura.tracos).toEqual([[[10, 20]]]);
    expect(avisos.at(-1)?.tracoTerminado).toBe(true);
  });

  it("limpar apaga o desenho", () => {
    ponteiro("pointerdown", 10, 20);
    ponteiro("pointerup", 30, 40);
    captura.limpar();
    expect(captura.tracos).toEqual([]);
  });

  it("desligada, não captura nada", () => {
    captura.desligar();
    ponteiro("pointerdown", 10, 20);
    ponteiro("pointerup", 30, 40);
    expect(captura.tracos).toEqual([]);
  });
});

describe("borracha na captura (spec ferramentas-de-desenho)", () => {
  function desenharDoisTracos(): void {
    ponteiro("pointerdown", 0, 0);
    ponteiro("pointerup", 100, 0);
    ponteiro("pointerdown", 0, 100);
    ponteiro("pointerup", 100, 100);
    avisos = [];
  }

  it("test_borracha_sobre_um_traco_avisa_os_restantes_como_traco_terminado", () => {
    desenharDoisTracos();
    captura.usar("borracha");
    ponteiro("pointerdown", 50, 5);
    ponteiro("pointerup", 50, 5);
    expect(captura.tracos).toEqual([
      [
        [0, 100],
        [100, 100],
      ],
    ]);
    expect(avisos).toEqual([{ tracos: captura.tracos, tracoTerminado: true }]);
  });

  it("test_borracha_longe_dos_tracos_nao_avisa_nada", () => {
    desenharDoisTracos();
    captura.usar("borracha");
    ponteiro("pointerdown", 50, 50);
    ponteiro("pointermove", 60, 50);
    ponteiro("pointerup", 60, 50);
    expect(captura.tracos).toHaveLength(2);
    expect(avisos).toEqual([]);
  });

  it("test_borracha_que_apaga_tudo_avisa_desenho_vazio", () => {
    ponteiro("pointerdown", 0, 0);
    ponteiro("pointerup", 100, 0);
    avisos = [];
    captura.usar("borracha");
    ponteiro("pointerdown", 50, 0);
    expect(avisos).toEqual([{ tracos: [], tracoTerminado: true }]);
  });

  it("test_lapis_volta_a_desenhar_depois_da_borracha", () => {
    captura.usar("borracha");
    captura.usar("lapis");
    ponteiro("pointerdown", 1, 1);
    ponteiro("pointerup", 2, 2);
    expect(captura.tracos).toHaveLength(1);
    expect(captura.ferramenta).toBe("lapis");
  });
});
