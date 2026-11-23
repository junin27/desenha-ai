import type {
  Cancelamento,
  ClassificadorDeDesenho,
  ErroDoClassificador,
  ErroDoNarrador,
  FalaFinal,
  NarradorDoJogo,
  OuvinteDaFala,
  ProbabilidadesDasRedes,
  Relogio,
  RepositorioDePlacar,
  ReservaDoZe,
  Sorteador,
} from "../../src/application/portas";
import type { Desenho } from "../../src/domain/desenho/desenho";
import { falha, ok, type Resultado } from "../../src/domain/resultado";
import type { PartidaNoPlacar } from "../../src/domain/rodada/pontuacao";
import type { Veredito } from "../../src/domain/rodada/veredito";
import { lerParcial } from "../../src/domain/ze/conversa";

export const TOTAL_DE_CATEGORIAS = 30;

/** Distribuição com `chance` na categoria `indice` e o resto dividido igualmente entre as outras. */
export function probabilidadesCom(indice: number, chance: number): number[] {
  const resto = (1 - chance) / (TOTAL_DE_CATEGORIAS - 1);
  return Array.from({ length: TOTAL_DE_CATEGORIAS }, (_, i) => (i === indice ? chance : resto));
}

type RespostaDoClassificador = Resultado<ProbabilidadesDasRedes, ErroDoClassificador>;

/** Devolve as probabilidades programadas, em ordem; repete a última quando a fila acaba. */
export class ClassificadorFalso implements ClassificadorDeDesenho {
  readonly desenhosRecebidos: Desenho[] = [];
  private readonly respostas: RespostaDoClassificador[] = [];

  programar(cnn: readonly number[], lstm: readonly number[] = cnn): this {
    this.respostas.push(ok({ cnn, lstm }));
    return this;
  }

  programarFalha(): this {
    this.respostas.push(falha({ codigo: "classificador_indisponivel", detalhe: "dublê sem redes" }));
    return this;
  }

  classificar(desenho: Desenho): Promise<RespostaDoClassificador> {
    this.desenhosRecebidos.push(desenho);
    const resposta = this.respostas.length > 1 ? this.respostas.shift() : this.respostas[0];
    return Promise.resolve(
      resposta ?? falha({ codigo: "classificador_indisponivel", detalhe: "nada programado" }),
    );
  }
}

/** Classificador cujas respostas o teste libera à mão, para simular cálculos que se atrasam. */
export class ClassificadorControlado implements ClassificadorDeDesenho {
  private readonly pendentes: ((resposta: RespostaDoClassificador) => void)[] = [];

  get quantidadePendente(): number {
    return this.pendentes.length;
  }

  classificar(): Promise<RespostaDoClassificador> {
    return new Promise((resolver) => this.pendentes.push(resolver));
  }

  liberar(posicao: number, probabilidades: readonly number[]): void {
    this.pendentes[posicao]?.(ok({ cnn: probabilidades, lstm: probabilidades }));
  }
}

type RespostaDoNarrador = Resultado<FalaFinal, ErroDoNarrador>;

/** Devolve as falas programadas em ordem, informando a leitura parcial em pedaços de 8 caracteres. */
export class NarradorFalso implements NarradorDoJogo {
  readonly entradasRecebidas: string[] = [];
  private readonly respostas: RespostaDoNarrador[] = [];

  programarFala(texto: string): this {
    this.respostas.push(ok({ texto, tokens: 50, tokensPorSegundo: 10 }));
    return this;
  }

  programarFalha(codigo: ErroDoNarrador["codigo"] = "narrador_indisponivel"): this {
    this.respostas.push(falha({ codigo, detalhe: "dublê programado para falhar" }));
    return this;
  }

  falar(entrada: string, aoLer: OuvinteDaFala): Promise<RespostaDoNarrador> {
    this.entradasRecebidas.push(entrada);
    const resposta =
      this.respostas.shift() ?? falha({ codigo: "narrador_indisponivel", detalhe: "nada programado" });
    if (resposta.ok) informarEmPedacos(resposta.valor.texto, aoLer);
    return Promise.resolve(resposta);
  }
}

const TAMANHO_DO_PEDACO = 8;

function informarEmPedacos(texto: string, aoLer: OuvinteDaFala): void {
  for (let fim = TAMANHO_DO_PEDACO; fim < texto.length + TAMANHO_DO_PEDACO; fim += TAMANHO_DO_PEDACO) {
    aoLer(lerParcial(texto.slice(0, fim)));
  }
}

export function falaDoZe(pensamento: string, resposta: string): string {
  return `<pensamento>${pensamento}</pensamento><resposta>${resposta}</resposta>`;
}

export class PlacarEmMemoria implements RepositorioDePlacar {
  partidas: PartidaNoPlacar[] = [];

  ler(): readonly PartidaNoPlacar[] {
    return this.partidas;
  }

  gravar(partida: PartidaNoPlacar): void {
    this.partidas.push(partida);
  }

  zerar(): void {
    this.partidas = [];
  }
}

interface Agendamento {
  readonly intervalo: number;
  proximo: number;
  readonly tarefa: () => void;
  ativo: boolean;
}

/** Tempo que só anda quando o teste manda; dispara os agendamentos na ordem em que vencem. */
export class RelogioFalso implements Relogio {
  private momento = 0;
  private readonly agendamentos: Agendamento[] = [];

  agora(): number {
    return this.momento;
  }

  /** No dublê, o tempo monotônico anda junto com o horário. */
  instante(): number {
    return this.momento;
  }

  aCada(milissegundos: number, tarefa: () => void): Cancelamento {
    const agendamento = {
      intervalo: milissegundos,
      proximo: this.momento + milissegundos,
      tarefa,
      ativo: true,
    };
    this.agendamentos.push(agendamento);
    return () => {
      agendamento.ativo = false;
    };
  }

  get agendamentosAtivos(): number {
    return this.agendamentos.filter((a) => a.ativo).length;
  }

  avancar(milissegundos: number): void {
    const destino = this.momento + milissegundos;
    for (let vencido = this.proximoVencido(destino); vencido; vencido = this.proximoVencido(destino)) {
      this.momento = vencido.proximo;
      vencido.proximo += vencido.intervalo;
      vencido.tarefa();
    }
    this.momento = destino;
  }

  private proximoVencido(destino: number): Agendamento | undefined {
    const vencidos = this.agendamentos.filter((a) => a.ativo && a.proximo <= destino);
    return vencidos.sort((a, b) => a.proximo - b.proximo)[0];
  }
}

/** Não embaralha: devolve a lista na ordem recebida (ou na ordem fixa informada). */
export class SorteadorFixo implements Sorteador {
  constructor(private readonly ordem?: readonly number[]) {}

  embaralhar<T>(lista: readonly T[]): T[] {
    if (this.ordem === undefined) return [...lista];
    return this.ordem.map((i) => lista[i]).filter((item): item is T => item !== undefined);
  }
}

/** Reserva previsível para conferir qual fala foi usada. */
export class ReservaFalsa implements ReservaDoZe {
  charada(categoria: string): string {
    return `Charada de reserva da ${categoria}`;
  }

  narracao(veredito: Veredito, desafio: string, primeiroPalpite: string): string {
    return `Narração-modelo ${veredito}: ${desafio} / ${primeiroPalpite}`;
  }
}
