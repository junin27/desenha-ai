import { criar } from "./dom";

/** A pincelada inteira (cobrir e descobrir) cabe em 1,2 s (spec `identidade-visual`). */
export const DURACAO_DA_PINCELADA_MS = 1100;

/**
 * Troca de tela com uma pincelada terracota por cima de tudo, sem receber cliques. A troca em si acontece
 * depois de `atrasoDaTrocaMs` (quando a tinta cobre a tela); com atraso 0, ou com movimento reduzido, a
 * troca é imediata e não há pincelada.
 *
 * @example
 * new TransicaoPorPincelada(450).trocar(() => mostrarTelaNova());
 */
export class TransicaoPorPincelada {
  readonly raiz: HTMLElement;
  private pendente: ReturnType<typeof setTimeout> | undefined;

  constructor(private readonly atrasoDaTrocaMs = 0) {
    const modelo = document.createElement("template");
    modelo.innerHTML =
      '<svg viewBox="0 0 1600 900" preserveAspectRatio="none" aria-hidden="true">' +
      '<path pathLength="1" d="M-300 450 C 400 80, 1200 820, 1900 450"/></svg>';
    this.raiz = criar("div", { classe: "pincelada", dados: { parte: "pincelada" } }, [
      ...modelo.content.childNodes,
    ]);
  }

  trocar(mostrarTelaNova: () => void): void {
    clearTimeout(this.pendente);
    if (this.atrasoDaTrocaMs === 0 || movimentoReduzido()) {
      mostrarTelaNova();
      return;
    }
    this.raiz.classList.remove("vai");
    this.raiz.getBoundingClientRect(); // força o recálculo para a animação CSS recomeçar
    this.raiz.classList.add("vai");
    this.pendente = setTimeout(mostrarTelaNova, this.atrasoDaTrocaMs);
  }
}

function movimentoReduzido(): boolean {
  return (
    typeof window.matchMedia === "function" && window.matchMedia("(prefers-reduced-motion: reduce)").matches
  );
}
