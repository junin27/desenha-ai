import { gsap } from "gsap";
import { DrawSVGPlugin } from "gsap/DrawSVGPlugin";
import { MorphSVGPlugin } from "gsap/MorphSVGPlugin";
import { SplitText } from "gsap/SplitText";
import type { IdDoCapitulo } from "../../domain/vitrine/capitulos";
import {
  geometriaDoPortal,
  quadroDoPortal,
  suavizar,
  type ObjetoDoPortal,
} from "../../domain/vitrine/portal";
import { INICIO_DAS_ENTRADAS, INICIO_DOS_CAPITULOS as INICIO } from "./controle-da-historia";
import { entradasDosCapitulos, nascerDaTela, type Cenas } from "./entradas-dos-capitulos";
import { CongeladorDeVideo } from "./congelador-de-video";
import { aplicarQuadro, medirNaCena } from "./motor-do-portal";

gsap.registerPlugin(DrawSVGPlugin, MorphSVGPlugin, SplitText);

/** Afastamento (portais "sair"): a cena atual encolhe e some no fim, em `FASE_DO_SUMIR` do tempo. */
const PREVIA_DO_AFASTAMENTO = 0.5;
export const DURACAO_DO_PORTAL = 1.7;
const TOTAL_DO_AFASTAMENTO = PREVIA_DO_AFASTAMENTO + DURACAO_DO_PORTAL;
const FASE_DO_SUMIR = PREVIA_DO_AFASTAMENTO / TOTAL_DO_AFASTAMENTO;
/**
 * A cena seguinte fica escondida no objeto (spec "Transição por portal"): parada, opacidade 0; no zoom ela
 * surge de dentro do objeto e já está inteira na metade dele.
 */
const INICIO_DO_SURGIMENTO = 0.85;
const FIM_DO_SURGIMENTO = 1;

/** Cena nova: invisível até o objeto cobrir a tela com a sua cor; aí surge em tela cheia (corte pela cor). */
export function opacidadeDaCenaNova(progressoDoZoom: number): number {
  const fracao = (progressoDoZoom - INICIO_DO_SURGIMENTO) / (FIM_DO_SURGIMENTO - INICIO_DO_SURGIMENTO);
  return Math.min(1, Math.max(0, fracao));
}

interface Portal {
  readonly fora: IdDoCapitulo;
  readonly dentro: IdDoCapitulo;
  readonly objeto: string;
  readonly forma?: "circulo";
  readonly canto?: number;
  /** Elemento principal da cena seguinte: é ele que aparece dentro do objeto, e não a cena inteira encolhida. */
  readonly foco?: string;
  /** Pedaço da cena seguinte (frações da tela) por onde a câmera entra, em vez de um elemento. */
  readonly focoNaTela?: {
    readonly x: number;
    readonly y: number;
    readonly largura: number;
    readonly altura: number;
  };
  /** O objeto é o buraco do "ô" (o miolo da letra), e não a letra inteira. */
  readonly buraco?: true;
  readonly t: number;
  readonly sentido?: "sair";
}

/** O roteiro de transições: cada objeto esconde o capítulo seguinte até o gesto. */
const PORTAIS: readonly Portal[] = [
  {
    fora: "abertura",
    dentro: "jogo",
    objeto: "so",
    forma: "circulo",
    buraco: true,
    t: 4.5,
  },
  { fora: "jogo", dentro: "desenho", objeto: "janela", canto: 2, foco: ".folha-vitrine", t: 11.3 },
  { fora: "desenho", dentro: "cnn", objeto: "desenho", foco: ".grade-caixa", t: 18.6 },
  { fora: "cnn", dentro: "lstm", objeto: "grade", foco: ".trilha-vitrine", t: 25.6 },
  {
    fora: "lstm",
    dentro: "ze",
    objeto: "saida",
    canto: 24,
    foco: ".lugar-do-ze",
    t: 32.6,
  },
  { fora: "ze", dentro: "destilacao", objeto: "cabeca", forma: "circulo", foco: ".jarro", t: 39.6 },
  {
    fora: "destilacao",
    dentro: "qlora",
    objeto: "jarro",
    canto: 40,
    foco: ".pesos",
    t: 46.6,
  },
  { fora: "qlora", dentro: "quantizacao", objeto: "peso", canto: 6, foco: ".arquivo", t: 53.6 },
  { fora: "engenharia", dentro: "quantizacao", objeto: "hex-ze", forma: "circulo", t: 60.6, sentido: "sair" },
  { fora: "convite", dentro: "engenharia", objeto: "janela", canto: 2, t: 67.6, sentido: "sair" },
];

/**
 * Quando a história sai do capítulo: no mergulho o capítulo é o `fora`; no afastamento é o `dentro` (que encolhe).
 * Comparar só `fora` pegava o afastamento em que a engenharia recebe a quantização e tirava o cartão dela antes
 * de ela começar.
 */
