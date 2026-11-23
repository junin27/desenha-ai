import { perguntaBloqueada } from "../domain/ze/bloqueio";
import { aparar } from "../domain/texto";
import { entradaPergunta, lerFala, type ErroDeConversa, type LeituraParcial } from "../domain/ze/conversa";
import type { OrigemDaFala } from "./estado-da-partida";
import type { Cancelamento, ModeloDoZe, NarradorDoJogo, ReservaDoZe } from "./portas";

export interface RespostaDoZe {
  readonly texto: string;
  readonly origem: OrigemDaFala;
  readonly modelo?: ModeloDoZe | undefined;
}

export interface EstadoDaConversa {
  readonly aberta: boolean;
  readonly respondendo: boolean;
  readonly falaAoVivo: LeituraParcial | undefined;
  readonly resposta: RespostaDoZe | undefined;
  readonly erro: ErroDeConversa | undefined;
}

export type OuvinteDaConversa = (estado: EstadoDaConversa) => void;

const CONVERSA_FECHADA: EstadoDaConversa = {
  aberta: false,
  respondendo: false,
  falaAoVivo: undefined,
  resposta: undefined,
  erro: undefined,
};

/**
 * "Pergunte ao Zé" (D4 do design da bancada-do-ze): conversa fora da partida, com a tarefa PERGUNTA,
 * bloqueio de ofensas e resposta de reserva. Só abre quando a partida está no início.
 *
 * @example
 * conversa.abrir();
 * await conversa.perguntar("O que é uma CNN?");
 */
export class ConversaComOZe {
  private atual: EstadoDaConversa = CONVERSA_FECHADA;
  private readonly ouvintes = new Set<OuvinteDaConversa>();

  constructor(
    private readonly narrador: NarradorDoJogo,
    private readonly reserva: ReservaDoZe,
    private readonly podeAbrir: () => boolean,
  ) {}

  get estado(): EstadoDaConversa {
    return this.atual;
  }

  aoMudar(ouvinte: OuvinteDaConversa): Cancelamento {
    this.ouvintes.add(ouvinte);
    return () => this.ouvintes.delete(ouvinte);
  }

  abrir(): void {
    if (this.podeAbrir()) this.mudar({ ...CONVERSA_FECHADA, aberta: true });
  }

  voltar(): void {
    this.mudar(CONVERSA_FECHADA);
  }

  async perguntar(pergunta: string): Promise<void> {
    if (!this.atual.aberta || this.atual.respondendo) return;
    const entrada = entradaPergunta(pergunta);
    if (!entrada.ok) {
      this.mudar({ erro: entrada.erro, resposta: undefined });
      return;
    }
    if (perguntaBloqueada(pergunta)) {
      this.mudar({
        erro: undefined,
        resposta: { texto: this.reserva.respostaBloqueada(), origem: "reserva" },
      });
      return;
    }
    this.mudar({ respondendo: true, erro: undefined, resposta: undefined });
    const resposta = await this.respostaDoZe(entrada.valor);
    this.mudar({ respondendo: false, falaAoVivo: undefined, resposta });
  }

  private async respostaDoZe(entrada: string): Promise<RespostaDoZe> {
    const fala = await this.narrador.falar(entrada, (falaAoVivo) => {
      this.mudar({ falaAoVivo });
    });
    const lida = fala.ok ? lerFala(fala.valor.texto) : fala;
    const texto = lida.ok ? aparar(lida.valor.resposta) : "";
    if (!fala.ok || texto === "") return { texto: this.reserva.resposta(), origem: "reserva" };
    return { texto, origem: "ze", modelo: fala.valor.modelo };
  }

  private mudar(alteracao: Partial<EstadoDaConversa>): void {
    this.atual = { ...this.atual, ...alteracao };
    for (const ouvinte of this.ouvintes) ouvinte(this.atual);
  }
}
