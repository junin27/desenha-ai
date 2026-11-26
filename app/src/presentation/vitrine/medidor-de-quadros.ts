/** Spec `vitrine-da-abertura`, "Degradação em notebook lento" (D11 do design). */
export const QUADROS_POR_SEGUNDO_MINIMOS = 30;
export const JANELA_DA_MEDICAO_MS = 3000;

/**
 * Conta quadros numa janela deslizante de 3 s. Se a média ficar abaixo de 30 por segundo numa janela cheia, a
 * vitrine passa ao modo de corte direto até o jogo ser recarregado (não oscila entre os modos).
 */
export class MedidorDeQuadros {
  private readonly quadros: number[] = [];
  private lentoAgora = false;

  get lento(): boolean {
    return this.lentoAgora;
  }

  /** Registra um quadro e diz se a vitrine deve estar no modo lento. */
  registrar(agoraMs: number): boolean {
    if (this.lentoAgora) return true;
    this.quadros.push(agoraMs);
    while (this.quadros.length > 0 && agoraMs - (this.quadros[0] ?? agoraMs) > JANELA_DA_MEDICAO_MS) {
      this.quadros.shift();
    }
    const primeiro = this.quadros[0] ?? agoraMs;
    const janelaCheia = agoraMs - primeiro >= JANELA_DA_MEDICAO_MS * 0.98;
    const porSegundo = ((this.quadros.length - 1) * 1000) / Math.max(1, agoraMs - primeiro);
    this.lentoAgora = janelaCheia && porSegundo < QUADROS_POR_SEGUNDO_MINIMOS;
    return this.lentoAgora;
  }

  /** Volta a medir do zero (quando a vitrine some e volta, o tempo fora da tela não conta). */
  zerarJanela(): void {
    this.quadros.length = 0;
  }
}
