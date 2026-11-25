import { botao } from "./dom";

/**
 * Ícones desenhados para o jogo, no mesmo traço de caneta (spec `identidade-visual`, "Ícones desenhados").
 * Caminhos num quadro de 24×24; o traço usa a cor do texto ao lado (`currentColor`, no CSS).
 */
const DESENHOS = {
  lapis:
    '<path d="M4 20 L5.5 15 L16 4.5 C17 3.5 18.6 3.6 19.6 4.6 C20.5 5.6 20.5 7 19.5 8 L9 18.5 Z"/><path d="M14.5 6 L18 9.5"/><path d="M5.5 15 L9 18.5"/>',
  borracha:
    '<path d="M3.5 15.5 L12.5 6.5 C13.3 5.7 14.6 5.7 15.4 6.5 L19.5 10.6 C20.3 11.4 20.3 12.7 19.5 13.5 L13 20 L7.5 20 Z"/><path d="M9 10 L15.8 16.8"/><path d="M13 20 L21 20"/>',
  lixeira:
    '<path d="M4 6.5 L20 6"/><path d="M9.5 6.2 C9.6 4.5 10.5 3.6 12 3.6 C13.6 3.6 14.4 4.5 14.5 6.1"/><path d="M6 6.5 L7.2 19.5 C7.3 20.4 8 21 8.8 21 L15.2 21 C16 21 16.7 20.4 16.8 19.5 L18 6.4"/><path d="M10 10 L10.4 17.5 M14 10 L13.6 17.5"/>',
  raio: '<path d="M13.5 2.5 L5.5 13.5 L11.5 13.5 L10 21.5 L18.5 9.8 L12.5 9.8 Z"/>',
  jogar:
    '<path d="M7 4.2 C7 3.5 7.8 3.1 8.4 3.5 L19.5 11 C20.1 11.4 20.1 12.4 19.5 12.8 L8.4 20.4 C7.8 20.8 7 20.4 7 19.7 Z"/>',
  trofeu:
    '<path d="M7 4 L17 4 L16.6 10 C16.3 13 14.4 14.8 12 14.8 C9.6 14.8 7.7 13 7.4 10 Z"/><path d="M7.2 6 C4 6 3.6 10.5 7.6 11.2 M16.8 6 C20 6 20.4 10.5 16.4 11.2"/><path d="M12 14.8 L12 18 M8 21 L16 21 L15.2 18 L8.8 18 Z"/>',
  lupa: '<circle cx="10.5" cy="10.5" r="6.3"/><path d="M15.2 15.4 L20.5 20.6"/><path d="M7.8 8.6 C8.4 7.5 9.4 6.9 10.6 6.8"/>',
  balao:
    '<path d="M4 6.5 C4 4.8 5.3 3.6 7 3.6 L17 3.5 C18.7 3.5 20 4.8 20 6.5 L20 13 C20 14.7 18.7 16 17 16 L10.5 16 L6 20.2 L6.6 16 C5.1 15.8 4 14.6 4 13 Z"/><path d="M8.5 9.5 L8.6 9.6 M12 9.5 L12.1 9.6 M15.5 9.5 L15.6 9.6"/>',
  chapeu:
    '<path d="M2.5 15 C6 17.5 18 17.6 21.5 14.8"/><path d="M6.3 15.8 C6.2 11 7.2 6.4 12 6.3 C16.8 6.2 17.9 11 17.7 15.8"/><path d="M6.6 12.6 C10 13.8 14 13.8 17.4 12.5"/>',
  estrela:
    '<path d="M12 3 L14.6 8.6 L20.7 9.3 L16.1 13.4 L17.4 19.5 L12 16.4 L6.6 19.5 L7.9 13.4 L3.3 9.3 L9.4 8.6 Z"/>',
  casinha:
    '<path d="M3.5 11.5 L12 4 L20.5 11.5"/><path d="M6 9.6 L6 20 L18 20 L18 9.6"/><path d="M10 20 L10 14.5 L14 14.5 L14 20"/>',
  redes:
    '<circle cx="5" cy="7" r="1.8"/><circle cx="5" cy="17" r="1.8"/><circle cx="12" cy="5" r="1.8"/><circle cx="12" cy="12" r="1.8"/><circle cx="12" cy="19" r="1.8"/><circle cx="19" cy="12" r="1.8"/><path d="M6.7 7.4 L10.3 11.4 M6.7 16.6 L10.3 12.6 M6.6 6.2 L10.3 5.3 M6.6 17.8 L10.3 18.7 M13.7 5.8 L17.4 11 M13.8 12 L17.2 12 M13.7 18.2 L17.4 13"/>',
  enviar: '<path d="M3.5 11.5 L20.5 4 L14.5 20.5 L11.5 13 Z"/><path d="M11.5 13 L20.5 4"/>',
  ordem:
    '<path d="M7 4 L7 20 M3.5 16.5 L7 20 L10.5 16.5"/><path d="M13 6 L20.5 6 M13 11 L18.5 11 M13 16 L16.5 16"/>',
} as const;

export type NomeDoIcone = keyof typeof DESENHOS;
export const NOMES_DOS_ICONES = Object.keys(DESENHOS) as NomeDoIcone[];

/** Ícone em SVG, escondido do leitor de tela: quem dá nome ao botão ou título é o texto ao lado. */
export function criarIcone(nome: NomeDoIcone): SVGSVGElement {
  const modelo = document.createElement("template");
  modelo.innerHTML = `<svg class="icone" viewBox="0 0 24 24" aria-hidden="true">${DESENHOS[nome]}</svg>`;
  const icone = modelo.content.firstElementChild;
  if (!(icone instanceof SVGSVGElement))
    throw new Error(`ícone "${nome}" sem <svg> na raiz; esperado um SVG`);
  return icone;
}

/**
 * Botão com ícone à esquerda; o texto continua sendo o nome do botão.
 *
 * @example
 * botaoComIcone("lixeira", "Limpar", "limpar", () => captura.limpar());
 */
export function botaoComIcone(
  icone: NomeDoIcone,
  texto: string,
  acao: string,
  aoClicar: () => void,
): HTMLButtonElement {
  const elemento = botao(texto, acao, aoClicar);
  elemento.prepend(criarIcone(icone));
  return elemento;
}

/** Põe o ícone no começo de um título já criado. */
export function comIcone<Elemento extends HTMLElement>(icone: NomeDoIcone, elemento: Elemento): Elemento {
  elemento.prepend(criarIcone(icone));
  return elemento;
}
