/** Ponto da mão normalizado na imagem da câmera: x e y de 0 a 1, com (0, 0) no canto superior esquerdo. */
export interface PontoDaMao {
  readonly x: number;
  readonly y: number;
}

/**
 * Os 21 pontos de uma mão, na ordem do MediaPipe Hand Landmarker: 0 = punho; 1–4 polegar; 5–8 indicador;
 * 9–12 médio; 13–16 anelar; 17–20 mínimo (em cada dedo: base, articulação do meio, articulação de cima, ponta).
 */
export type PontosDaMao = readonly PontoDaMao[];

export const TOTAL_DE_PONTOS_DA_MAO = 21;
export const PUNHO = 0;

export function distanciaEntre(a: PontoDaMao, b: PontoDaMao): number {
  return Math.hypot(a.x - b.x, a.y - b.y);
}
