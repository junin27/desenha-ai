// @vitest-environment happy-dom
import { describe, expect, it } from "vitest";
import { geometriaDoPortal, quadroDoPortal } from "../../../src/domain/vitrine/portal";
import { MedidorDeQuadros } from "../../../src/presentation/vitrine/medidor-de-quadros";
import { aplicarQuadro } from "../../../src/presentation/vitrine/motor-do-portal";

const TELA = { largura: 1366, altura: 768 };
const JANELA = { x: 240, y: 399, largura: 24, altura: 32, forma: "retangulo" as const };

describe("Requisito: Transição por portal (spec vitrine-da-abertura)", () => {
  it("test_durante_o_portal_a_cena_nova_tem_matriz_e_recorte", () => {
    const [fora, dentro] = [document.createElement("section"), document.createElement("section")];
    aplicarQuadro(fora, dentro, quadroDoPortal(geometriaDoPortal(JANELA, TELA), 0.5), 1);
    expect(fora.style.transform).toContain("matrix(");
    expect(dentro.style.clipPath).toContain("inset(");
  });

  it("test_fim_do_portal_sem_transformacao_e_sem_recorte", () => {
    const [fora, dentro] = [document.createElement("section"), document.createElement("section")];
    const geometria = geometriaDoPortal(JANELA, TELA);
    aplicarQuadro(fora, dentro, quadroDoPortal(geometria, 0.5), 0.5);
    aplicarQuadro(fora, dentro, quadroDoPortal(geometria, 1));
    expect([fora.style.transform, dentro.style.transform, dentro.style.clipPath]).toEqual(["", "", ""]);
  });
});

describe("Requisito: Degradação em notebook lento (spec vitrine-da-abertura)", () => {
  function medir(fps: number, segundos: number): MedidorDeQuadros {
    const medidor = new MedidorDeQuadros();
    for (let i = 0; i <= fps * segundos; i++) medidor.registrar((i * 1000) / fps);
    return medidor;
  }

  it("test_taxa_baixa_22_quadros_por_segundo_por_3_segundos_liga_o_modo_lento", () => {
    expect(medir(22, 3).lento).toBe(true);
  });

  it("test_60_quadros_por_segundo_continua_normal", () => {
    expect(medir(60, 5).lento).toBe(false);
  });

  it("test_menos_de_3_segundos_ainda_nao_decide", () => {
    expect(medir(22, 2).lento).toBe(false);
  });

  it("test_modo_lento_nao_volta_atras_ate_recarregar", () => {
    const medidor = medir(22, 3);
    for (let i = 0; i < 300; i++) medidor.registrar(4000 + i * 16);
    expect(medidor.lento).toBe(true);
  });
});
