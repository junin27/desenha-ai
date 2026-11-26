import { describe, expect, it } from "vitest";
import {
  aplicarMatriz,
  geometriaDoPortal,
  quadroDoPortal,
  type ObjetoDoPortal,
} from "../../../src/domain/vitrine/portal";

const TELA = { largura: 1366, altura: 768 };
// Janela da casa: estreita e alta (a cena nova "cobre" o objeto pela altura).
const JANELA: ObjetoDoPortal = { x: 240, y: 399, largura: 24, altura: 32, forma: "retangulo", canto: 2 };
const LETRA_O: ObjetoDoPortal = { x: 1080, y: 300, largura: 50, altura: 50, forma: "circulo" };

describe("Requisito: Transição por portal (spec vitrine-da-abertura)", () => {
  it("test_previa_dentro_do_objeto_a_cena_nova_cobre_o_objeto_e_a_de_fora_fica_parada", () => {
    const geometria = geometriaDoPortal(JANELA, TELA);
    const quadro = quadroDoPortal(geometria, 0);
    expect(quadro.fora).toEqual([1, 0, 0, 1, 0, 0]);
    // A tela inteira da cena nova vira um retângulo que cobre a janela: a altura bate com a da janela.
    const [cantoX, cantoY] = aplicarMatriz(quadro.dentro, 0, 0);
    const [fimX, fimY] = aplicarMatriz(quadro.dentro, TELA.largura, TELA.altura);
    expect(fimY - cantoY).toBeCloseTo(JANELA.altura);
    expect((cantoX + fimX) / 2).toBeCloseTo(JANELA.x + JANELA.largura / 2);
    // O recorte, levado para a tela, é exatamente a janela.
    const r = quadro.recorte;
    expect(r).not.toBeNull();
    if (r === null) return;
    const [esq, topo] = aplicarMatriz(quadro.dentro, r.esquerda, r.topo);
    const [dir, baixo] = aplicarMatriz(quadro.dentro, TELA.largura - r.direita, TELA.altura - r.baixo);
    expect([esq, topo, dir - esq, baixo - topo].map((v) => Math.round(v))).toEqual([240, 399, 24, 32]);
  });

  it("test_fim_do_portal_a_cena_nova_fica_identidade_e_sem_recorte", () => {
    const quadro = quadroDoPortal(geometriaDoPortal(JANELA, TELA), 1);
    expect(quadro.dentro).toEqual([1, 0, 0, 1, 0, 0]);
    expect(quadro.recorte).toBeNull();
  });

  it("test_a_camera_prende_as_duas_cenas_o_objeto_de_fora_sempre_casa_com_a_cena_de_dentro", () => {
    const geometria = geometriaDoPortal(JANELA, TELA);
    for (const u of [0, 0.25, 0.5, 0.8, 1]) {
      const quadro = quadroDoPortal(geometria, u);
      const centroDaJanela = aplicarMatriz(
        quadro.fora,
        JANELA.x + JANELA.largura / 2,
        JANELA.y + JANELA.altura / 2,
      );
      const centroDaCenaNova = aplicarMatriz(quadro.dentro, TELA.largura / 2, TELA.altura / 2);
      expect(centroDaJanela[0]).toBeCloseTo(centroDaCenaNova[0], 6);
      expect(centroDaJanela[1]).toBeCloseTo(centroDaCenaNova[1], 6);
    }
  });

  it("test_objeto_redondo_comeca_com_canto_de_meio_lado_e_termina_sem_canto", () => {
    const geometria = geometriaDoPortal(LETRA_O, TELA);
    const inicio = quadroDoPortal(geometria, 0).recorte;
    // Raio do canto, em pixels de tela, = meio lado do objeto -> recorte redondo.
    expect(inicio && inicio.canto * geometria.escalaInicial).toBeCloseTo(LETRA_O.largura / 2);
    expect(quadroDoPortal(geometria, 0.999).recorte?.canto ?? 0).toBeLessThan(1);
  });

  it("test_progresso_fora_de_0_a_1_e_limitado", () => {
    const geometria = geometriaDoPortal(JANELA, TELA);
    expect(quadroDoPortal(geometria, -1)).toEqual(quadroDoPortal(geometria, 0));
    expect(quadroDoPortal(geometria, 2)).toEqual(quadroDoPortal(geometria, 1));
  });
});
