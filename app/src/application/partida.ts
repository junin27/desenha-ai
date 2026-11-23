import type { Desenho } from "../domain/desenho/desenho";
import { prepararDesenhoCapturado } from "../domain/desenho/simplificacao";
import { limparNome, RODADAS_POR_PARTIDA, SEGUNDOS_DA_RODADA } from "../domain/rodada/pontuacao";
import { deveEncerrarAntes } from "../domain/rodada/veredito";
import type { LeituraParcial } from "../domain/ze/conversa";
import { nivelDaRodada, obterCharada } from "./charada-da-rodada";
import {
  esperaEsgotada,
  fracaoDoTempo,
  INTERVALO_DO_CRONOMETRO_MS,
  segundosDecorridos,
  segundosRestantes,
} from "./cronometro";
import { julgarRodada } from "./julgamento-da-rodada";
import { montarPalpite } from "./palpite";

const DESENHO_COMPLETO = 1;
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
  private inicioDaEtapaMs = 0;
  private primeiroTracoMs: number | undefined;
  private pararCronometro: Cancelamento = () => undefined;
  private julgamento: Promise<void> = Promise.resolve();

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

  /** Espera o que a partida disparou sozinha (fim do tempo, julgamento); usado pelos testes e pela tela. */
  aguardar(): Promise<void> {
    return this.julgamento;
  }

  desenhar(): void {
    if (this.estadoAtual.etapa !== "charada" || this.estadoAtual.charada === undefined) return;
    this.inicioDaEtapaMs = this.dependencias.relogio.agora();
    this.primeiroTracoMs = undefined;
    this.mudar({ etapa: "desenhando", segundosRestantes: SEGUNDOS_DA_RODADA, palpite: undefined });
    this.pararCronometro = this.dependencias.relogio.aCada(INTERVALO_DO_CRONOMETRO_MS, () => {
      this.conferirTempo();
    });
  }

  /** Recebe o desenho inteiro capturado até agora e atualiza o palpite das redes. */
  async registrarTraco(desenho: Desenho): Promise<void> {
    if (this.estadoAtual.etapa !== "desenhando") return;
    this.primeiroTracoMs ??= this.dependencias.relogio.agora();
    const probabilidades = await this.dependencias.classificador.classificar(
      prepararDesenhoCapturado(desenho),
    );
    // A etapa pode ter mudado enquanto as redes calculavam (tempo esgotado, "Pronto").
    if (!this.estaDesenhando() || !probabilidades.ok) return;
    const palpite = montarPalpite(probabilidades.valor, this.configuracao.pesoDaCnn);
    if (palpite === undefined) return;
    this.mudar({ palpite });
    // Na vitória antecipada o Zé fica sabendo que as redes viram só parte do desenho (D8 do design).
    if (this.venceuAntes(palpite.ensemble)) await this.encerrarDesenho(this.fracaoDoTempoUsado());
  }

  /** Botão "Limpar": apaga o palpite, mas o cronômetro segue (spec `interface-do-jogo`). */
  limparDesenho(): void {
    if (this.estadoAtual.etapa === "desenhando") this.mudar({ palpite: undefined });
  }

  async pronto(): Promise<void> {
    await this.encerrarDesenho();
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
    const { narrador, reserva } = this.dependencias;
    const categoria = this.nomeDaCategoria(rodada);
    const charada = await obterCharada(narrador, reserva, categoria, nivelDaRodada(rodada), this.mostrarFala);
    this.mudar({ charada, falaAoVivo: undefined });
  }

  private conferirTempo(): void {
    const agora = this.dependencias.relogio.agora();
    if (this.primeiroTracoMs === undefined) {
      if (esperaEsgotada(this.inicioDaEtapaMs, agora)) void this.encerrarDesenho();
      return;
    }
    const restantes = segundosRestantes(this.primeiroTracoMs, agora);
    this.mudar({ segundosRestantes: restantes });
    if (restantes <= 0) void this.encerrarDesenho();
  }

  private venceuAntes(ensemble: readonly number[]): boolean {
    if (this.primeiroTracoMs === undefined) return false;
    const decorridos = segundosDecorridos(this.primeiroTracoMs, this.dependencias.relogio.agora());
    const encerrar = deveEncerrarAntes(this.categoriaDaRodada(), ensemble, decorridos);
    return encerrar.ok && encerrar.valor;
  }

  /** Sai do desenho uma vez só, venha o fim do tempo, a vitória antecipada ou o "Pronto". */
  private encerrarDesenho(fracaoDoDesenho = DESENHO_COMPLETO): Promise<void> {
    if (this.estadoAtual.etapa !== "desenhando") return this.julgamento;
    this.pararCronometro();
    const agora = this.dependencias.relogio.agora();
    const restantes = this.primeiroTracoMs === undefined ? 0 : segundosRestantes(this.primeiroTracoMs, agora);
    this.mudar({ etapa: "julgando", segundosRestantes: restantes });
    this.julgamento = this.julgar(fracaoDoDesenho);
    return this.julgamento;
  }

  private async julgar(fracaoDoDesenho: number): Promise<void> {
    const { estadoAtual } = this;
    const rodada = {
      categoria: this.categoriaDaRodada(),
      nomesDasCategorias: this.configuracao.categorias,
      palpite: estadoAtual.palpite,
      segundosRestantes: estadoAtual.segundosRestantes,
      fracaoDoDesenho,
    };
    const { narrador, reserva } = this.dependencias;
    const resultado = await julgarRodada(narrador, reserva, rodada, this.mostrarFala);
    this.mudar({
      etapa: "resultado",
      falaAoVivo: undefined,
      resultados: [...estadoAtual.resultados, resultado],
    });
  }

  private fracaoDoTempoUsado(): number {
    const agora = this.dependencias.relogio.agora();
    return this.primeiroTracoMs === undefined ? DESENHO_COMPLETO : fracaoDoTempo(this.primeiroTracoMs, agora);
  }

  private estaDesenhando(): boolean {
    return this.estadoAtual.etapa === "desenhando";
  }

  private categoriaDaRodada(): number {
    return this.estadoAtual.categorias[this.estadoAtual.rodada] ?? 0;
  }

  private nomeDaCategoria(rodada: number): string {
    const indice = this.estadoAtual.categorias[rodada] ?? 0;
    return this.configuracao.categorias[indice] ?? "";
  }

  /** Repassa à tela o que o Zé está gerando (charada ou narração). */
  private readonly mostrarFala = (falaAoVivo: LeituraParcial): void => {
    this.mudar({ falaAoVivo });
  };

  private mudar(alteracao: Partial<EstadoDaPartida>): void {
    this.estadoAtual = { ...this.estadoAtual, ...alteracao };
    for (const ouvinte of this.ouvintes) ouvinte(this.estadoAtual);
  }
}
