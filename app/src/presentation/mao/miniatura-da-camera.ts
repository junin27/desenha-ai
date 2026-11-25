import type { Gesto } from "../../domain/mao/gestos";
import { criar } from "../dom";
import type { EstadoDaMao } from "./controle-da-mao";

const NOME_DO_GESTO: Readonly<Record<Gesto, string>> = {
  lapis: "Lápis",
  borracha: "Borracha",
  mao_aberta: "Mão aberta",
  nenhum: "Mostre a mão",
};
/** Ligações entre os 21 pontos, para desenhar o "esqueleto" da mão por cima do vídeo. */
const OSSOS: readonly (readonly [number, number])[] = [
  [0, 1], [1, 2], [2, 3], [3, 4], [0, 5], [5, 6], [6, 7], [7, 8], [5, 9], [9, 10], [10, 11], [11, 12],
  [9, 13], [13, 14], [14, 15], [15, 16], [13, 17], [0, 17], [17, 18], [18, 19], [19, 20],
]; // prettier-ignore
const LARGURA = 200;
const ALTURA = 150;

/**
 * Miniatura espelhada da câmera com os pontos da mão, o nome do gesto e o anel do "limpar tudo" (spec
 * `desenho-com-a-mao`, "Miniatura da câmera").
 */
export class MiniaturaDaCamera {
  readonly raiz: HTMLElement;
  private readonly pontos = criar("canvas", { classe: "pontos-da-mao" });
  private readonly gesto = criar("p", { classe: "nome-do-gesto", dados: { texto: "gesto" } });

  constructor(video: HTMLVideoElement) {
    video.classList.add("video-da-camera");
    this.pontos.width = LARGURA;
    this.pontos.height = ALTURA;
    this.raiz = criar("div", { classe: "miniatura-da-camera", dados: { parte: "miniatura" } }, [
      video,
      this.pontos,
      this.gesto,
    ]);
    this.raiz.hidden = true;
    this.mostrar({ gesto: "nenhum", pontos: undefined, fracaoDaLimpeza: 0 });
  }

  mostrar(estado: EstadoDaMao): void {
    this.gesto.textContent = NOME_DO_GESTO[estado.gesto];
    this.raiz.dataset["gesto"] = estado.gesto;
    this.raiz.style.setProperty("--limpeza", String(estado.fracaoDaLimpeza));
    this.desenharPontos(estado);
  }

  private desenharPontos({ pontos }: EstadoDaMao): void {
    const contexto = this.pontos.getContext("2d");
    if (contexto === null) return;
    contexto.clearRect(0, 0, LARGURA, ALTURA);
    if (pontos === undefined) return;
    // espelhado como o vídeo: o visitante se vê como num espelho
    const ponto = (indice: number): [number, number] | undefined => {
      const p = pontos[indice];
      return p === undefined ? undefined : [(1 - p.x) * LARGURA, p.y * ALTURA];
    };
    contexto.strokeStyle = "#f2c14e";
    contexto.lineWidth = 2;
    for (const [a, b] of OSSOS) {
      const pa = ponto(a);
      const pb = ponto(b);
      if (pa === undefined || pb === undefined) continue;
      contexto.beginPath();
      contexto.moveTo(...pa);
      contexto.lineTo(...pb);
      contexto.stroke();
    }
    contexto.fillStyle = "#b5401f";
    for (let i = 0; i < pontos.length; i++) {
      const p = ponto(i);
      if (p === undefined) continue;
      contexto.beginPath();
      contexto.arc(p[0], p[1], i === 8 ? 5 : 3, 0, Math.PI * 2);
      contexto.fill();
    }
  }
}
