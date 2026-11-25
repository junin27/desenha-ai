import type { CameraDoEstande, ErroDaCamera } from "../../application/portas";
import { falha, ok, type Resultado } from "../../domain/resultado";

/** O pedaço de `navigator.mediaDevices` que a câmera usa (os testes passam um falso). */
export interface DispositivosDeMidia {
  getUserMedia(restricoes: MediaStreamConstraints): Promise<MediaStream>;
}

/** Resolução pedida à webcam: pequena de propósito, porque o rastreamento divide a CPU com as redes (D8). */
const LARGURA_DO_VIDEO = 640;
const ALTURA_DO_VIDEO = 480;

/**
 * Webcam do navegador (spec `desenho-com-a-mao`, "Câmera só no modo Mão"). A imagem fica num `<video>` que
 * nunca sai da página nem é gravado. Falta de câmera e permissão negada viram erro esperado.
 *
 * @example
 * const camera = new CameraDoNavegador(navigator.mediaDevices);
 * const ligada = await camera.ligar();
 */
export class CameraDoNavegador implements CameraDoEstande {
  readonly video: HTMLVideoElement;
  private fluxo: MediaStream | undefined;

  constructor(private readonly dispositivos: DispositivosDeMidia | undefined) {
    this.video = document.createElement("video");
    this.video.muted = true;
    this.video.playsInline = true;
  }

  async ligar(): Promise<Resultado<void, ErroDaCamera>> {
    if (this.fluxo !== undefined) return ok(undefined);
    if (this.dispositivos === undefined) {
      return falha({
        codigo: "sem_camera",
        detalhe: "o navegador não oferece câmera (mediaDevices ausente)",
      });
    }
    try {
      this.fluxo = await this.dispositivos.getUserMedia({
        video: { width: LARGURA_DO_VIDEO, height: ALTURA_DO_VIDEO, facingMode: "user" },
        audio: false,
      });
    } catch (erro) {
      return falha(erroDaCamera(erro));
    }
    this.video.srcObject = this.fluxo;
    await this.video.play().catch(() => undefined); // alguns navegadores só tocam depois de visível
    return ok(undefined);
  }

  desligar(): void {
    for (const trilha of this.fluxo?.getTracks() ?? []) trilha.stop();
    this.fluxo = undefined;
    this.video.srcObject = null;
  }
}

function erroDaCamera(erro: unknown): ErroDaCamera {
  const nome = erro instanceof DOMException ? erro.name : "";
  if (nome === "NotAllowedError" || nome === "SecurityError") {
    return { codigo: "permissao_negada", detalhe: `o navegador negou a câmera (${nome})` };
  }
  return { codigo: "sem_camera", detalhe: `câmera indisponível (${nome === "" ? String(erro) : nome})` };
}
