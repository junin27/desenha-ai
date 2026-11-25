import type { Gesto } from "./gestos";
import { distanciaEntre, type PontoDaMao } from "./pontos";

/** Mão aberta parada por este tempo limpa o desenho (spec `desenho-com-a-mao`). */
export const TEMPO_PARA_LIMPAR_MS = 3000;
/** "Parada": a palma não anda mais que esta fração da largura da imagem desde o começo da contagem. */
export const MOVIMENTO_MAXIMO = 0.04;

export interface PassoDaLimpeza {
  /** De 0 a 1: quanto do anel da contagem está completo. */
  readonly fracao: number;
  /** Verdadeiro só no quadro em que a contagem completa. */
  readonly limpar: boolean;
}

/**
 * Contagem do "limpar tudo" (D6 do design): começa quando a mão aberta aparece, zera se ela andar além do
 * limite ou se o gesto mudar, e dispara uma vez ao completar 3 s.
 */
export class ContagemDaLimpeza {
  private inicio: { readonly ms: number; readonly palma: PontoDaMao } | undefined;
  private disparou = false;

  registrar(gesto: Gesto, palma: PontoDaMao | undefined, agoraMs: number): PassoDaLimpeza {
    if (gesto !== "mao_aberta" || palma === undefined) return this.zerar();
    if (this.inicio === undefined || distanciaEntre(palma, this.inicio.palma) > MOVIMENTO_MAXIMO) {
      this.inicio = { ms: agoraMs, palma };
      this.disparou = false;
      return { fracao: 0, limpar: false };
    }
    const fracao = Math.min(1, (agoraMs - this.inicio.ms) / TEMPO_PARA_LIMPAR_MS);
    const limpar = fracao >= 1 && !this.disparou;
    if (limpar) this.disparou = true;
    return { fracao, limpar };
  }

  private zerar(): PassoDaLimpeza {
    this.inicio = undefined;
    this.disparou = false;
    return { fracao: 0, limpar: false };
  }
}
