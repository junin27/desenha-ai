import type { EstadoDaConversa } from "../application/conversa-com-o-ze";
import { ESTADO_INICIAL, type Etapa, type EstadoDaPartida } from "../application/estado-da-partida";
import { Confete } from "./confete";
import { criar } from "./dom";
import type { ComandosDaConversa, ComandosDoJogo, InformacoesDoJogo, Tela } from "./telas/tela";
import { TelaAbertura } from "./telas/tela-abertura";
import { TelaCharada } from "./telas/tela-charada";
import { TelaDesenho } from "./telas/tela-desenho";
import { TelaInicio } from "./telas/tela-inicio";
import { TelaPlacar } from "./telas/tela-placar";
import { TelaVeredito } from "./telas/tela-veredito";
import { TransicaoPorPincelada } from "./transicao";
import type { OpcoesDoPersonagem, PersonagemDoZe } from "./ze/personagem";
import { VigiaDoTedio } from "./ze/vigia-do-tedio";

export type { ComandosDaConversa, ComandosDoJogo, InformacoesDoJogo } from "./telas/tela";

export interface OpcoesDaInterface extends OpcoesDoPersonagem {
  /** Quando a pincelada cobre a tela e a troca acontece; 0 (padrão, testes) troca na hora. */
  readonly atrasoDaTrocaMs?: number;
}

type NomeDaTela = "abertura" | "inicio" | "charada" | "desenho" | "veredito" | "placar";
/** Na etapa `inicio`, a apresentação escolhe entre abertura, apelido e placar (D1 do design). */
type TelaDoInicio = "abertura" | "inicio" | "placar";

/** Etapa da partida → tela (spec `interface-do-jogo`, "Telas da partida"; `fim` mostra o placar). */
const TELA_DA_ETAPA: Readonly<Record<Exclude<Etapa, "inicio">, NomeDaTela>> = {
  charada: "charada",
  desenhando: "desenho",
  julgando: "veredito",
  resultado: "veredito",
  fim: "placar",
};

/**
 * Monta as telas uma vez e, a cada mudança da partida, mostra só a da etapa atual e a atualiza. Antes da
 * partida, a abertura leva ao apelido (com o Pergunte ao Zé) e ao placar; no fim, o placar.
 *
 * @example
 * const tela = new InterfaceDoJogo(document.querySelector("main"), partida, informacoes, conversa);
 * partida.aoMudar((estado) => tela.mostrar(estado));
 */
export class InterfaceDoJogo {
  private readonly abertura: TelaAbertura;
  private readonly inicio: TelaInicio;
  private readonly desenho: TelaDesenho;
  private readonly veredito: TelaVeredito;
  private readonly charada: TelaCharada;
  private readonly telas: Readonly<Record<NomeDaTela, { readonly raiz: HTMLElement }>>;
  private readonly atualizaveis: Readonly<Partial<Record<NomeDaTela, Tela>>>;
  private readonly transicao: TransicaoPorPincelada;
  private readonly vigia: VigiaDoTedio;
  private partida: EstadoDaPartida = ESTADO_INICIAL;
  private telaDoInicio: TelaDoInicio = "abertura";
  private telaAtual: NomeDaTela | undefined;
  private conversaAberta = false;

