// @vitest-environment happy-dom
import { describe, expect, it } from "vitest";
import {
  INICIO_DOS_PORTAIS_DE_ENTRADA,
  inicioDaPrevia,
} from "../../../src/presentation/vitrine/animacao-da-vitrine";
import {
  INICIO_DOS_CAPITULOS,
  PARADAS_DOS_CAPITULOS,
} from "../../../src/presentation/vitrine/controle-da-historia";

describe("Requisito: Transição por portal (spec vitrine-da-abertura)", () => {
  it("test_previa_dentro_do_objeto_ja_visivel_na_parada_do_capitulo", () => {
    for (const { fora, t } of INICIO_DOS_PORTAIS_DE_ENTRADA) {
      const previa = inicioDaPrevia(fora);
      const parada = PARADAS_DOS_CAPITULOS.find((p) => p > INICIO_DOS_CAPITULOS[fora]) ?? -1;
      expect(previa).toBeGreaterThanOrEqual(INICIO_DOS_CAPITULOS[fora]); // faz parte do capítulo atual
      expect(previa).toBeLessThan(parada); // já está lá quando a história para
      expect(t).toBeGreaterThan(parada); // e a passagem só começa depois do gesto
    }
  });
});
