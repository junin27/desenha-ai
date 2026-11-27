import "./vitrine.css";
import type { DesenhosDaVitrine } from "../../application/desenhos-da-vitrine";
import type { PalpitesNaFracao } from "../../application/palpites-da-vitrine";
import type { ResumoDaVitrine } from "../../application/resumo-da-vitrine";
import type { Desenho } from "../../domain/desenho/desenho";
import { CAPITULOS, proximoDesenho, type IdDoCapitulo } from "../../domain/vitrine/capitulos";
import { criar } from "../dom";
import type { OpcoesDoPersonagem, PersonagemDoZe } from "../ze/personagem";
import {
  cenaAbertura,
  cenaCnn,
  cenaDesenho,
  cenaJogo,
  cenaLstm,
  type DadosDasCenas,
} from "./cenas-da-historia";
import {
  cenaConvite,
  cenaDestilacao,
  cenaEngenharia,
  cenaQlora,
  cenaQuantizacao,
  cenaZe,
} from "./cenas-tecnicas";
import { capituloEm, ControleDaHistoria, ligarEntrada } from "./controle-da-historia";
import { MedidorDeQuadros } from "./medidor-de-quadros";
import { PortalDoApelido } from "./portal-do-apelido";

/** O que a vitrine precisa do resto do jogo (montado no `main.ts`). */
export interface ConteudoDaVitrine {
  readonly desenhos: DesenhosDaVitrine | undefined;
  readonly resumo: ResumoDaVitrine;
  readonly nomesDasCategorias: readonly string[];
  palpitesDe(desenho: Desenho): Promise<readonly PalpitesNaFracao[] | undefined>;
  /** Número em [0, 1) para sortear o desenho da volta. */
  sortear(): number;
}

export interface OpcoesDaVitrine extends OpcoesDoPersonagem {
  /** `false` (testes) ou movimento reduzido: troca de capítulo por corte direto, sem GSAP. */
  readonly animar?: boolean;
  readonly movimentoReduzido?: boolean;
  readonly agoraMs?: () => number;
  readonly pedirQuadro?: (passo: () => void) => void;
}

type Animacao = { time(segundos: number): unknown; kill(): unknown };

/** A vitrine (spec `vitrine-da-abertura`): primeira tela do jogo, história em 11 capítulos, convite ao apelido. */
export class TelaVitrine {
  readonly raiz = criar("div", { classe: "tela tela-vitrine", dados: { tela: "abertura" } });
  readonly portal: PortalDoApelido;
  private readonly palco = criar("div", { classe: "palco-vitrine" });
  private readonly controle: ControleDaHistoria;
  private readonly medidor = new MedidorDeQuadros();
  private readonly reduzido: boolean;
  private cenas: Partial<Record<IdDoCapitulo, HTMLElement>> = {};
  private videos: HTMLVideoElement[] = [];
  private zes: PersonagemDoZe[] = [];
  private animacao: Animacao | undefined;
  private desenhoAtual: number | undefined;
  private visivel = false;
  private ultimoTempo = 0;
  private montagem: Promise<void> | undefined;
  /** Quantas vezes a vitrine pediu palpites às redes (o teste "Partida em andamento" confere). */
  pedidosDePalpite = 0;

  constructor(
    private readonly conteudo: ConteudoDaVitrine,
    private readonly aoJogar: (origem: HTMLElement) => void,
    private readonly opcoes: OpcoesDaVitrine = {},
  ) {
    this.reduzido = opcoes.movimentoReduzido ?? false;
    this.controle = new ControleDaHistoria(opcoes.agoraMs ?? (() => performance.now()));
    this.portal = new PortalDoApelido(() => this.animado);
    const pular = criar("button", {
      classe: "pular-vitrine",
      texto: "Jogar agora ›",
      dados: { acao: "jogar-agora" },
    });
    pular.type = "button";
    pular.addEventListener("click", () => {
      this.aoJogar(pular);
    });
    this.raiz.append(this.palco, pular);
    ligarEntrada(window, this.controle, () => this.visivel);
  }

  get personagem(): PersonagemDoZe | undefined {
    return this.zes[0];
  }

  get capitulo(): IdDoCapitulo {
    return capituloEm(this.controle.segundos);
  }

  /** Termina quando as cenas (com os palpites das redes) estão montadas. */
  get pronta(): Promise<void> {
    return this.montagem ?? Promise.resolve();
  }

  private get animado(): boolean {
    return (this.opcoes.animar ?? true) && !this.reduzido && !this.medidor.lento;
  }

