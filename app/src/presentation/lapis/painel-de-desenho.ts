import type { EstiloDoTraco, Ferramenta } from "../captura-do-desenho";
import { criar } from "../dom";
import { criarIcone, type NomeDoIcone } from "../icones";

/** Paleta de 16 cores (spec `paleta-de-desenho`); a primeira é a tinta do jogo. */
export const CORES_DA_PALETA = [
  "#2b1a0a", "#6b4f2e", "#9a9aa2", "#ffffff",
  "#b3261e", "#e8743b", "#f2c14e", "#f6dcb0",
  "#2f7d32", "#8cc152", "#1f5fa8", "#5bc0eb",
  "#6a3d9a", "#e07bb5", "#a0522d", "#3a8f8f",
] as const; // prettier-ignore

export const ESPESSURAS = { fina: 5, media: 9, grossa: 16 } as const;
export type NomeDaEspessura = keyof typeof ESPESSURAS;

const FERRAMENTAS: readonly {
  readonly ferramenta: Ferramenta;
  readonly nome: string;
  readonly icone: NomeDoIcone;
}[] = [
  { ferramenta: "lapis", nome: "Lápis", icone: "lapis" },
  { ferramenta: "borracha", nome: "Borracha", icone: "borracha" },
  { ferramenta: "balde", nome: "Balde", icone: "balde" },
  { ferramenta: "contagotas", nome: "Conta-gotas", icone: "contagotas" },
];

export interface EscolhasDoPainel {
  usar(ferramenta: Ferramenta): void;
  definirEstilo(estilo: EstiloDoTraco): void;
}

/**
 * Painel de desenho: ferramentas, espessuras e paleta, com a cor atual. Os botões só com ícone levam o
 * nome em texto escondido, para o leitor de tela e os testes.
 */
export class PainelDeDesenho {
  readonly raiz: HTMLElement;
  private ferramenta: Ferramenta = "lapis";
  private cor: string = CORES_DA_PALETA[0];
  private espessura: NomeDaEspessura = "media";
  private readonly corAtual = criar("span", { classe: "cor-atual" });

  constructor(private readonly escolhas: EscolhasDoPainel) {
    const ferramentas = criar(
      "div",
      { classe: "ferramentas-do-painel" },
      FERRAMENTAS.map(({ ferramenta, nome, icone }) =>
        this.botao({ ferramenta }, nome, icone, () => {
          this.usar(ferramenta);
        }),
      ),
    );
    const espessuras = criar(
      "div",
      { classe: "espessuras" },
      (Object.keys(ESPESSURAS) as NomeDaEspessura[]).map((nome) => {
        const ponto = criar("span", { classe: `ponto-da-espessura ${nome}` });
        const elemento = this.botao({ espessura: nome }, `Espessura ${nome}`, undefined, () => {
          this.espessura = nome;
          this.aplicarEstilo();
        });
        elemento.prepend(ponto);
        return elemento;
      }),
    );
    const paleta = criar(
      "div",
      { classe: "paleta" },
      CORES_DA_PALETA.map((cor) => {
        const elemento = this.botao({ cor }, `Cor ${cor}`, undefined, () => {
          this.pintar(cor);
        });
        elemento.style.background = cor;
        return elemento;
      }),
    );
    this.raiz = criar("aside", { classe: "painel-de-desenho", dados: { parte: "painel-de-desenho" } }, [
      ferramentas,
      espessuras,
      paleta,
      this.corAtual,
    ]);
    this.reiniciar();
  }

  /** Começo de rodada: Lápis, espessura média e a tinta do jogo (spec `paleta-de-desenho`). */
  reiniciar(): void {
    this.espessura = "media";
    this.cor = CORES_DA_PALETA[0];
    this.aplicarEstilo();
    this.usar("lapis");
  }

  usar(ferramenta: Ferramenta): void {
    this.ferramenta = ferramenta;
    this.escolhas.usar(ferramenta);
    this.marcar();
  }

  /** Cor escolhida na paleta ou pelo conta-gotas; a borracha, o balde e o conta-gotas voltam ao lápis. */
  pintar(cor: string): void {
    this.cor = cor;
    this.aplicarEstilo();
    if (this.ferramenta === "borracha" || this.ferramenta === "contagotas") this.usar("lapis");
  }

  private aplicarEstilo(): void {
    this.escolhas.definirEstilo({ cor: this.cor, espessura: ESPESSURAS[this.espessura] });
    this.corAtual.style.background = this.cor;
    this.marcar();
  }

  private marcar(): void {
    for (const elemento of this.raiz.querySelectorAll<HTMLButtonElement>("button")) {
      const { ferramenta, espessura, cor } = elemento.dataset;
      const ativo =
        ferramenta === this.ferramenta ||
        espessura === this.espessura ||
        (cor !== undefined && cor === this.cor);
      elemento.setAttribute("aria-pressed", String(ativo));
    }
  }

  private botao(
    dados: Readonly<Record<string, string>>,
    nome: string,
    icone: NomeDoIcone | undefined,
    aoClicar: () => void,
  ): HTMLButtonElement {
    const elemento = criar("button", { dados }, [criar("span", { classe: "so-leitor", texto: nome })]);
    elemento.type = "button";
    elemento.title = nome;
    if (icone !== undefined) elemento.prepend(criarIcone(icone));
    elemento.addEventListener("click", aoClicar);
    return elemento;
  }
}
