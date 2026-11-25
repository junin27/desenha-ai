import { FilesetResolver, HandLandmarker } from "@mediapipe/tasks-vision";
import type { DetectorDeMao, ErroDaCamera } from "../../application/portas";
import type { PontosDaMao } from "../../domain/mao/pontos";
import { falha, ok, type Resultado } from "../../domain/resultado";

/** Pasta (servida pelo próprio jogo) com o wasm do MediaPipe e o modelo da mão: nada vem de fora. */
export const PASTA_DA_MAO = "mao";
const MODELO = "hand_landmarker.task";

/**
 * Detector de mão do MediaPipe Hand Landmarker (D1 do design de `desenho-com-a-mao`): CPU, modo vídeo,
 * uma mão. Lê o quadro atual do `<video>` da câmera e devolve os 21 pontos normalizados.
 *
 * @example
 * const detector = await DetectorMediaPipe.criar(camera.video);
 * if (detector.ok) detector.valor.detectar(performance.now());
 */
export class DetectorMediaPipe implements DetectorDeMao {
  private ultimoInstante = -1;

  private constructor(
    private readonly marcador: HandLandmarker,
    private readonly video: HTMLVideoElement,
  ) {}

  static async criar(video: HTMLVideoElement): Promise<Resultado<DetectorMediaPipe, ErroDaCamera>> {
    try {
      const arquivos = await FilesetResolver.forVisionTasks(PASTA_DA_MAO);
      const marcador = await HandLandmarker.createFromOptions(arquivos, {
        baseOptions: { modelAssetPath: `${PASTA_DA_MAO}/${MODELO}`, delegate: "CPU" },
        runningMode: "VIDEO",
        numHands: 1,
      });
      return ok(new DetectorMediaPipe(marcador, video));
    } catch (erro) {
      return falha({ codigo: "modelo_indisponivel", detalhe: `modelo da mão não carregou: ${String(erro)}` });
    }
  }

  detectar(instanteMs: number): PontosDaMao | undefined {
    // O MediaPipe exige instantes crescentes e um vídeo com quadro pronto.
    if (this.video.readyState < 2 || instanteMs <= this.ultimoInstante) return undefined;
    this.ultimoInstante = instanteMs;
    const resultado = this.marcador.detectForVideo(this.video, instanteMs);
    const mao = resultado.landmarks[0];
    return mao?.map((ponto) => ({ x: ponto.x, y: ponto.y }));
  }
}
