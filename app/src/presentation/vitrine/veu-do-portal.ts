import type { Retangulo } from "../../domain/vitrine/portal";

/** Cor usada quando não dá para ler a do objeto (o marrom da tinta do jogo). */
const COR_DE_RESERVA = "#5c4429";

/**
 * Cor do objeto do portal, lida da tela no centro dele: do quadro do vídeo de fundo (com o recorte do
 * object-fit: cover) ou, sem vídeo, do primeiro elemento com fundo sólido naquele ponto. Assim a cena seguinte
 * nasce da cor que o visitante já está vendo (spec "Transição por portal", cenário "Começa na cor do objeto").
 */
export function corDoObjeto(cena: HTMLElement, objeto: Retangulo): string {
  const [x, y] = [objeto.x + objeto.largura / 2, objeto.y + objeto.altura / 2];
  const video = cena.querySelector("video");
  const doVideo = video === null ? undefined : corNoVideo(video, x, y);
  return doVideo ?? corNoElemento(cena, x, y) ?? COR_DE_RESERVA;
}

function corNoVideo(video: HTMLVideoElement, x: number, y: number): string | undefined {
  if (video.videoWidth === 0) return undefined;
  const escala = Math.max(innerWidth / video.videoWidth, innerHeight / video.videoHeight);
  const origemX = (innerWidth - video.videoWidth * escala) / 2,
    origemY = (innerHeight - video.videoHeight * escala) / 2;
  const tela = document.createElement("canvas");
  tela.width = tela.height = 1;
  const pincel = tela.getContext("2d");
  if (pincel === null) return undefined;
  pincel.drawImage(video, (x - origemX) / escala, (y - origemY) / escala, 1, 1, 0, 0, 1, 1);
  const [r, g, b] = pincel.getImageData(0, 0, 1, 1).data;
  return `rgb(${String(r)}, ${String(g)}, ${String(b)})`;
}

function corNoElemento(cena: HTMLElement, x: number, y: number): string | undefined {
  // só o que é da cena atual: a seguinte já está por cima, ainda sem recorte, no primeiro quadro do zoom
  const daCena = document.elementsFromPoint(x, y).filter((e) => cena.contains(e));
  for (const elemento of daCena) {
    // a raiz <svg> herda fill preto por padrão: só as formas dentro dela têm cor de verdade
    if (elemento instanceof SVGSVGElement) continue;
    const estilo = getComputedStyle(elemento);
    const cor = elemento instanceof SVGElement ? estilo.fill : estilo.backgroundColor;
    if (cor && cor !== "none" && !cor.startsWith("url") && !transparente(cor)) return cor;
  }
  return undefined;
}

function transparente(cor: string): boolean {
  return cor === "transparent" || /rgba\(.*,\s*0\)$/.test(cor);
}

/** Camada na cor do objeto por cima da cena seguinte, que some enquanto a câmera entra. */
export class VeuDoPortal {
  private camada: HTMLDivElement | undefined;

  constructor(private readonly cena: HTMLElement) {}

  mostrar(cor: string, opacidade: number): void {
    if (opacidade <= 0) {
      this.tirar();
      return;
    }
    if (this.camada === undefined) {
      this.camada = document.createElement("div");
      this.camada.className = "veu-do-portal";
      this.cena.append(this.camada);
    }
    this.camada.style.background = cor;
    this.camada.style.opacity = String(opacidade);
  }

  tirar(): void {
    this.camada?.remove();
    this.camada = undefined;
  }
}
