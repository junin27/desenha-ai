// @vitest-environment happy-dom
import { describe, expect, it } from "vitest";
import {
  capituloEm,
  ControleDaHistoria,
  DURACAO_DA_HISTORIA,
  ligarEntrada,
} from "../../../src/presentation/vitrine/controle-da-historia";

class RelogioFalso {
  ms = 0;
  readonly agora = (): number => this.ms;
}

/** Roda quadros de 16 ms por `ms` milissegundos. */
function rodar(controle: ControleDaHistoria, relogio: RelogioFalso, ms: number): number {
  let tempo = controle.segundos;
  for (let decorrido = 0; decorrido < ms; decorrido += 16) {
    relogio.ms += 16;
    tempo = controle.passo();
  }
  return tempo;
}

describe("Requisito: Avançar e voltar a história (spec vitrine-da-abertura)", () => {
  it("test_avancar_com_a_tecla_tres_toques_avancam_9_segundos", () => {
    const relogio = new RelogioFalso();
    const controle = new ControleDaHistoria(relogio.agora);
    ligarEntrada(window, controle, () => true);
    for (let i = 0; i < 3; i++) window.dispatchEvent(new KeyboardEvent("keydown", { key: "ArrowDown" }));
    expect(rodar(controle, relogio, 3000)).toBeCloseTo(9, 1);
  });

  it("test_seta_para_cima_volta", () => {
    const relogio = new RelogioFalso();
    const controle = new ControleDaHistoria(relogio.agora);
    controle.irPara(20);
    ligarEntrada(window, controle, () => true);
    window.dispatchEvent(new KeyboardEvent("keydown", { key: "PageUp" }));
    expect(rodar(controle, relogio, 3000)).toBeCloseTo(17, 1);
  });

  it("test_rodinha_nao_rola_a_pagina", () => {
    const controle = new ControleDaHistoria(() => 0);
    ligarEntrada(window, controle, () => true);
    const rodinha = new WheelEvent("wheel", { deltaY: 300, cancelable: true });
    window.dispatchEvent(rodinha);
    expect(rodinha.defaultPrevented).toBe(true);
    expect(window.scrollY).toBe(0);
  });
});

describe("Requisito: História anda sozinha (spec vitrine-da-abertura)", () => {
  it("test_visitante_parado_10_segundos_avanca_ao_menos_5", () => {
    const relogio = new RelogioFalso();
    const controle = new ControleDaHistoria(relogio.agora);
    expect(rodar(controle, relogio, 10_000)).toBeGreaterThanOrEqual(5);
  });

  it("test_interacao_reinicia_a_contagem_de_4_segundos", () => {
    const relogio = new RelogioFalso();
    const controle = new ControleDaHistoria(relogio.agora);
    controle.irPara(10);
    expect(rodar(controle, relogio, 3500)).toBeCloseTo(10, 1);
  });

  it("test_recomeco_do_modo_vitrine_depois_de_10_segundos_no_fim", () => {
    const relogio = new RelogioFalso();
    const controle = new ControleDaHistoria(relogio.agora);
    controle.irPara(DURACAO_DA_HISTORIA);
    rodar(controle, relogio, 4100); // espera os 4 s de "parado"
    expect(controle.segundos).toBe(DURACAO_DA_HISTORIA);
    expect(rodar(controle, relogio, 10_100)).toBeLessThan(1);
    expect(capituloEm(controle.segundos)).toBe("abertura");
  });

  it("test_sem_andar_sozinha_a_historia_fica_parada", () => {
    const relogio = new RelogioFalso();
    const controle = new ControleDaHistoria(relogio.agora);
    controle.definirAndarSozinha(false);
    expect(rodar(controle, relogio, 10_000)).toBe(0);
  });
});