  mostrar(): void {
    if (this.visivel) return;
    this.visivel = true;
    this.medidor.zerarJanela();
    this.montagem ??= this.montar();
    void this.montagem.then(() => {
      if (!this.visivel) return;
      if (this.animado) for (const video of this.videos) void video.play().catch(() => undefined);
      this.agendar();
    });
  }

  esconder(): void {
    this.visivel = false;
    for (const video of this.videos) video.pause();
  }

  /** "Início" no placar: a história volta ao capítulo de abertura. */
  voltarAoComeco(): void {
    this.controle.irPara(0);
  }

  /** Um quadro: avança a história e desenha (público para os testes dirigirem o tempo). */
  passo(): void {
    if (!this.visivel) return;
    const lentoAntes = this.medidor.lento;
    const lentoAgora = this.medidor.registrar((this.opcoes.agoraMs ?? (() => performance.now()))());
    if (!lentoAntes && lentoAgora) this.cairParaCorteDireto();
    const tempo = this.controle.passo();
    if (tempo < this.ultimoTempo - 30) void this.trocarDeDesenho(); // recomeçou: outra volta, outro desenho
    this.ultimoTempo = tempo;
    if (this.animado && this.animacao) this.animacao.time(tempo);
    else this.mostrarSo(capituloEm(tempo));
  }

  private agendar(): void {
    const pedir = this.opcoes.pedirQuadro ?? ((passo: () => void) => requestAnimationFrame(passo));
    const laco = (): void => {
      if (!this.visivel) return;
      this.passo();
      pedir(laco);
    };
    pedir(laco);
  }

  private async montar(): Promise<void> {
    const lista = this.conteudo.desenhos?.desenhos ?? [];
    this.desenhoAtual = proximoDesenho(lista.length, this.desenhoAtual, this.conteudo.sortear());
    const desenho = lista[this.desenhoAtual];
    this.pedidosDePalpite += desenho === undefined ? 0 : 1;
    const palpites = desenho === undefined ? undefined : await this.conteudo.palpitesDe(desenho.desenho);
    this.construir({
      desenho,
      fonteDosDesenhos: this.conteudo.desenhos?.fonte,
      palpites,
      resumo: this.conteudo.resumo,
      nomesDasCategorias: this.conteudo.nomesDasCategorias,
    });
  }

  private async trocarDeDesenho(): Promise<void> {
    if (!this.visivel) return;
    this.montagem = this.montar();
    await this.montagem;
  }

  private construir(dados: DadosDasCenas): void {
    this.animacao?.kill();
    const jogo = cenaJogo(dados, this.opcoes);
    const ze = cenaZe(dados, this.opcoes);
    const convite = cenaConvite(this.opcoes, (botao) => {
      this.aoJogar(botao);
    });
    this.cenas = {
      abertura: cenaAbertura(),
      jogo: jogo.cena,
      desenho: cenaDesenho(dados),
      cnn: cenaCnn(dados),
      lstm: cenaLstm(dados),
      ze: ze.cena,
      destilacao: cenaDestilacao(dados),
      qlora: cenaQlora(dados),
      quantizacao: cenaQuantizacao(dados),
      engenharia: cenaEngenharia(dados),
      convite: convite.cena,
    };
    this.videos = [jogo.video, convite.video];
    this.zes = [convite.ze, jogo.ze, ze.ze];
    this.palco.replaceChildren(...CAPITULOS.map(({ id }) => this.cenas[id]).filter((c) => c !== undefined));
    this.animacao = undefined;
    this.mostrarSo(this.capitulo); // enquanto o GSAP carrega (ou sem animação), corte direto
    if (this.animado) void this.carregarAnimacao();
  }

  /** O GSAP só é carregado quando há animação (movimento reduzido e testes não o baixam). */
  private async carregarAnimacao(): Promise<void> {
    const cenas = this.cenas as Record<IdDoCapitulo, HTMLElement>;
    const { montarAnimacao } = await import("./animacao-da-vitrine");
    if (this.cenas === cenas && this.animado) this.animacao = montarAnimacao(cenas);
    this.medidor.aquecer((this.opcoes.agoraMs ?? (() => performance.now()))());
  }

  private cairParaCorteDireto(): void {
    this.animacao?.kill();
    this.animacao = undefined;
    for (const cena of Object.values(this.cenas))
      Object.assign(cena.style, { transform: "", clipPath: "", opacity: "" });
    for (const video of this.videos) video.pause();
  }

  private mostrarSo(id: IdDoCapitulo): void {
    for (const [nome, cena] of Object.entries(this.cenas)) {
      cena.style.visibility = nome === id ? "visible" : "hidden";
      cena.style.opacity = nome === id ? "1" : "0";
    }
  }
}
