import {
  geometriaDoPortal,
  quadroDoPortal,
  suavizar,
  type GeometriaDoPortal,
} from "../../domain/vitrine/portal";
import { aplicarQuadro, medirNaCena } from "./motor-do-portal";

/** "Jogar!" ou "Jogar agora ›" abrem o apelido por um portal a partir do botão (spec: em até 2,2 s). */
export const DURACAO_DO_PORTAL_DO_APELIDO_MS = 1800;
/** Fração inicial em que a tela de apelido só aparece dentro do botão, antes de a câmera andar. */
const FASE_DA_PREVIA = 0.25;

interface Aberto {
  readonly fora: HTMLElement;
  readonly dentro: HTMLElement;
  readonly geometria: GeometriaDoPortal;
}

/**
 * Portal entre a vitrine e a tela de apelido, e o caminho de volta ("Voltar à história"). Sem animação
 * (movimento reduzido, notebook lento, testes), a troca é um corte direto.
 */
export class PortalDoApelido {
  private aberto: Aberto | undefined;

  constructor(
    private readonly animado: () => boolean,
    private readonly pedirQuadro: (passo: (agora: number) => void) => void = (passo) =>
      requestAnimationFrame(passo),
  ) {}

  /** Sem animação, `abrir` e `voltar` terminam na hora (o quadro final já foi aplicado ao retornar). */
  get anima(): boolean {
    return this.animado();
  }

  abrir(fora: HTMLElement, dentro: HTMLElement, origem: HTMLElement): Promise<void> {
    const r = medirNaCena(origem);
    const geometria = geometriaDoPortal(
      { ...r, forma: "retangulo", canto: 20 },
      { largura: window.innerWidth, altura: window.innerHeight },
    );
    this.aberto = { fora, dentro, geometria };
    return this.animar((p) => p);
  }

  voltar(): Promise<void> {
    return this.animar((p) => 1 - p);
  }

  private animar(progressoDe: (p: number) => number): Promise<void> {
    const aberto = this.aberto;
    if (aberto === undefined) return Promise.resolve();
    const desenhar = (p: number): void => {
      const u = p < FASE_DA_PREVIA ? 0 : suavizar((p - FASE_DA_PREVIA) / (1 - FASE_DA_PREVIA));
      aplicarQuadro(
        aberto.fora,
        aberto.dentro,
        quadroDoPortal(aberto.geometria, u),
        Math.min(1, p / FASE_DA_PREVIA),
      );
    };
    if (!this.animado()) {
      desenhar(progressoDe(1));
      return Promise.resolve();
    }
    return new Promise((terminar) => {
      let inicio: number | undefined;
      const quadro = (agora: number): void => {
        inicio ??= agora;
        const p = Math.min(1, (agora - inicio) / DURACAO_DO_PORTAL_DO_APELIDO_MS);
        desenhar(progressoDe(p));
        if (p < 1) this.pedirQuadro(quadro);
        else terminar();
      };
      this.pedirQuadro(quadro);
    });
  }
}
