import type { Ponto } from "../../domain/desenho/desenho";
import type { DesgasteDoLapis } from "./desgaste";
import {
  comprimentoDoLapis,
  desenharBalde,
  desenharContaGotas,
  desenharLapis,
  gradientes,
} from "./desenho-do-lapis";

/** Ferramenta mostrada no ponteiro (spec `lapis-no-quadro`, "Lápis mostra a ferramenta"). */
export type FerramentaNoPonteiro = "lapis" | "borracha" | "balde" | "contagotas";

const ESCALA = 0.85;
const INCLINACAO_MAXIMA = 20;
const TREMOR_MAXIMO = 3;

let instancias = 0;

/**
 * O lápis no lugar do cursor, dentro do quadro: uma âncora sem tamanho no ponto de contato, com o SVG
 * desenhando para fora. A ponta do grafite (ou da borracha, do balde, do conta-gotas) fica no ponto.
 *
 * @example
 * const lapis = new LapisNoQuadro(desgaste);
 * quadro.append(lapis.raiz);
 * lapis.mover([200, 300]);
 */
export class LapisNoQuadro {
  readonly raiz: HTMLElement;
  private readonly sufixo: string;
  private ferramenta: FerramentaNoPonteiro = "lapis";
  private cor = "#2b1a0a";

  constructor(private readonly desgaste: DesgasteDoLapis) {
    instancias += 1;
    this.sufixo = `lapis-${String(instancias)}`;
    this.raiz = document.createElement("div");
    this.raiz.className = "lapis-no-quadro";
    this.raiz.setAttribute("aria-hidden", "true");
    this.raiz.dataset["ferramenta"] = this.ferramenta;
    this.redesenhar();
  }

  /** Leva a ponta ao ponto; `dx` e `velocidade` inclinam e fazem tremer enquanto desenha. */
  mover([x, y]: Ponto, encostado = false, dx = 0, velocidade = 0): void {
    const tremor = encostado ? Math.min(TREMOR_MAXIMO, velocidade * 0.18) : 0;
    const jx = (Math.random() - 0.5) * tremor;
    const jy = (Math.random() - 0.5) * tremor;
    this.raiz.style.transform = `translate(${String(x + jx)}px, ${String(y + jy)}px)`;
    const angulo = encostado ? Math.max(-INCLINACAO_MAXIMA, Math.min(INCLINACAO_MAXIMA, dx * 1.4)) : 0;
    this.raiz.style.setProperty("--inclinacao", `${String(angulo)}deg`);
    this.raiz.classList.toggle("encostado", encostado);
    this.raiz.classList.add("visivel");
  }

  esconder(): void {
    this.raiz.classList.remove("visivel", "encostado");
  }

  /** Efeito de mola quando a ponta encosta no papel. */
  encostar(): void {
    this.raiz.classList.remove("encostou");
    this.raiz.getBoundingClientRect(); // reinicia a animação
    this.raiz.classList.add("encostou");
  }

  usar(ferramenta: FerramentaNoPonteiro): void {
    this.ferramenta = ferramenta;
    this.raiz.dataset["ferramenta"] = ferramenta;
  }

  pintar(cor: string): void {
    this.cor = cor;
    this.redesenhar();
  }

  /** Redesenha com o desgaste atual (chamado enquanto o lápis gasta). */
  redesenhar(): void {
    const fim = comprimentoDoLapis(this.desgaste);
    const lapis = desenharLapis(this.desgaste, this.cor, this.sufixo);
    this.raiz.innerHTML = `
      <div class="circulo-da-borracha"></div>
      <svg width="1" height="1">${gradientes(this.sufixo)}
        <ellipse class="sombra-do-lapis" cx="60" cy="18" rx="70" ry="10" fill="url(#sombra-${this.sufixo})"/>
        <g class="inclina"><g class="mola"><g transform="scale(${String(ESCALA)})">
          <g class="modo modo-lapis"><g transform="rotate(-45)">${lapis}</g></g>
          <g class="modo modo-borracha"><g transform="rotate(-45) translate(${String(fim)} 0) scale(-1 1)">${lapis}</g></g>
          <g class="modo modo-balde">${desenharBalde(this.cor)}</g>
          <g class="modo modo-contagotas">${desenharContaGotas(this.cor)}</g>
        </g></g></g>
      </svg>`;
  }
}