export function saidaDoCapitulo(id: IdDoCapitulo): number {
  const saida = PORTAIS.find((p) => (p.sentido === "sair" ? p.dentro : p.fora) === id);
  return saida?.t ?? INICIO[id] + 6;
}

/**
 * O cartão de texto só sai quando o portal começa: a parada fica 0,05 s antes do portal, e um cartão que saía
 * 0,3 s antes deixava o capítulo parado sem texto nenhum.
 */
export function inicioDaSaidaDoCartao(id: IdDoCapitulo): number {
  return saidaDoCapitulo(id);
}

/** Monta a linha do tempo pausada da história inteira; quem a dirige é o `ControleDaHistoria`. */
export function montarAnimacao(cenas: Cenas): gsap.core.Timeline {
  const tl = gsap.timeline({ paused: true, defaults: { ease: "power3.out" } });
  gsap.set(Object.values(cenas), { autoAlpha: 0 });
  gsap.set(cenas.abertura, { autoAlpha: 1 });
  entradaDaAbertura(tl, cenas.abertura);
  for (const id of [
    "jogo",
    "desenho",
    "cnn",
    "lstm",
    "ze",
    "destilacao",
    "qlora",
    "quantizacao",
    "engenharia",
  ] as const) {
    cartao(tl, cenas[id], INICIO_DAS_ENTRADAS[id] + 0.1, inicioDaSaidaDoCartao(id));
  }
  entradasDosCapitulos(tl, cenas);
  for (const portal of PORTAIS) adicionarPortal(tl, cenas, portal);
  for (const portal of PORTAIS) {
    if (portal.sentido !== "sair")
      nascerDaTela(tl, cenas[portal.dentro], portal.t, INICIO_DAS_ENTRADAS[portal.dentro]);
  }
  tl.to({}, { duration: 1 }, INICIO.convite + 4.7);
  return tl;
}

function adicionarPortal(tl: gsap.core.Timeline, cenas: Cenas, portal: Portal): void {
  if (portal.sentido === "sair") adicionarAfastamento(tl, cenas, portal);
  else adicionarEntrada(tl, cenas, portal);
}

/**
 * Mergulho no objeto: a cena seguinte só aparece quando a câmera anda e surge de dentro do objeto. A geometria
 * é medida no primeiro quadro do zoom, com as entradas do capítulo já terminadas (D3).
 */
function adicionarEntrada(tl: gsap.core.Timeline, cenas: Cenas, portal: Portal): void {
  const fora = cenas[portal.fora],
    dentro = cenas[portal.dentro];
  let geometria: ReturnType<typeof geometriaDoPortal> | undefined;
  const zoom = { r: 0 };
  const congelar = congeladorDoPortal(fora, dentro);
  tl.set(dentro, { autoAlpha: 1, zIndex: 2 }, portal.t).set(fora, { zIndex: 1 }, portal.t);
  tl.fromTo(
    zoom,
    { r: 0 },
    {
      r: 1,
      duration: DURACAO_DO_PORTAL,
      ease: "none",
      immediateRender: false,
      onUpdate: () => {
        geometria ??= geometriaDoPortal(
          objetoDoPortal(fora, portal),
          telaAtual(),
          focoDoPortal(dentro, portal),
        );
        congelar(zoom.r);
        aplicarQuadro(fora, dentro, quadroDoPortal(geometria, suavizar(zoom.r)));
        // a cena nova não é recortada nem ampliada: o mergulho é na cena atual, e a nova surge da cor do objeto
        if (zoom.r < 1)
          Object.assign(dentro.style, {
            transform: "",
            clipPath: "",
            opacity: String(opacidadeDaCenaNova(zoom.r)),
          });
      },
    },
    portal.t,
  );
  tl.set(fora, { autoAlpha: 0 }, portal.t + DURACAO_DO_PORTAL);
}

function telaAtual(): { largura: number; altura: number } {
  return { largura: window.innerWidth, altura: window.innerHeight };
}

function adicionarAfastamento(tl: gsap.core.Timeline, cenas: Cenas, portal: Portal): void {
  const fora = cenas[portal.fora],
    dentro = cenas[portal.dentro];
  const progresso = { r: 0 };
  let geometria: ReturnType<typeof geometriaDoPortal> | undefined;
  const congelar = congeladorDoPortal(fora, dentro);
  const atualizar = (): void => {
    geometria ??= geometriaDoPortal(objetoDoPortal(fora, portal), {
      largura: window.innerWidth,
      altura: window.innerHeight,
    });
    const r = progresso.r;
    congelar(r);
    const u = 1 - suavizar(Math.min(1, r / (1 - FASE_DO_SUMIR)));
    aplicarQuadro(
      fora,
      dentro,
      quadroDoPortal(geometria, u),
      r < 1 - FASE_DO_SUMIR ? 1 : 1 - (r - (1 - FASE_DO_SUMIR)) / FASE_DO_SUMIR,
    );
  };
  tl.set(fora, { autoAlpha: 1, zIndex: 1 }, portal.t).set(dentro, { zIndex: 2 }, portal.t);
  tl.fromTo(
    progresso,
    { r: 0 },
    { r: 1, duration: TOTAL_DO_AFASTAMENTO, ease: "none", immediateRender: false, onUpdate: atualizar },
    portal.t,
  );
  tl.set(dentro, { autoAlpha: 0 }, portal.t + TOTAL_DO_AFASTAMENTO);
}

