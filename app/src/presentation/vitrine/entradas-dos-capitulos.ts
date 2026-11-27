import { gsap } from "gsap";
import type { IdDoCapitulo } from "../../domain/vitrine/capitulos";
import { INICIO_DOS_CAPITULOS as INICIO } from "./controle-da-historia";

export type Cenas = Readonly<Record<IdDoCapitulo, HTMLElement>>;

/** O que acontece dentro de cada capítulo (traço real se desenhando, grade, redes, contadores...). */
export function entradasDosCapitulos(tl: gsap.core.Timeline, c: Cenas): void {
  entradasDaHistoria(tl, c);
  entradasTecnicas(tl, c);
  entradaDoConvite(tl, c);
  contador(tl, c.destilacao.querySelector("[data-ate]"), INICIO.destilacao + 0.6, 3.6);
  mostrarChutesDaLstm(tl, c.lstm);
}

const de = (cena: HTMLElement, seletor: string): Element[] => [...cena.querySelectorAll(seletor)];

function entradasDaHistoria(tl: gsap.core.Timeline, c: Cenas): void {
  tl.from(
    c.jogo.querySelector(".ze-da-vitrine"),
    { yPercent: 120, duration: 0.8, ease: "back.out(1.5)" },
    INICIO.jogo + 0.3,
  )
    // A folha não entra: ela já aparece dentro da janela da casa antes do portal (prévia com foco), com o
    // desenho pronto, para a janela mostrar algo reconhecível; depois do zoom ele é retraçado traço a traço.
    .set(de(c.desenho, ".traco-vitrine"), { drawSVG: "100%" }, 0)
    .fromTo(
      de(c.desenho, ".traco-vitrine"),
      { drawSVG: "0%" },
      { drawSVG: "100%", duration: 0.5, stagger: 0.45, ease: "power1.inOut", immediateRender: false },
      INICIO.desenho + 0.8,
    )
    .from(
      de(c.cnn, ".pilha-vitrine .plano"),
      { x: -360, opacity: 0, rotationY: 40, duration: 0.7, stagger: 0.28 },
      INICIO.cnn + 1.1,
    )
    .from(
      de(c.cnn, ".barras-vitrine li"),
      { x: 120, opacity: 0, duration: 0.5, stagger: 0.15 },
      INICIO.cnn + 2.7,
    )
    // pronto na prévia dentro da grade da CNN; depois do zoom é retraçado na ordem dos traços
    .set(de(c.lstm, ".traco-vitrine"), { drawSVG: "100%" }, 0)
    .fromTo(
      de(c.lstm, ".traco-vitrine"),
      { drawSVG: "0%" },
      { drawSVG: "100%", duration: 0.4, stagger: 0.3, immediateRender: false },
      INICIO.lstm + 0.3,
    )
    .from(
      de(c.lstm, ".celula"),
      // sem começar transparente: as células já aparecem dentro da grade da CNN (prévia com foco)
      { y: 24, duration: 0.5, stagger: 0.1, ease: "back.out(1.6)" },
      INICIO.lstm + 0.2,
    )
    .fromTo(
      c.lstm.querySelector(".memoria-vitrine i"),
      { left: "0%" },
      { left: "calc(100% - 20px)", duration: 3, ease: "none" },
      INICIO.lstm + 1.1,
    );
}

function entradasTecnicas(tl: gsap.core.Timeline, c: Cenas): void {
  tl.from(
    de(c.ze, ".token"),
    { scale: 0, opacity: 0, duration: 0.25, stagger: 0.2, ease: "back.out(3)" },
    INICIO.ze + 0.8,
  )
    .from(
      c.destilacao.querySelector(".professor"),
      { y: -260, duration: 0.8, ease: "back.out(1.4)" },
      INICIO.destilacao,
    )
    // cheio na prévia dentro da cabeça do Zé; depois do zoom esvazia e enche de novo com a destilação
    .set(c.destilacao.querySelector(".nivel"), { height: "68%" }, 0)
    .fromTo(
      c.destilacao.querySelector(".nivel"),
      { height: "0%" },
      { height: "68%", duration: 3.6, ease: "none", immediateRender: false },
      INICIO.destilacao + 0.6,
    )
    .from(c.qlora.querySelector(".adaptador.a"), { x: -400, opacity: 0, duration: 0.6 }, INICIO.qlora + 1.3)
    .from(c.qlora.querySelector(".adaptador.b"), { y: -200, opacity: 0, duration: 0.6 }, INICIO.qlora + 1.6)
    .to(
      de(c.qlora, ".peso"),
      { boxShadow: "inset 0 0 0 5px #b5401f", duration: 0.3, stagger: { each: 0.015, grid: [6, 10] } },
      INICIO.qlora + 2.1,
    )
    .to(
      de(c.quantizacao, ".bits i:nth-child(n+9)"),
      {
        y: 120,
        opacity: 0,
        rotation: () => gsap.utils.random(-90, 90),
        duration: 0.6,
        stagger: 0.05,
        ease: "power2.in",
      },
      INICIO.quantizacao + 1.3,
    )
    .to(
      de(c.quantizacao, ".bits i:nth-child(-n+8)"),
      { backgroundColor: "#2f7d32", color: "#fff6df", duration: 0.3, stagger: 0.04 },
      INICIO.quantizacao + 1.7,
    )
    .from(
      de(c.engenharia, ".selos span"),
      { y: 60, opacity: 0, duration: 0.4, stagger: 0.1 },
      INICIO.engenharia + 1.1,
    );
}

function entradaDoConvite(tl: gsap.core.Timeline, c: Cenas): void {
  tl.from(
    c.convite.querySelector(".ze-do-convite"),
    { yPercent: 120, duration: 0.8, ease: "back.out(1.5)" },
    INICIO.convite + 0.2,
  ).fromTo(
    c.convite.querySelector(".jogar-vitrine"),
    { scale: 0 },
    { scale: 1, duration: 0.6, ease: "back.out(2.5)" },
    INICIO.convite + 0.9,
  );
}

function contador(tl: gsap.core.Timeline, alvo: Element | null, inicio: number, duracao: number): void {
  if (!(alvo instanceof HTMLElement)) return;
  const ate = Number(alvo.dataset.ate),
    estado = { v: 0 };
  tl.fromTo(
    estado,
    { v: 0 },
    {
      v: ate,
      duration: duracao,
      ease: "none",
      immediateRender: false,
      onUpdate: () => {
        alvo.textContent = Math.round(estado.v).toLocaleString("pt-BR");
      },
    },
    inicio,
  );
}

/** O chute da LSTM muda conforme o traço avança (25, 50, 75 e 100% dos pontos). */
function mostrarChutesDaLstm(tl: gsap.core.Timeline, cena: HTMLElement): void {
  const chutes = [...cena.querySelectorAll<HTMLElement>(".saida-lstm .chute")];
  gsap.set(chutes, { autoAlpha: 0 });
  chutes.forEach((chute, i) => {
    tl.set(chutes, { autoAlpha: 0 }, INICIO.lstm + 1.4 + i * 0.9).set(
      chute,
      { autoAlpha: 1 },
      INICIO.lstm + 1.4 + i * 0.9,
    );
  });
}
