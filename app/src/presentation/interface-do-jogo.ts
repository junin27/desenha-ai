import type { EstadoDaConversa } from "../application/conversa-com-o-ze";
import { ESTADO_INICIAL, type Etapa, type EstadoDaPartida } from "../application/estado-da-partida";
import type { ComandosDaConversa, ComandosDoJogo, InformacoesDoJogo, Tela } from "./telas/tela";
import { TelaCharada } from "./telas/tela-charada";
import { TelaDesenho } from "./telas/tela-desenho";
import { TelaFim } from "./telas/tela-fim";
import { TelaInicio } from "./telas/tela-inicio";
import { TelaPergunta } from "./telas/tela-pergunta";
import { TelaVeredito } from "./telas/tela-veredito";

export type { ComandosDaConversa, ComandosDoJogo, InformacoesDoJogo } from "./telas/tela";

type NomeDaTela = "inicio" | "charada" | "desenho" | "veredito" | "fim";

/** Etapa da partida → tela (spec `interface-do-jogo`, "Telas da partida"). */
const TELA_DA_ETAPA: Readonly<Record<Etapa, NomeDaTela>> = {
  inicio: "inicio",
  charada: "charada",
  desenhando: "desenho",
  julgando: "veredito",
  resultado: "veredito",
  fim: "fim",
};

/**
 * Monta as cinco telas uma vez e, a cada mudança da partida, mostra só a da etapa atual e a atualiza.
 * A troca é síncrona (bem abaixo dos 100 ms da spec).
 *
 * @example
 * const tela = new InterfaceDoJogo(document.querySelector("main"), partida, informacoes);
 * partida.aoMudar((estado) => tela.mostrar(estado));
 */
export class InterfaceDoJogo {
  private readonly inicio: TelaInicio;
  private readonly telas: Readonly<Record<NomeDaTela, Tela>>;
  private readonly pergunta: TelaPergunta;
  private partida: EstadoDaPartida = ESTADO_INICIAL;
  private conversaAberta = false;

  constructor(
    raiz: HTMLElement,
    comandos: ComandosDoJogo,
    informacoes: InformacoesDoJogo,
    conversa: ComandosDaConversa,
  ) {
    this.inicio = new TelaInicio(comandos, informacoes, conversa);
    this.pergunta = new TelaPergunta(conversa);
    this.telas = {
      inicio: this.inicio,
      charada: new TelaCharada(comandos),
      desenho: new TelaDesenho(comandos, informacoes),
      veredito: new TelaVeredito(comandos, informacoes),
      fim: new TelaFim(comandos, informacoes),
    };
    this.pergunta.raiz.hidden = true;
    raiz.replaceChildren(...Object.values(this.telas).map((tela) => tela.raiz), this.pergunta.raiz);
  }

  mostrar(estado: EstadoDaPartida): void {
    this.partida = estado;
    const perguntando = this.conversaAberta && estado.etapa === "inicio";
    const atual = perguntando ? undefined : TELA_DA_ETAPA[estado.etapa];
    this.pergunta.raiz.hidden = !perguntando;
    for (const [nome, tela] of Object.entries(this.telas)) {
      tela.raiz.hidden = nome !== atual;
      if (nome === atual || nome === "desenho") tela.atualizar(estado); // o desenho desliga a captura ao sair
    }
  }

  /** A conversa do "Pergunte ao Zé" ocupa a tela de início enquanto estiver aberta. */
  mostrarConversa(estado: EstadoDaConversa): void {
    this.conversaAberta = estado.aberta;
    this.pergunta.atualizar(estado);
    this.mostrar(this.partida);
  }

  avisarRedesDivergentes(): void {
    this.inicio.avisarRedesDivergentes();
  }
}
