import { describe, expect, it } from "vitest";
import { classificarGesto, EstabilizadorDeGesto, QUADROS_PARA_TROCAR } from "../../../src/domain/mao/gestos";
import { maoSintetica } from "./mao-sintetica";

describe("Requisito: Gestos da mão (spec desenho-com-a-mao)", () => {
  it("test_so_o_indicador_esticado_e_lapis", () => {
    expect(classificarGesto(maoSintetica(["indicador"]))).toBe("lapis");
  });

  it("test_polegar_solto_nao_atrapalha_o_lapis", () => {
    expect(classificarGesto(maoSintetica(["indicador", "polegar"]))).toBe("lapis");
  });

  it("test_mao_fechada_e_borracha", () => {
    expect(classificarGesto(maoSintetica([]))).toBe("borracha");
  });

  it("test_cinco_dedos_esticados_e_mao_aberta", () => {
    expect(classificarGesto(maoSintetica(["polegar", "indicador", "medio", "anelar", "minimo"]))).toBe(
      "mao_aberta",
    );
  });

  it("test_outra_forma_ou_sem_mao_e_nenhum", () => {
    expect(classificarGesto(maoSintetica(["indicador", "medio"]))).toBe("nenhum");
    expect(classificarGesto(undefined)).toBe("nenhum");
    expect(classificarGesto([])).toBe("nenhum");
  });
});

describe("Requisito: Gestos da mão — estabilidade de 3 quadros", () => {
  it("test_gesto_so_vale_depois_de_3_quadros_iguais", () => {
    expect(QUADROS_PARA_TROCAR).toBe(3);
    const estabilizador = new EstabilizadorDeGesto();
    expect(estabilizador.registrar("lapis")).toBe("nenhum");
    expect(estabilizador.registrar("lapis")).toBe("nenhum");
    expect(estabilizador.registrar("lapis")).toBe("lapis");
  });

  it("test_um_quadro_ruidoso_nao_troca_o_gesto", () => {
    const estabilizador = new EstabilizadorDeGesto();
    for (let i = 0; i < 3; i++) estabilizador.registrar("lapis");
    expect(estabilizador.registrar("mao_aberta")).toBe("lapis");
    expect(estabilizador.registrar("lapis")).toBe("lapis");
    expect(estabilizador.registrar("mao_aberta")).toBe("lapis");
    expect(estabilizador.registrar("mao_aberta")).toBe("lapis");
    expect(estabilizador.registrar("mao_aberta")).toBe("mao_aberta");
  });
});
