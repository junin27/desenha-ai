import type { Relogio } from "./portas";

/** Durante o traço, no máximo um pedido às redes a cada 250 ms (spec `palpites-ao-vivo`). */
export const INTERVALO_MINIMO_DURANTE_O_TRACO_MS = 250;

/**
 * Controla os pedidos de palpite (D3 do design): cada pedido recebe um número de geração e só o mais
 * recente vale quando chega; durante o traço, os pedidos são limitados a 1 a cada 250 ms.
 *
 * @example
 * const geracao = fila.pedir(false); // undefined se ainda não passaram 250 ms
 * if (geracao !== undefined && fila.aindaVale(geracao)) mostrar(palpite);
 */
export class FilaDePalpites {
  private geracao = 0;
  private ultimoPedidoMs = Number.NEGATIVE_INFINITY;

  constructor(private readonly relogio: Relogio) {}

  /** Devolve a geração do novo pedido, ou `undefined` se ele deve ser pulado. */
  pedir(tracoTerminado: boolean): number | undefined {
    const agora = this.relogio.agora();
    if (!tracoTerminado && agora - this.ultimoPedidoMs < INTERVALO_MINIMO_DURANTE_O_TRACO_MS)
      return undefined;
    this.ultimoPedidoMs = agora;
    this.geracao += 1;
    return this.geracao;
  }

  aindaVale(geracao: number): boolean {
    return geracao === this.geracao;
  }

  /** Invalida os pedidos em andamento (botão Limpar, troca de rodada). */
  descartarPendentes(): void {
    this.geracao += 1;
    this.ultimoPedidoMs = Number.NEGATIVE_INFINITY;
  }
}