/** Vídeo das duas cenas parado (imagem) enquanto o zoom anda; volta a tocar no começo e no fim do portal. */
function congeladorDoPortal(fora: HTMLElement, dentro: HTMLElement): (progresso: number) => void {
  const congeladores = [new CongeladorDeVideo(fora), new CongeladorDeVideo(dentro)];
  return (progresso) => {
    const andando = progresso > 0 && progresso < 1;
    for (const c of congeladores) {
      if (andando) c.congelar();
      else c.soltar();
    }
  };
}

function focoDoPortal(dentro: HTMLElement, portal: Portal): ReturnType<typeof medirNaCena> | undefined {
  if (portal.focoNaTela) {
    const { x, y, largura, altura } = portal.focoNaTela;
    const [w, h] = [window.innerWidth, window.innerHeight];
    return { x: x * w, y: y * h, largura: largura * w, altura: altura * h };
  }
  const elemento = portal.foco === undefined ? null : dentro.querySelector(portal.foco);
  return elemento === null ? undefined : medirNaCena(elemento);
}

function objetoDoPortal(cena: HTMLElement, portal: Portal): ObjetoDoPortal {
  const alvo = cena.querySelector(`[data-objeto="${portal.objeto}"]`) ?? cena;
  const r = medirNaCena(alvo === cena ? cena : alvo);
  if (portal.objeto === "so") return bolinhaDoO(alvo, r, portal.buraco ? RAIO_DO_BURACO_DO_O : 0.3);
  return { ...r, forma: portal.forma ?? "retangulo", canto: portal.canto ?? 18 };
}

/** A bolinha do "ô" (o SplitText separa as letras): a roça aparece dentro dela. */
/** Raio do buraco (miolo) do "ô", em frações da largura da letra. */
const RAIO_DO_BURACO_DO_O = 0.1; // ~0,14/raiz de 2: o quadrado cabe no buraco e a tela fica só escura

function bolinhaDoO(
  alvo: Element,
  palavra: ReturnType<typeof medirNaCena>,
  fracaoDoRaio: number,
): ObjetoDoPortal {
  const letra = [...alvo.querySelectorAll("div")].find((d) => d.textContent === "ô");
  const r = letra === undefined ? palavra : medirNaCena(letra);
  const raio = r.largura * fracaoDoRaio,
    cx = r.x + r.largura / 2,
    cy = r.y + r.altura * 0.62;
  return { x: cx - raio, y: cy - raio, largura: raio * 2, altura: raio * 2, forma: "circulo" };
}

function cartao(tl: gsap.core.Timeline, cena: HTMLElement, entra: number, sai: number): void {
  const c = cena.querySelector(".cartao-vitrine");
  const titulo = c?.querySelector("h2"),
    texto = c?.querySelector(".texto");
  if (!c || !titulo || !texto) return;
  tl.from(c, { x: -90, rotation: -4, opacity: 0, duration: 0.6, ease: "back.out(1.6)" }, entra)
    .from(
      new SplitText(titulo, { type: "chars,words" }).chars,
      { yPercent: 110, opacity: 0, duration: 0.5, ease: "back.out(2)", stagger: 0.02 },
      entra + 0.2,
    )
    .from(
      new SplitText(texto, { type: "words" }).words,
      { y: 16, opacity: 0, duration: 0.35, stagger: 0.012 },
      entra + 0.45,
    )
    .to(c, { x: -70, opacity: 0, duration: 0.4, ease: "power2.in" }, sai);
}

function entradaDaAbertura(tl: gsap.core.Timeline, cena: HTMLElement): void {
  const titulo = cena.querySelector(".titulo-vitrine");
  tl.from(cena.querySelector('[data-parte="gota"]'), { y: -560, duration: 0.6, ease: "power2.in" }, 0.2)
    .to(
      cena.querySelector('[data-parte="gota"]'),
      {
        morphSVG: cena.querySelector('[data-parte="forma-da-mancha"]') as SVGPathElement,
        duration: 0.4,
        ease: "back.out(2.5)",
      },
      0.8,
    )
    .to(
      cena.querySelector('[data-parte="mancha"]'),
      { scale: 1.75, svgOrigin: "800 450", duration: 0.4 },
      1.1,
    );
  if (titulo) {
    tl.set(titulo, { visibility: "visible" }, 1.1).from(
      new SplitText(titulo, { type: "chars,words" }).chars,
      {
        yPercent: 130,
        opacity: 0,
        rotate: () => gsap.utils.random(-25, 25),
        duration: 0.7,
        ease: "back.out(2.2)",
        stagger: 0.03,
      },
      1.1,
    );
  }
}
