import type { PontoDaMao, PontosDaMao } from "../../../src/domain/mao/pontos";

export type Dedo = "polegar" | "indicador" | "medio" | "anelar" | "minimo";

/** Base de cada dedo (articulação MCP) e a direção para onde ele estica, numa mão de pé vista de frente. */
const BASES: Readonly<Record<Dedo, PontoDaMao>> = {
  polegar: { x: 0.42, y: 0.78 },
  indicador: { x: 0.45, y: 0.62 },
  medio: { x: 0.5, y: 0.6 },
  anelar: { x: 0.55, y: 0.62 },
  minimo: { x: 0.6, y: 0.66 },
};
const DIRECAO: Readonly<Record<Dedo, PontoDaMao>> = {
  polegar: { x: -1, y: -0.3 },
  indicador: { x: -0.1, y: -1 },
  medio: { x: 0, y: -1 },
  anelar: { x: 0.1, y: -1 },
  minimo: { x: 0.2, y: -1 },
};
const PUNHO: PontoDaMao = { x: 0.5, y: 0.9 };
const ORDEM: readonly Dedo[] = ["polegar", "indicador", "medio", "anelar", "minimo"];

/**
 * Mão sintética com 21 pontos no formato do MediaPipe (0 = punho; 1–4 polegar; 5–8 indicador; 9–12 médio;
 * 13–16 anelar; 17–20 mínimo). Dedo esticado: as articulações seguem a direção; dobrado: a ponta volta
 * para perto da palma. `deslocamento` move a mão inteira.
 */
export function maoSintetica(
  esticados: readonly Dedo[],
  deslocamento: PontoDaMao = { x: 0, y: 0 },
): PontosDaMao {
  const pontos: PontoDaMao[] = [PUNHO];
  for (const dedo of ORDEM) {
    const base = BASES[dedo];
    const dir = DIRECAO[dedo];
    const esticado = esticados.includes(dedo);
    const passo = (n: number): PontoDaMao =>
      esticado
        ? { x: base.x + dir.x * 0.06 * n, y: base.y + dir.y * 0.06 * n }
        : // dobrado: sobe um pouco e volta em direção ao punho
          { x: base.x + dir.x * 0.03 * Math.min(n, 1) - dir.x * 0.01 * n, y: base.y + 0.025 * n };
    const mcp = dedo === "polegar" ? { x: base.x + 0.02, y: base.y + 0.04 } : base;
    pontos.push(mcp, passo(1), passo(2), passo(3));
  }
  return pontos.map((p) => ({ x: p.x + deslocamento.x, y: p.y + deslocamento.y }));
}
