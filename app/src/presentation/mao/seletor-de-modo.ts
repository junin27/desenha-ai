import type { ModoDeDesenho } from "../../application/portas";
import { criar } from "../dom";
import { criarIcone } from "../icones";

/**
 * Modo de desenho escolhido, compartilhado pela tela de apelido e pela de desenho (spec `desenho-com-a-mao`,
 * "Modo de desenho"). Quem muda avisa os interessados e a preferência é gravada.
 */
export class ModoDeDesenhoAtual {
  private readonly ouvintes: ((modo: ModoDeDesenho) => void)[] = [];

  constructor(
    private atual: ModoDeDesenho,
    private readonly gravar: (modo: ModoDeDesenho) => void = () => undefined,
  ) {}

  get valor(): ModoDeDesenho {
    return this.atual;
  }

  mudar(modo: ModoDeDesenho): void {
    if (modo === this.atual) return;
    this.atual = modo;
    this.gravar(modo);
    for (const ouvinte of this.ouvintes) ouvinte(modo);
  }

  aoMudar(ouvinte: (modo: ModoDeDesenho) => void): void {
    this.ouvintes.push(ouvinte);
  }
}

/** Dois botões, "Mouse" e "Mão", que mostram e trocam o modo. */
export class SeletorDeModo {
  readonly raiz: HTMLElement;

  constructor(private readonly modo: ModoDeDesenhoAtual) {
    const opcoes = (["mouse", "mao"] as const).map((valor) => {
      const elemento = criar("button", { classe: "opcao-de-modo", dados: { modo: valor } }, [
        criar("span", { texto: valor === "mouse" ? "Mouse" : "Mão" }),
      ]);
      elemento.type = "button";
      elemento.prepend(criarIcone(valor === "mouse" ? "lapis" : "mao"));
      elemento.addEventListener("click", () => {
        this.modo.mudar(valor);
      });
      return elemento;
    });
    this.raiz = criar("div", { classe: "seletor-de-modo", dados: { parte: "seletor-de-modo" } }, opcoes);
    modo.aoMudar(() => {
      this.marcar();
    });
    this.marcar();
  }

  private marcar(): void {
    for (const elemento of this.raiz.querySelectorAll<HTMLButtonElement>("[data-modo]")) {
      elemento.setAttribute("aria-pressed", String(elemento.dataset["modo"] === this.modo.valor));
    }
  }
}
