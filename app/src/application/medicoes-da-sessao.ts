import type { ResultadoDaParidade } from "./autoteste-de-paridade";
import type { OrigemDaFala } from "./estado-da-partida";
import type { Cancelamento, ErroDoNarrador, ModeloDoZe } from "./portas";

/** Tempos do último palpite das redes, em milissegundos. */
export interface MedicaoDasRedes {
  readonly cnnMs: number;
  readonly lstmMs: number;
  readonly totalMs: number;
}

/** Última fala completa do Zé. */
export interface MedicaoDaFala {
  readonly modelo: ModeloDoZe;
  /** `undefined` se o servidor respondeu sem nenhum pedaço de texto. */
  readonly ateOPrimeiroTokenMs: number | undefined;
  readonly duracaoMs: number;
  readonly tokens: number;
  readonly tokensPorSegundo: number;
}

/** Contadores da sessão de um modelo. */
export interface ContagemDoModelo {
  readonly falasDoZe: number;
  readonly reservas: number;
  readonly discordancias: number;
  readonly falhas: Readonly<Record<ErroDoNarrador["codigo"], number>>;
}

/** Retrato imutável do que o painel técnico mostra. */
export interface RetratoDasMedicoes {
  readonly redes: MedicaoDasRedes | undefined;
  readonly paridade: ResultadoDaParidade | undefined;
  readonly ultimaFala: MedicaoDaFala | undefined;
  readonly porModelo: Readonly<Record<ModeloDoZe, ContagemDoModelo>>;
}

export type OuvinteDasMedicoes = (retrato: RetratoDasMedicoes) => void;

const CONTAGEM_INICIAL: ContagemDoModelo = {
  falasDoZe: 0,
  reservas: 0,
  discordancias: 0,
  falhas: { narrador_indisponivel: 0, narrador_lento: 0 },
};

const RETRATO_INICIAL: RetratoDasMedicoes = {
  redes: undefined,
  paridade: undefined,
  ultimaFala: undefined,
  porModelo: { destilado: CONTAGEM_INICIAL, base: CONTAGEM_INICIAL },
};

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
  /** Modelo do último pedido ao Zé ainda não contado como fala do Zé ou de reserva. */
  private pedidoSemContagem: ModeloDoZe | undefined;

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

  /** Um pedido ao Zé começou; a próxima fala mostrada (do Zé ou de reserva) conta para este modelo. */
  registrarPedido(modelo: ModeloDoZe): void {
    this.pedidoSemContagem = modelo;
  }

  registrarFala(fala: MedicaoDaFala): void {
    this.mudar({ ultimaFala: fala });
  }

  registrarFalha(modelo: ModeloDoZe, codigo: ErroDoNarrador["codigo"]): void {
    this.somar(modelo, (contagem) => ({
      falhas: { ...contagem.falhas, [codigo]: contagem.falhas[codigo] + 1 },
    }));
  }

  /**
   * Conta a fala mostrada para o modelo do último pedido. Sem pedido pendente (ex.: rodada sem traço),
   * a reserva não é culpa de nenhum modelo e não conta.
   */
  registrarUso(origem: OrigemDaFala, discordancia: boolean): void {
    const modelo = this.pedidoSemContagem;
    if (modelo === undefined) return;
    this.pedidoSemContagem = undefined;
    this.somar(modelo, (contagem) => ({
      falasDoZe: contagem.falasDoZe + (origem === "ze" ? 1 : 0),
      reservas: contagem.reservas + (origem === "reserva" ? 1 : 0),
      discordancias: contagem.discordancias + (discordancia ? 1 : 0),
    }));
  }

  private somar(modelo: ModeloDoZe, soma: (contagem: ContagemDoModelo) => Partial<ContagemDoModelo>): void {
    const contagem = this.atual.porModelo[modelo];
    this.mudar({ porModelo: { ...this.atual.porModelo, [modelo]: { ...contagem, ...soma(contagem) } } });
  }

  private mudar(alteracao: Partial<RetratoDasMedicoes>): void {
    this.atual = { ...this.atual, ...alteracao };
    for (const ouvinte of this.ouvintes) ouvinte(this.atual);
  }
}
