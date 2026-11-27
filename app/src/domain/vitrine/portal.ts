/**
 * Geometria do portal da vitrine (spec `vitrine-da-abertura`, D2 do design da change vitrine-viva).
 *
 * A cena de DENTRO começa encaixada no OBJETO da cena de FORA (a tela inteira dela "cobre" o objeto) e uma única
 * câmera leva as duas juntas até a de dentro ocupar a tela. Com P0 = "põe a cena de dentro sobre o objeto" (escala
 * s0) e C(u) = "amplia por s0^-u em volta do objeto e leva o centro do objeto ao centro da tela", em u = 1 vale
 * C∘P0 = identidade: a cena nova termina exatamente na tela, sem borda. O recorte começa no formato do objeto
 * (círculo = canto de meio lado) e se abre até a tela inteira, sempre dentro da cena nova.
 *
 * Com FOCO (o elemento principal da cena nova), no começo é ele que preenche o objeto, e não a cena inteira
 * encolhida: P0 vira P(u), que vai de "foco sobre o objeto" (u = 0) a "tela sobre o objeto" (u = 1); como em
 * u = 1 vale o P0 de antes, o fim continua sendo a identidade.
 */

export interface Retangulo {
  readonly x: number;
  readonly y: number;
  readonly largura: number;
  readonly altura: number;
}

export interface ObjetoDoPortal extends Retangulo {
  readonly forma: "retangulo" | "circulo";
  /** Raio do canto em pixels de tela (só para retângulos; o círculo usa meio lado). */
  readonly canto?: number;
}

export interface TamanhoDaTela {
  readonly largura: number;
  readonly altura: number;
}

/** Matriz 2D de CSS `matrix(a, b, c, d, e, f)`, sempre sem rotação aqui (b = c = 0). */
export type Matriz = readonly [number, number, number, number, number, number];

/** Recorte `inset(topo direita baixo esquerda round canto)` em coordenadas da cena de dentro. */
export interface Recorte {
  readonly topo: number;
  readonly direita: number;
  readonly baixo: number;
  readonly esquerda: number;
  readonly canto: number;
}

export interface GeometriaDoPortal {
  readonly tela: TamanhoDaTela;
  readonly objeto: ObjetoDoPortal;
  /** Foco da cena nova: sua escala sobre o objeto e seu centro, em coordenadas da cena nova. */
  readonly foco?: { readonly escala: number; readonly centro: { readonly x: number; readonly y: number } };
  readonly escalaInicial: number;
  readonly centroDoObjeto: { readonly x: number; readonly y: number };
  readonly deslocamentoInicial: { readonly x: number; readonly y: number };
  readonly recorteInicial: Recorte;
}

export interface QuadroDoPortal {
  readonly fora: Matriz;
  readonly dentro: Matriz;
  /** `null` quando a cena de dentro já ocupa a tela sem recorte (u = 1). */
  readonly recorte: Recorte | null;
}

/** O recorte só começa a se abrir depois que a câmera andou um pouco: antes, a cena nova é vista "pelo" objeto. */
const INICIO_DA_ABERTURA = 0.3;
const CANTO_PADRAO = 18;
const IDENTIDADE: Matriz = [1, 0, 0, 1, 0, 0];

export function geometriaDoPortal(
  objeto: ObjetoDoPortal,
  tela: TamanhoDaTela,
  foco?: Retangulo,
): GeometriaDoPortal {
  const escalaInicial = Math.max(objeto.largura / tela.largura, objeto.altura / tela.altura);
  const centroDoObjeto = { x: objeto.x + objeto.largura / 2, y: objeto.y + objeto.altura / 2 };
  const deslocamentoInicial = {
    x: centroDoObjeto.x - (escalaInicial * tela.largura) / 2,
    y: centroDoObjeto.y - (escalaInicial * tela.altura) / 2,
  };
  const canto =
    objeto.forma === "circulo" ? Math.min(objeto.largura, objeto.altura) / 2 : (objeto.canto ?? CANTO_PADRAO);
  const esquerda = (objeto.x - deslocamentoInicial.x) / escalaInicial;
  const topo = (objeto.y - deslocamentoInicial.y) / escalaInicial;
  const recorteInicial: Recorte = {
    topo,
    esquerda,
    direita: tela.largura - esquerda - objeto.largura / escalaInicial,
    baixo: tela.altura - topo - objeto.altura / escalaInicial,
    canto: canto / escalaInicial,
  };
  const comFoco =
    foco === undefined || foco.largura <= 0 || foco.altura <= 0
      ? undefined
      : {
          escala: Math.max(objeto.largura / foco.largura, objeto.altura / foco.altura),
          centro: { x: foco.x + foco.largura / 2, y: foco.y + foco.altura / 2 },
        };
  return {
    tela,
    objeto,
    ...(comFoco ? { foco: comFoco } : {}),
    escalaInicial,
    centroDoObjeto,
    deslocamentoInicial,
    recorteInicial,
  };
}

