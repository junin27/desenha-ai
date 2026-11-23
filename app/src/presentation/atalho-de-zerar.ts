export interface AcoesDoAtalhoDeZerar {
  /** Só vale na tela de início (spec `placar-local`). */
  podeZerar(): boolean;
  confirmar(pergunta: string): boolean;
  zerar(): void;
}

const PERGUNTA = "Zerar o placar do evento? Todas as partidas gravadas serão apagadas.";

/**
 * Ctrl+Shift+Z seguido de confirmação zera o placar: combinação difícil de apertar sem querer, para o
 * visitante não apagar o placar da feira.
 *
 * @example
 * instalarAtalhoDeZerarPlacar(document, { podeZerar, confirmar: (p) => window.confirm(p), zerar });
 */
export function instalarAtalhoDeZerarPlacar(alvo: Document, acoes: AcoesDoAtalhoDeZerar): void {
  alvo.addEventListener("keydown", (evento) => {
    const atalho = evento.ctrlKey && evento.shiftKey && evento.key.toLowerCase() === "z";
    if (!atalho || !acoes.podeZerar()) return;
    evento.preventDefault();
    if (acoes.confirmar(PERGUNTA)) acoes.zerar();
  });
}
