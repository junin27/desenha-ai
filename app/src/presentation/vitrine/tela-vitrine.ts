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
  pousarAbertura,
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
  /** Monta a animação (padrão: GSAP carregado sob demanda); os testes injetam uma de mentira. */
  readonly criarAnimacao?: (cenas: Record<IdDoCapitulo, HTMLElement>) => Promise<AnimacaoDaVitrine>;
}

/** O que a vitrine usa da linha do tempo do GSAP. */
export interface AnimacaoDaVitrine {
  time(segundos: number): unknown;
  kill(): unknown;
  /** Desfaz todos os estilos que a animação aplicou (letras, cartões, cenas) e a desliga. */
  revert(): unknown;
}

type Animacao = AnimacaoDaVitrine;

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
    this.animacao?.revert();
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
    // enquanto o GSAP carrega, só mostra o capítulo; sem animação nenhuma, corte direto com a abertura em repouso
    if (this.animado) this.mostrarSo(this.capitulo, false);
    else this.mostrarSo(this.capitulo);
    if (this.animado) void this.carregarAnimacao();
  }

  /** O GSAP só é carregado quando há animação (movimento reduzido e testes não o baixam). */
  private async carregarAnimacao(): Promise<void> {
    const cenas = this.cenas as Record<IdDoCapitulo, HTMLElement>;
    const criar = this.opcoes.criarAnimacao ?? animacaoComGsap;
    const animacao = await criar(cenas);
    if (this.cenas === cenas && this.animado) this.animacao = animacao;
    else animacao.revert();
    this.medidor.aquecer((this.opcoes.agoraMs ?? (() => performance.now()))());
  }

  /**
   * Abaixo de 30 fps: larga a animação no meio. Só `kill()` deixaria cada elemento onde a animação parou (as
   * letras do título invisíveis no meio da abertura); `revert()` devolve tudo ao estado final do CSS.
   */
  private cairParaCorteDireto(): void {
    this.animacao?.revert();
    this.animacao = undefined;
    for (const cena of Object.values(this.cenas))
      Object.assign(cena.style, { transform: "", clipPath: "", opacity: "" });
    for (const video of this.videos) video.pause();
  }

  /**
   * Corte direto: só o capítulo `id` aparece e a abertura fica em repouso (mancha pronta, título visível). Enquanto
   * o GSAP carrega, `pousar` é falso: senão a gota já começaria como mancha.
   */
  private mostrarSo(id: IdDoCapitulo, pousar = true): void {
    if (pousar && this.cenas.abertura && !this.animacao) pousarAbertura(this.cenas.abertura);
    for (const [nome, cena] of Object.entries(this.cenas)) {
      cena.style.visibility = nome === id ? "visible" : "hidden";
      cena.style.opacity = nome === id ? "1" : "0";
    }
  }
}

/**
 * Carrega o GSAP sob demanda e embrulha a linha do tempo: ela tem um método `then` (espera a animação acabar), então
 * devolvê-la direto de uma função `async` faria o `await` esperar a história inteira terminar.
 */
async function animacaoComGsap(cenas: Record<IdDoCapitulo, HTMLElement>): Promise<AnimacaoDaVitrine> {
  const { montarAnimacao } = await import("./animacao-da-vitrine");
  const linha = montarAnimacao(cenas);
  return {
    time: (segundos) => linha.time(segundos),
    kill: () => linha.kill(),
    revert: () => linha.revert(),
  };
}
