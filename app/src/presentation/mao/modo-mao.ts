import type { CameraDoEstande, DetectorDeMao, ErroDaCamera } from "../../application/portas";
import type { Resultado } from "../../domain/resultado";
import { ControleDaMao, type QuadroParaAMao } from "./controle-da-mao";
import { MiniaturaDaCamera } from "./miniatura-da-camera";

/** O que o modo Mão precisa de fora (montado no `main.ts` com os adaptadores do navegador). */
export interface DependenciasDaMao {
  readonly camera: CameraDoEstande;
  /** O vídeo da câmera, mostrado espelhado na miniatura. */
  readonly video: HTMLVideoElement;
  /** Carrega o modelo da mão (uma vez só; é pesado). */
  readonly criarDetector: () => Promise<Resultado<DetectorDeMao, ErroDaCamera>>;
}

/** No máximo uma detecção a cada 50 ms (~20 por segundo), para sobrar CPU para as redes e o Zé (D8). */
const INTERVALO_ENTRE_DETECCOES_MS = 50;

/**
 * Liga e desliga o desenho com a mão: câmera, modelo, laço de quadros e miniatura. Qualquer falha vira
 * aviso e quem chamou volta para o Mouse (spec `desenho-com-a-mao`, "Sem câmera, o jogo segue no Mouse").
 */
export class ModoMao {
  readonly miniatura: MiniaturaDaCamera;
  private controle: ControleDaMao | undefined;
  private detector: Promise<Resultado<DetectorDeMao, ErroDaCamera>> | undefined;
  private ligado = false;
  /** Cada ligar/desligar muda a geração: um ligar antigo que termina depois não liga nada. */
  private geracao = 0;
  private ultimaDeteccao = Number.NEGATIVE_INFINITY;

  constructor(
    private readonly quadro: QuadroParaAMao,
    private readonly dependencias: DependenciasDaMao,
    private readonly aoLimpar: () => void,
    private readonly aoFalhar: (erro: ErroDaCamera) => void,
  ) {
    this.miniatura = new MiniaturaDaCamera(dependencias.video);
  }

  async ligar(): Promise<void> {
    if (this.ligado) return;
    this.ligado = true;
    const geracao = ++this.geracao;
    const camera = await this.dependencias.camera.ligar();
    const detector = camera.ok ? await this.carregarDetector() : camera;
    if (geracao !== this.geracao) return; // desligaram enquanto carregava
    if (!detector.ok) {
      this.desligar();
      this.aoFalhar(detector.erro);
      return;
    }
    this.controle = new ControleDaMao(this.quadro, detector.valor, this.aoLimpar);
    this.miniatura.raiz.hidden = false;
    this.agendar();
  }

  desligar(): void {
    this.geracao += 1;
    this.ligado = false;
    this.controle?.parar();
    this.controle = undefined;
    this.dependencias.camera.desligar();
    this.miniatura.raiz.hidden = true;
  }

  private carregarDetector(): Promise<Resultado<DetectorDeMao, ErroDaCamera>> {
    this.detector ??= this.dependencias.criarDetector();
    return this.detector;
  }

  private agendar(): void {
    if (typeof requestAnimationFrame === "undefined") return;
    requestAnimationFrame(this.passo);
  }

  private readonly passo = (agora: number): void => {
    if (!this.ligado || this.controle === undefined) return;
    if (agora - this.ultimaDeteccao >= INTERVALO_ENTRE_DETECCOES_MS) {
      this.ultimaDeteccao = agora;
      this.miniatura.mostrar(this.controle.quadroNovo(agora));
    }
    this.agendar();
  };
}
