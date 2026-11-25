import { describe, expect, it } from "vitest";
import { type GeradorDeSom, SomDoDesenho } from "../../../src/presentation/lapis/som-do-desenho";

/** Registra o que seria tocado. */
class GeradorEspiao implements GeradorDeSom {
  readonly toques: string[] = [];
  volume = 0;
  frequencia = 0;
  ajustarRuido(frequencia: number, _q: number, volume: number): void {
    this.frequencia = frequencia;
    this.volume = volume;
  }
  tocarBip(inicio: number): void {
    this.toques.push(`bip:${String(inicio)}`);
  }
}

describe("Requisito: Som do desenho (spec lapis-no-quadro)", () => {
  it("test_encostar_toca_um_toque", () => {
    const gerador = new GeradorEspiao();
    new SomDoDesenho(gerador, true).encostar("lapis");
    expect(gerador.toques).toHaveLength(1);
  });

  it("test_volume_acompanha_a_velocidade_e_lapis_e_mais_agudo", () => {
    const gerador = new GeradorEspiao();
    const som = new SomDoDesenho(gerador, true);
    som.arrastar("lapis", 4);
    const devagar = gerador.volume;
    som.arrastar("lapis", 18);
    expect(gerador.volume).toBeGreaterThan(devagar);
    const agudo = gerador.frequencia;
    som.arrastar("borracha", 18);
    expect(gerador.frequencia).toBeLessThan(agudo);
  });

  it("test_traco_parado_silencia", () => {
    const gerador = new GeradorEspiao();
    const som = new SomDoDesenho(gerador, true);
    som.arrastar("lapis", 18);
    som.parar();
    expect(gerador.volume).toBe(0);
  });

  it("test_som_desligado_nao_toca_nada", () => {
    const gerador = new GeradorEspiao();
    const som = new SomDoDesenho(gerador, false);
    som.encostar("lapis");
    som.arrastar("lapis", 18);
    som.balde();
    expect(gerador.toques).toEqual([]);
    expect(gerador.volume).toBe(0);
  });

  it("test_desligar_no_meio_do_traco_silencia_na_hora", () => {
    const gerador = new GeradorEspiao();
    const som = new SomDoDesenho(gerador, true);
    som.arrastar("lapis", 18);
    som.ligar(false);
    expect(gerador.volume).toBe(0);
    expect(som.ligado).toBe(false);
  });
});
