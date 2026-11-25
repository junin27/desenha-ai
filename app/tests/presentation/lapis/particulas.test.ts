import { describe, expect, it } from "vitest";
import { LIMITE_DE_PARTICULAS, SistemaDeParticulas } from "../../../src/presentation/lapis/particulas";

const CHAO = 590;
const sempreMeio = (): number => 0.5;
const TONS = ["#b3261e"];

function sistema(): SistemaDeParticulas {
  return new SistemaDeParticulas({ chao: CHAO, largura: 600, aleatorio: sempreMeio });
}

describe("Requisito: Partículas do traço (spec lapis-no-quadro)", () => {
  it("test_particulas_do_lapis_saem_na_cor_do_traco", () => {
    const particulas = sistema();
    particulas.soltar("lapis", [300, 300], 14, TONS);
    expect(particulas.ativas.length).toBeGreaterThan(0);
    expect(particulas.ativas.every((p) => p.cor === "#b3261e")).toBe(true);
  });

  it("test_gravidade_faz_cair", () => {
    const particulas = sistema();
    particulas.soltar("lapis", [300, 100], 14, TONS);
    const antes = particulas.ativas.map((p) => p.y);
    for (let i = 0; i < 30; i++) particulas.passo(1);
    expect(particulas.ativas.some((p, i) => p.tipo !== "faisca" && p.y > (antes[i] ?? 0))).toBe(true);
  });

  it("test_assentada_nao_muda_de_posicao_e_so_desbota", () => {
    const particulas = sistema();
    particulas.soltar("borracha", [300, 580], 14, ["#f4a8a6"]);
    for (let i = 0; i < 60; i++) particulas.passo(1);
    const assentadas = particulas.ativas.filter((p) => p.parada);
    expect(assentadas.length).toBeGreaterThan(0);
    const fotos = assentadas.map((p) => [p.x, p.y, p.opacidade] as const);
    particulas.passo(1);
    assentadas.forEach((p, i) => {
      const [x, y, opacidade] = fotos[i] ?? [0, 0, 0];
      expect([p.x, p.y]).toEqual([x, y]);
      expect(p.opacidade).toBeLessThanOrEqual(opacidade);
    });
  });

  it("test_nunca_passam_de_y_do_chao", () => {
    const particulas = sistema();
    particulas.soltar("borracha", [300, 500], 14, ["#f4a8a6"]);
    for (let i = 0; i < 200; i++) particulas.passo(1);
    expect(particulas.ativas.every((p) => p.y <= CHAO)).toBe(true);
  });

  it("test_acima_do_limite_as_antigas_desbotam_mais_rapido", () => {
    expect(LIMITE_DE_PARTICULAS).toBe(600);
    const particulas = sistema();
    for (let i = 0; i < 200; i++) particulas.soltar("lapis", [300, 300], 14, TONS);
    const total = particulas.ativas.length;
    expect(total).toBeGreaterThan(LIMITE_DE_PARTICULAS);
    for (let i = 0; i < 30; i++) particulas.passo(1);
    expect(particulas.ativas.length).toBeLessThan(total);
  });

  it("test_limpar_remove_tudo", () => {
    const particulas = sistema();
    particulas.soltar("lapis", [300, 300], 14, TONS);
    particulas.limpar();
    expect(particulas.ativas).toEqual([]);
  });
});
