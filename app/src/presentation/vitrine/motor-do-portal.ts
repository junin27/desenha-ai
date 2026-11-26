import type { QuadroDoPortal, Retangulo } from "../../domain/vitrine/portal";

/**
 * Leva um quadro do portal (domínio) para os elementos: matriz de transformação nas duas cenas e recorte na de
 * dentro. No fim (recorte nulo) as duas ficam sem transformação nem recorte (spec "Fim do portal").
 */
export function aplicarQuadro(
  fora: HTMLElement,
  dentro: HTMLElement,
  quadro: QuadroDoPortal,
  opacidadeDeDentro = 1,
): void {
  if (quadro.recorte === null) {
    for (const cena of [fora, dentro]) cena.style.transform = "";
    dentro.style.clipPath = "";
    dentro.style.opacity = "";
    return;
  }
  fora.style.transform = `matrix(${quadro.fora.join(",")})`;
  dentro.style.transform = `matrix(${quadro.dentro.join(",")})`;
  const { topo, direita, baixo, esquerda, canto } = quadro.recorte;
  dentro.style.clipPath = `inset(${topo}px ${direita}px ${baixo}px ${esquerda}px round ${canto}px)`;
  dentro.style.opacity = String(opacidadeDeDentro);
}

/**
 * Mede o elemento "fora da câmera": zera só a transformação da cena que o contém (a do portal) e restaura. As
 * transformações do próprio elemento ficam (o título é centralizado com translate -50%) — D3 do design.
 */
export function medirNaCena(elemento: Element): Retangulo {
  const cena = elemento.closest<HTMLElement>("[data-cena]");
  const salva = cena?.style.transform ?? "";
  if (cena) cena.style.transform = "";
  const r = elemento.getBoundingClientRect();
  if (cena) cena.style.transform = salva;
  return { x: r.left, y: r.top, largura: r.width, altura: r.height };
}
