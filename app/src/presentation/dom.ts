export interface PropriedadesDoElemento {
  readonly classe?: string;
  readonly texto?: string;
  /** Atributos `data-*` (usados pelo CSS e pelos testes para achar cada parte da tela). */
  readonly dados?: Readonly<Record<string, string>>;
}

/**
 * Cria um elemento com classe, texto, `data-*` e filhos: as telas são montadas uma vez e só atualizadas.
 *
 * @example
 * criar("button", { texto: "Jogar", dados: { acao: "jogar" } });
 */
export function criar<Tag extends keyof HTMLElementTagNameMap>(
  tag: Tag,
  propriedades: PropriedadesDoElemento = {},
  filhos: readonly Node[] = [],
): HTMLElementTagNameMap[Tag] {
  const elemento = document.createElement(tag);
  if (propriedades.classe !== undefined) elemento.className = propriedades.classe;
  if (propriedades.texto !== undefined) elemento.textContent = propriedades.texto;
  for (const [chave, valor] of Object.entries(propriedades.dados ?? {})) elemento.dataset[chave] = valor;
  elemento.append(...filhos);
  return elemento;
}

export function botao(texto: string, acao: string, aoClicar: () => void): HTMLButtonElement {
  const elemento = criar("button", { texto, dados: { acao } });
  elemento.type = "button";
  elemento.addEventListener("click", aoClicar);
  return elemento;
}

/** Troca os itens de uma lista pelos textos dados. */
export function preencherLista(lista: HTMLOListElement | HTMLUListElement, textos: readonly string[]): void {
  lista.replaceChildren(...textos.map((texto) => criar("li", { texto })));
}

/** Mostra o selo de quem falou; sem texto (fala de reserva ou ainda sem fala), o selo some. */
export function mostrarSelo(selo: HTMLElement, texto: string | undefined): void {
  selo.textContent = texto ?? "";
  selo.hidden = (texto ?? "") === "";
}
