import { limparNome, RODADAS_POR_PARTIDA } from "../domain/rodada/pontuacao";
import { ESTADO_INICIAL, type EstadoDaPartida } from "./estado-da-partida";
import type {
  Cancelamento,
  ClassificadorDeDesenho,
  NarradorDoJogo,
  Relogio,
  RepositorioDePlacar,
  ReservaDoZe,
  Sorteador,
} from "./portas";

export interface DependenciasDaPartida {
  readonly classificador: ClassificadorDeDesenho;
  readonly narrador: NarradorDoJogo;
  readonly placar: RepositorioDePlacar;
  readonly relogio: Relogio;
  readonly sorteador: Sorteador;
  readonly reserva: ReservaDoZe;
}

export interface ConfiguracaoDaPartida {
  /** Nomes em português das 30 categorias, na ordem de `classes.json`. */
  readonly categorias: readonly string[];
  /** `w_cnn` de `classes.json`. */
  readonly pesoDaCnn: number;
}

export type OuvinteDaPartida = (estado: EstadoDaPartida) => void;

/**
 * Máquina de estados da partida (D2 do design da change jogo-web). Cada comando troca o retrato imutável
 * do estado e avisa os ouvintes; comandos fora da etapa certa são ignorados, porque a tela pode
 * repetir cliques.
 *
 * @example
 * await partida.comecar("Ana"); // etapa "charada"
 */
export class Partida {
  private estadoAtual: EstadoDaPartida = ESTADO_INICIAL;
  private readonly ouvintes = new Set<OuvinteDaPartida>();

  constructor(
    private readonly dependencias: DependenciasDaPartida,
    private readonly configuracao: ConfiguracaoDaPartida,
  ) {}

  get estado(): EstadoDaPartida {
    return this.estadoAtual;
  }

  aoMudar(ouvinte: OuvinteDaPartida): Cancelamento {
    this.ouvintes.add(ouvinte);
    return () => this.ouvintes.delete(ouvinte);
  }

  async comecar(nome: string): Promise<void> {
    if (this.estadoAtual.etapa !== "inicio") return;
    const limpo = limparNome(nome);
    if (!limpo.ok) {
      this.mudar({ erro: limpo.erro });
      return;
    }
    const indices = this.configuracao.categorias.map((_, indice) => indice);
    const categorias = this.dependencias.sorteador.embaralhar(indices).slice(0, RODADAS_POR_PARTIDA);
    this.mudar({ ...ESTADO_INICIAL, nome: limpo.valor, categorias });
    await this.iniciarRodada(0);
  }

  desenhar(): void {
    if (this.estadoAtual.etapa !== "charada" || this.estadoAtual.charada === undefined) return;
    this.mudar({ etapa: "desenhando" });
  }

  async pronto(): Promise<void> {
    if (this.estadoAtual.etapa !== "desenhando") return;
    this.mudar({ etapa: "julgando" });
    await Promise.resolve();
    this.mudar({ etapa: "resultado" });
  }

  async proximaRodada(): Promise<void> {
    if (this.estadoAtual.etapa !== "resultado") return;
    const proxima = this.estadoAtual.rodada + 1;
    if (proxima < RODADAS_POR_PARTIDA) {
      await this.iniciarRodada(proxima);
      return;
    }
    this.mudar({ etapa: "fim" });
  }

  novaPartida(): void {
    this.mudar(ESTADO_INICIAL);
  }

  private async iniciarRodada(rodada: number): Promise<void> {
    this.mudar({ etapa: "charada", rodada, charada: undefined });
    await Promise.resolve();
    const categoria = this.nomeDaCategoria(rodada);
    this.mudar({ charada: { texto: this.dependencias.reserva.charada(categoria), origem: "reserva" } });
  }

  private nomeDaCategoria(rodada: number): string {
    const indice = this.estadoAtual.categorias[rodada] ?? 0;
    return this.configuracao.categorias[indice] ?? "";
  }

  private mudar(alteracao: Partial<EstadoDaPartida>): void {
    this.estadoAtual = { ...this.estadoAtual, ...alteracao };
    for (const ouvinte of this.ouvintes) ouvinte(this.estadoAtual);
  }
}
