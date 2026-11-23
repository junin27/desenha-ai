import type { ResultadoDaParidade } from "./autoteste-de-paridade";
import type { Cancelamento } from "./portas";

/** Tempos do último palpite das redes, em milissegundos. */
export interface MedicaoDasRedes {
  readonly cnnMs: number;
  readonly lstmMs: number;
  readonly totalMs: number;
}

/** Retrato imutável do que o painel técnico mostra. */
export interface RetratoDasMedicoes {
  readonly redes: MedicaoDasRedes | undefined;
  readonly paridade: ResultadoDaParidade | undefined;
}

export type OuvinteDasMedicoes = (retrato: RetratoDasMedicoes) => void;

const RETRATO_INICIAL: RetratoDasMedicoes = { redes: undefined, paridade: undefined };

/**
 * Medições da sessão para o painel técnico (D1 do design da bancada-do-ze). Os decoradores das portas
 * registram aqui; a partida não sabe que está sendo medida.
 *
 * @example
 * medicoes.aoMudar((retrato) => painel.mostrar(retrato));
 */
export class MedicoesDaSessao {
  private atual: RetratoDasMedicoes = RETRATO_INICIAL;
  private readonly ouvintes = new Set<OuvinteDasMedicoes>();

  get retrato(): RetratoDasMedicoes {
    return this.atual;
  }

  aoMudar(ouvinte: OuvinteDasMedicoes): Cancelamento {
    this.ouvintes.add(ouvinte);
    return () => this.ouvintes.delete(ouvinte);
  }

  registrarRedes(redes: MedicaoDasRedes): void {
    this.mudar({ redes });
  }

  registrarParidade(paridade: ResultadoDaParidade): void {
    this.mudar({ paridade });
  }

  private mudar(alteracao: Partial<RetratoDasMedicoes>): void {
    this.atual = { ...this.atual, ...alteracao };
    for (const ouvinte of this.ouvintes) ouvinte(this.atual);
  }
}
