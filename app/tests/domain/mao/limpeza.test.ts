import { describe, expect, it } from "vitest";
import { ContagemDaLimpeza, MOVIMENTO_MAXIMO, TEMPO_PARA_LIMPAR_MS } from "../../../src/domain/mao/limpeza";

const PALMA = { x: 0.5, y: 0.5 };

describe("Requisito: Limpar com a mão aberta parada (spec desenho-com-a-mao)", () => {
  it("test_tres_segundos_parada_dispara", () => {
    expect(TEMPO_PARA_LIMPAR_MS).toBe(3000);
    const contagem = new ContagemDaLimpeza();
    expect(contagem.registrar("mao_aberta", PALMA, 0)).toEqual({ fracao: 0, limpar: false });
    expect(contagem.registrar("mao_aberta", PALMA, 1500).fracao).toBeCloseTo(0.5);
    expect(contagem.registrar("mao_aberta", PALMA, 3000)).toEqual({ fracao: 1, limpar: true });
  });

  it("test_dispara_uma_vez_so", () => {
    const contagem = new ContagemDaLimpeza();
    contagem.registrar("mao_aberta", PALMA, 0);
    contagem.registrar("mao_aberta", PALMA, 3000);
    expect(contagem.registrar("mao_aberta", PALMA, 3500).limpar).toBe(false);
  });

  it("test_mao_que_anda_10_porcento_zera_a_contagem", () => {
    expect(MOVIMENTO_MAXIMO).toBe(0.04);
    const contagem = new ContagemDaLimpeza();
    contagem.registrar("mao_aberta", PALMA, 0);
    contagem.registrar("mao_aberta", PALMA, 2000);
    expect(contagem.registrar("mao_aberta", { x: 0.6, y: 0.5 }, 2100)).toEqual({ fracao: 0, limpar: false });
    expect(contagem.registrar("mao_aberta", { x: 0.6, y: 0.5 }, 4000).limpar).toBe(false);
  });

  it("test_trocar_de_gesto_zera_a_contagem", () => {
    const contagem = new ContagemDaLimpeza();
    contagem.registrar("mao_aberta", PALMA, 0);
    contagem.registrar("mao_aberta", PALMA, 2500);
    expect(contagem.registrar("lapis", PALMA, 2600)).toEqual({ fracao: 0, limpar: false });
    contagem.registrar("mao_aberta", PALMA, 2700);
    expect(contagem.registrar("mao_aberta", PALMA, 5000).limpar).toBe(false);
  });
});