/** P(u): escala e deslocamento que põem a cena nova sobre o objeto (antes da câmera). */
function posicionamento(geometria: GeometriaDoPortal, u: number): { escala: number; x: number; y: number } {
  const { escalaInicial, centroDoObjeto: c, tela, foco } = geometria;
  const escala = foco ? foco.escala ** (1 - u) * escalaInicial ** u : escalaInicial;
  const qx = foco ? foco.centro.x + (tela.largura / 2 - foco.centro.x) * u : tela.largura / 2;
  const qy = foco ? foco.centro.y + (tela.altura / 2 - foco.centro.y) * u : tela.altura / 2;
  return { escala, x: c.x - escala * qx, y: c.y - escala * qy };
}

/** Posição das duas cenas e o recorte da de dentro para o progresso `u` (limitado a [0, 1]). */
export function quadroDoPortal(geometria: GeometriaDoPortal, progresso: number): QuadroDoPortal {
  const u = Math.min(1, Math.max(0, progresso));
  if (u === 1) return { fora: matrizDeFora(geometria, 1), dentro: IDENTIDADE, recorte: null };
  return {
    fora: matrizDeFora(geometria, u),
    dentro: matrizDeDentro(geometria, u),
    recorte: recorteEm(geometria, u),
  };
}

export function aplicarMatriz(matriz: Matriz, x: number, y: number): readonly [number, number] {
  const [a, b, c, d, e, f] = matriz;
  return [a * x + c * y + e, b * x + d * y + f];
}

/** Suavização "entra e sai" (quadrática), a mesma curva da câmera. */
export function suavizar(p: number): number {
  const t = Math.min(1, Math.max(0, p));
  return t < 0.5 ? 2 * t * t : 1 - (-2 * t + 2) ** 2 / 2;
}

function camera(geometria: GeometriaDoPortal, u: number): { zoom: number; alvoX: number; alvoY: number } {
  const { escalaInicial, centroDoObjeto, tela } = geometria;
  return {
    zoom: escalaInicial ** -u,
    alvoX: centroDoObjeto.x + (tela.largura / 2 - centroDoObjeto.x) * u,
    alvoY: centroDoObjeto.y + (tela.altura / 2 - centroDoObjeto.y) * u,
  };
}

function matrizDeFora(geometria: GeometriaDoPortal, u: number): Matriz {
  if (u === 0) return IDENTIDADE;
  const { zoom, alvoX, alvoY } = camera(geometria, u);
  const { x, y } = geometria.centroDoObjeto;
  return [zoom, 0, 0, zoom, alvoX - zoom * x, alvoY - zoom * y];
}

function matrizDeDentro(geometria: GeometriaDoPortal, u: number): Matriz {
  const { zoom, alvoX, alvoY } = camera(geometria, u);
  const c = geometria.centroDoObjeto;
  const p = posicionamento(geometria, u);
  const escala = zoom * p.escala;
  return [escala, 0, 0, escala, zoom * (p.x - c.x) + alvoX, zoom * (p.y - c.y) + alvoY];
}

function recorteEm(geometria: GeometriaDoPortal, u: number): Recorte {
  const fechado = 1 - suavizar((u - INICIO_DA_ABERTURA) / (1 - INICIO_DA_ABERTURA));
  const r = recorteDoObjeto(geometria, u);
  return {
    topo: r.topo * fechado,
    direita: r.direita * fechado,
    baixo: r.baixo * fechado,
    esquerda: r.esquerda * fechado,
    canto: r.canto * fechado,
  };
}

/** O objeto em coordenadas da cena nova (por P(u)): é por ele que a cena nova é vista antes de abrir. */
function recorteDoObjeto(geometria: GeometriaDoPortal, u: number): Recorte {
  const { objeto, tela } = geometria;
  const p = posicionamento(geometria, u);
  const esquerda = (objeto.x - p.x) / p.escala;
  const topo = (objeto.y - p.y) / p.escala;
  const canto =
    objeto.forma === "circulo" ? Math.min(objeto.largura, objeto.altura) / 2 : (objeto.canto ?? CANTO_PADRAO);
  return {
    topo,
    esquerda,
    direita: tela.largura - esquerda - objeto.largura / p.escala,
    baixo: tela.altura - topo - objeto.altura / p.escala,
    canto: canto / p.escala,
  };
}
