import { describe, expect, it } from "vitest";
import { FRACOES_DA_VITRINE, palpitesDaVitrine } from "../../src/application/palpites-da-vitrine";
import { criarDesenho } from "../../src/domain/desenho/desenho";
import { ClassificadorFalso, probabilidadesCom } from "./dubles";

const SOL = criarDesenho([
  [
    [0, 0],
    [10, 0],
    [20, 0],
    [30, 0],
  ],
  [
    [0, 10],
    [10, 10],
    [20, 10],
    [30, 10],
  ],
]);
const SOL_INDICE = 15;
const FLOR_INDICE = 20;

describe("Requisito: Palpites reais das redes (spec vitrine-da-abertura)", () => {
  it("test_palpites_a_cada_25_porcento_dos_pontos_com_o_top3_de_cada_rede", async () => {
    const classificador = new ClassificadorFalso()
      .programar(probabilidadesCom(FLOR_INDICE, 0.5))
      .programar(probabilidadesCom(FLOR_INDICE, 0.4), probabilidadesCom(SOL_INDICE, 0.6))
      .programar(probabilidadesCom(SOL_INDICE, 0.7))
      .programar(probabilidadesCom(SOL_INDICE, 0.9), probabilidadesCom(SOL_INDICE, 0.8));
    const palpites = await palpitesDaVitrine(SOL, classificador, 0.5);
    expect(FRACOES_DA_VITRINE).toEqual([0.25, 0.5, 0.75, 1]);
    expect(palpites?.map((p) => p.fracao)).toEqual([0.25, 0.5, 0.75, 1]);
    expect(palpites?.[1]?.cnn[0]?.[0]).toBe(FLOR_INDICE);
    expect(palpites?.[1]?.lstm[0]?.[0]).toBe(SOL_INDICE);
    const completo = palpites?.[3];
    expect(completo?.cnn.map(([indice]) => indice)[0]).toBe(SOL_INDICE);
    expect(completo?.cnn).toHaveLength(3);
    expect(completo?.ensemble[0]?.[1]).toBeCloseTo(0.85);
  });

  it("test_palpite_com_o_desenho_completo_usa_o_proprio_desenho_e_os_parciais_usam_o_prefixo", async () => {
    const classificador = new ClassificadorFalso().programar(probabilidadesCom(SOL_INDICE, 0.9));
    await palpitesDaVitrine(SOL, classificador, 0.5);
    const pontos = classificador.desenhosRecebidos.map((d) => d.tracos.flat().length);
    expect(pontos).toEqual([2, 4, 6, 8]);
    expect(classificador.desenhosRecebidos[3]).toEqual(SOL);
  });

  it("test_redes_indisponiveis_viram_sem_palpites", async () => {
    const classificador = new ClassificadorFalso().programarFalha();
    expect(await palpitesDaVitrine(SOL, classificador, 0.5)).toBeUndefined();
  });

  it("test_probabilidades_invalidas_viram_sem_palpites", async () => {
    const classificador = new ClassificadorFalso().programar([2, -1]);
    expect(await palpitesDaVitrine(SOL, classificador, 0.5)).toBeUndefined();
  });
});
