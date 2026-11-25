// @vitest-environment happy-dom
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { Gesto } from "../../../src/domain/mao/gestos";
import { MiniaturaDaCamera } from "../../../src/presentation/mao/miniatura-da-camera";
import { maoSintetica } from "../../domain/mao/mao-sintetica";

// Spec `desenho-com-a-mao`, "Miniatura da câmera": vídeo espelhado, pontos da mão por cima, nome do gesto
// e anel do "limpar tudo".
const LARGURA = 200; // a miniatura desenha num canvas de 200 × 150
const INDICE_DA_PONTA_DO_INDICADOR = 8;

/** Registra o que a miniatura desenhou no canvas dos pontos (o happy-dom não tem canvas 2D). */
class ContextoEspiao {
  readonly circulos: [number, number][] = [];
  readonly linhas: number[] = [];
  strokeStyle = "";
  fillStyle = "";
  lineWidth = 0;
  clearRect(): void {}
  beginPath(): void {}
  stroke(): void {}
  fill(): void {}
  moveTo(): void {}
  lineTo(): void {
    this.linhas.push(1);
  }
  arc(x: number, y: number): void {
    this.circulos.push([x, y]);
  }
}

let contexto: ContextoEspiao;

beforeEach(() => {
  contexto = new ContextoEspiao();
  vi.spyOn(HTMLCanvasElement.prototype, "getContext").mockReturnValue(
    contexto as unknown as CanvasRenderingContext2D,
  );
});

afterEach(() => {
  vi.restoreAllMocks();
});

function criar(): MiniaturaDaCamera {
  return new MiniaturaDaCamera(document.createElement("video"));
}

describe("Requisito: Miniatura da câmera (spec desenho-com-a-mao)", () => {
  it("test_nasce_escondida_com_o_video_dentro_para_o_css_espelhar", () => {
    const miniatura = criar();
    expect(miniatura.raiz.hidden).toBe(true);
    expect(miniatura.raiz.querySelector("video.video-da-camera")).not.toBeNull();
  });

  it.each<[Gesto, string]>([
    ["lapis", "Lápis"],
    ["borracha", "Borracha"],
    ["mao_aberta", "Mão aberta"],
    ["nenhum", "Mostre a mão"],
  ])("test_mostra_o_nome_do_gesto_%s", (gesto, nome) => {
    const miniatura = criar();
    miniatura.mostrar({ gesto, pontos: undefined, fracaoDaLimpeza: 0 });
    expect(miniatura.raiz.querySelector("[data-texto=gesto]")?.textContent).toBe(nome);
    expect(miniatura.raiz.dataset["gesto"]).toBe(gesto);
  });

  it("test_desenha_os_21_pontos_da_mao_e_os_ossos", () => {
    const miniatura = criar();
    miniatura.mostrar({ gesto: "lapis", pontos: maoSintetica(["indicador"]), fracaoDaLimpeza: 0 });
    expect(contexto.circulos).toHaveLength(21);
    expect(contexto.linhas.length).toBeGreaterThanOrEqual(20);
  });

  it("test_pontos_saem_espelhados_como_o_video", () => {
    const pontos = maoSintetica(["indicador"]);
    const x = pontos[INDICE_DA_PONTA_DO_INDICADOR]?.x ?? 0;
    const miniatura = criar();
    miniatura.mostrar({ gesto: "lapis", pontos, fracaoDaLimpeza: 0 });
    const desenhado = contexto.circulos[INDICE_DA_PONTA_DO_INDICADOR]?.[0] ?? 0;
    expect(desenhado).toBeCloseTo((1 - x) * LARGURA, 5);
    expect(desenhado).not.toBeCloseTo(x * LARGURA, 1);
  });

  it("test_sem_mao_nao_desenha_pontos", () => {
    const miniatura = criar();
    miniatura.mostrar({ gesto: "nenhum", pontos: undefined, fracaoDaLimpeza: 0 });
    expect(contexto.circulos).toHaveLength(0);
  });

  it("test_anel_do_limpar_acompanha_a_fracao", () => {
    const miniatura = criar();
    miniatura.mostrar({ gesto: "mao_aberta", pontos: undefined, fracaoDaLimpeza: 0.4 });
    expect(miniatura.raiz.style.getPropertyValue("--limpeza")).toBe("0.4");
  });
});
