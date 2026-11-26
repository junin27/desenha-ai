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
import { INICIO_DOS_CAPITULOS as INICIO } from "./controle-da-historia";
import { entradasDosCapitulos, type Cenas } from "./entradas-dos-capitulos";
import { aplicarQuadro, medirNaCena } from "./motor-do-portal";

gsap.registerPlugin(DrawSVGPlugin, MorphSVGPlugin, SplitText);

/** Prévia: a cena nova aparece dentro do objeto antes de a câmera andar (spec: pelo menos 0,4 s). */
export const PREVIA_DO_PORTAL = 0.5;
export const DURACAO_DO_PORTAL = 1.7;
const TOTAL_DO_PORTAL = PREVIA_DO_PORTAL + DURACAO_DO_PORTAL;
const FASE_DA_PREVIA = PREVIA_DO_PORTAL / TOTAL_DO_PORTAL;

interface Portal {
  readonly fora: IdDoCapitulo;
  readonly dentro: IdDoCapitulo;
  readonly objeto: string;
  readonly forma?: "circulo";
  readonly canto?: number;
  readonly t: number;
  readonly sentido?: "sair";
}

/** O roteiro de transições do protótipo 16 aprovado (cada objeto já mostra o capítulo seguinte). */
const PORTAIS: readonly Portal[] = [
  { fora: "abertura", dentro: "jogo", objeto: "so", forma: "circulo", t: 4.5 },
  { fora: "jogo", dentro: "desenho", objeto: "janela", canto: 2, t: 11.3 },
  { fora: "desenho", dentro: "cnn", objeto: "desenho", t: 18.6 },
  { fora: "cnn", dentro: "lstm", objeto: "grade", t: 25.6 },
  { fora: "lstm", dentro: "ze", objeto: "saida", canto: 24, t: 32.6 },
  { fora: "ze", dentro: "destilacao", objeto: "cabeca", forma: "circulo", t: 39.6 },
  { fora: "destilacao", dentro: "qlora", objeto: "jarro", canto: 40, t: 46.6 },
  { fora: "qlora", dentro: "quantizacao", objeto: "peso", canto: 6, t: 53.6 },
  { fora: "engenharia", dentro: "quantizacao", objeto: "hex-ze", forma: "circulo", t: 60.6, sentido: "sair" },
  { fora: "convite", dentro: "engenharia", objeto: "janela", canto: 2, t: 67.6, sentido: "sair" },
];

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
    cartao(
      tl,
      cenas[id],
      INICIO[id] + 0.1,
      (PORTAIS.find((p) => p.fora === id || (p.sentido === "sair" && p.dentro === id))?.t ?? INICIO[id] + 6) -
        0.3,
    );
  }
  entradasDosCapitulos(tl, cenas);
  for (const portal of PORTAIS) adicionarPortal(tl, cenas, portal);
  tl.to({}, { duration: 1 }, INICIO.convite + 4.7);
  return tl;
}

function adicionarPortal(tl: gsap.core.Timeline, cenas: Cenas, portal: Portal): void {
  const fora = cenas[portal.fora],
    dentro = cenas[portal.dentro];
  const progresso = { r: 0 };
  let geometria: ReturnType<typeof geometriaDoPortal> | undefined;
  const atualizar = (): void => {
    // medido na 1ª vez que a câmera chega aqui: as animações de entrada já terminaram (D3)
    geometria ??= geometriaDoPortal(objetoDoPortal(fora, portal), {
      largura: window.innerWidth,
      altura: window.innerHeight,
    });
    const r = progresso.r;
    if (portal.sentido === "sair") {
      const u = 1 - suavizar(Math.min(1, r / (1 - FASE_DA_PREVIA)));
      aplicarQuadro(
        fora,
        dentro,
        quadroDoPortal(geometria, u),
        r < 1 - FASE_DA_PREVIA ? 1 : 1 - (r - (1 - FASE_DA_PREVIA)) / FASE_DA_PREVIA,
      );
    } else {
      const u = r < FASE_DA_PREVIA ? 0 : suavizar((r - FASE_DA_PREVIA) / (1 - FASE_DA_PREVIA));
      aplicarQuadro(fora, dentro, quadroDoPortal(geometria, u), Math.min(1, r / FASE_DA_PREVIA));
    }
  };
  if (portal.sentido === "sair")
    tl.set(fora, { autoAlpha: 1, zIndex: 1 }, portal.t).set(dentro, { zIndex: 2 }, portal.t);
  else tl.set(dentro, { autoAlpha: 1, zIndex: 2 }, portal.t).set(fora, { zIndex: 1 }, portal.t);
  tl.fromTo(
    progresso,
    { r: 0 },
    { r: 1, duration: TOTAL_DO_PORTAL, ease: "none", immediateRender: false, onUpdate: atualizar },
    portal.t,
  );
  tl.set(portal.sentido === "sair" ? dentro : fora, { autoAlpha: 0 }, portal.t + TOTAL_DO_PORTAL);
}

function objetoDoPortal(cena: HTMLElement, portal: Portal): ObjetoDoPortal {
  const alvo = cena.querySelector(`[data-objeto="${portal.objeto}"]`) ?? cena;
  const r = medirNaCena(alvo === cena ? cena : alvo);
  if (portal.objeto === "so") return bolinhaDoO(alvo, r);
  return { ...r, forma: portal.forma ?? "retangulo", canto: portal.canto ?? 18 };
}

/** A bolinha do "ô" (o SplitText separa as letras): a roça aparece dentro dela. */
function bolinhaDoO(alvo: Element, palavra: ReturnType<typeof medirNaCena>): ObjetoDoPortal {
  const letra = [...alvo.querySelectorAll("div")].find((d) => d.textContent === "ô");
  const r = letra === undefined ? palavra : medirNaCena(letra);
  const raio = r.largura * 0.3,
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
