import { criar } from "./dom";

/**
 * Tela de erro quando faltam os arquivos do jogo: diz o que falhou e como resolver, em vez de uma tela
 * em branco no estande.
 */
export function mostrarErroDeCarregamento(raiz: HTMLElement, detalhe: string): void {
  raiz.replaceChildren(
    criar("section", { classe: "tela tela-erro", dados: { tela: "erro" } }, [
      criar("h1", { texto: "O jogo não carregou" }),
      criar("p", { texto: detalhe }),
      criar("p", { texto: "Rode bash scripts/copiar_modelos.sh e recarregue a página." }),
    ]),
  );
}