  constructor(
    raiz: HTMLElement,
    private readonly comandos: ComandosDoJogo,
    informacoes: InformacoesDoJogo,
    private readonly conversa: ComandosDaConversa,
    opcoes: OpcoesDaInterface = {},
  ) {
    const opcoesDoZe: OpcoesDoPersonagem = opcoes.esperar === undefined ? {} : { esperar: opcoes.esperar };
    const confete = criar("canvas", { classe: "confete" });
    const comemoracao = new Confete(confete);
    const irPara = (tela: TelaDoInicio) => (): void => {
      this.irParaOInicio(tela);
    };
    this.abertura = new TelaAbertura(informacoes, irPara("inicio"), opcoesDoZe);
    this.inicio = new TelaInicio(comandos, conversa, irPara("placar"), opcoesDoZe);
    this.charada = new TelaCharada(comandos, opcoesDoZe);
    this.desenho = new TelaDesenho(comandos, informacoes, opcoesDoZe);
    this.veredito = new TelaVeredito(comandos, informacoes, {
      ...opcoesDoZe,
      comemorar: () => {
        comemoracao.disparar();
      },
    });
    const placar = new TelaPlacar(comandos, informacoes, () => {
      this.voltarDoPlacar();
    });
    this.atualizaveis = {
      inicio: this.inicio,
      charada: this.charada,
      desenho: this.desenho,
      veredito: this.veredito,
      placar,
    };
    this.telas = { abertura: this.abertura, ...this.atualizaveis } as Record<
      NomeDaTela,
      { readonly raiz: HTMLElement }
    >;
    this.transicao = new TransicaoPorPincelada(opcoes.atrasoDaTrocaMs ?? 0);
    raiz.replaceChildren(...Object.values(this.telas).map((tela) => tela.raiz), confete, this.transicao.raiz);
    this.vigia = this.criarVigiaDoTedio();
  }

  mostrar(estado: EstadoDaPartida): void {
    if (estado.etapa === "julgando" && this.partida.etapa !== "julgando")
      this.veredito.definirTracos(this.desenho.tracos);
    this.partida = estado;
    const atual = estado.etapa === "inicio" ? this.telaDoInicio : TELA_DA_ETAPA[estado.etapa];
    if (atual === "inicio" && !this.conversaAberta) this.conversa.abrir();
    this.trocarPara(atual);
    for (const [nome, tela] of Object.entries(this.atualizaveis)) {
      if (nome === atual || nome === "desenho") tela.atualizar(estado); // o desenho desliga a captura ao sair
    }
    this.vigia.pausar(atual === "desenho");
  }

  /** A conversa do "Pergunte ao Zé" fica dentro da tela de apelido. */
  mostrarConversa(estado: EstadoDaConversa): void {
    this.conversaAberta = estado.aberta;
    this.inicio.mostrarConversa(estado);
  }

  avisarRedesDivergentes(): void {
    this.inicio.avisarRedesDivergentes();
  }

  private irParaOInicio(tela: TelaDoInicio): void {
    this.telaDoInicio = tela;
    this.mostrar(this.partida);
    if (tela === "inicio") this.inicio.focar();
  }

  /** "Início" no placar: antes da partida volta ao apelido; no fim, começa outra partida pela abertura. */
  private voltarDoPlacar(): void {
    if (this.partida.etapa === "fim") {
      this.telaDoInicio = "abertura";
      this.comandos.novaPartida();
      return;
    }
    this.irParaOInicio("inicio");
  }

  private trocarPara(atual: NomeDaTela): void {
    const anterior = this.telaAtual;
    this.telaAtual = atual;
    const mostrar = (): void => {
      for (const [nome, tela] of Object.entries(this.telas)) tela.raiz.hidden = nome !== this.telaAtual;
    };
    if (atual === "abertura") this.abertura.mostrar();
    else this.abertura.esconder();
    if (anterior === undefined || anterior === atual) mostrar();
    else this.transicao.trocar(mostrar);
  }

  /** 30 s sem interação: o Zé da tela atual se entedia (spec `personagem-do-ze`). */
  private criarVigiaDoTedio(): VigiaDoTedio {
    return new VigiaDoTedio(window, {
      entediar: () => {
        for (const ze of this.zesVisiveis()) ze.entediar();
      },
      acordar: () => {
        for (const ze of this.zesVisiveis()) ze.acordar();
      },
    });
  }

  private zesVisiveis(): PersonagemDoZe[] {
    const porTela: Partial<Record<NomeDaTela, PersonagemDoZe>> = {
      abertura: this.abertura.personagem,
      inicio: this.inicio.personagem,
      charada: this.charada.personagem,
      veredito: this.veredito.personagem,
    };
    const ze = this.telaAtual === undefined ? undefined : porTela[this.telaAtual];
    return ze === undefined ? [] : [ze];
  }
}
