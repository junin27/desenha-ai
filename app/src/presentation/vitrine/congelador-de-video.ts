/** Qualidade do JPEG do quadro parado: o fundo é desfocado pelo zoom, não precisa de mais. */
const QUALIDADE_DO_QUADRO = 0.85;

/** Copia o quadro atual do vídeo para uma imagem; `undefined` se o vídeo ainda não tem quadro. */
export function capturarQuadro(video: HTMLVideoElement): string | undefined {
  if (video.videoWidth === 0 || video.videoHeight === 0) return undefined;
  const tela = document.createElement("canvas");
  tela.width = video.videoWidth;
  tela.height = video.videoHeight;
  const pincel = tela.getContext("2d");
  if (pincel === null) return undefined;
  pincel.drawImage(video, 0, 0);
  return tela.toDataURL("image/jpeg", QUALIDADE_DO_QUADRO);
}

/**
 * Troca o vídeo de fundo de uma cena por uma imagem parada enquanto o portal amplia essa cena. Ampliar o vídeo
 * da roça ~24x derrubava a taxa de quadros (pior quadro de 362 a 545 ms no build) e disparava o corte direto;
 * com a imagem parada, o pior quadro medido foi de 52 ms (D1b do design da change vitrine-viva).
 */
export class CongeladorDeVideo {
  private imagem: HTMLImageElement | undefined;

  constructor(
    private readonly cena: HTMLElement,
    private readonly capturar: (video: HTMLVideoElement) => string | undefined = capturarQuadro,
  ) {}

  congelar(): void {
    const video = this.cena.querySelector("video");
    if (this.imagem !== undefined || video === null) return;
    const quadro = this.capturar(video);
    if (quadro === undefined) return;
    const imagem = document.createElement("img");
    imagem.className = video.className;
    imagem.alt = "";
    imagem.setAttribute("aria-hidden", "true");
    imagem.setAttribute("src", quadro);
    video.after(imagem);
    video.style.visibility = "hidden";
    this.imagem = imagem;
  }

  soltar(): void {
    if (this.imagem === undefined) return;
    this.imagem.remove();
    this.imagem = undefined;
    const video = this.cena.querySelector("video");
    if (video !== null) video.style.visibility = "";
  }
}
