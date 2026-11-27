// @vitest-environment happy-dom
import { describe, expect, it } from "vitest";
import {
  capituloEm,
  ControleDaHistoria,
  DURACAO_DA_HISTORIA,
  INICIO_DOS_CAPITULOS,
  ligarEntrada,
  PARADAS_DOS_CAPITULOS,
} from "../../../src/presentation/vitrine/controle-da-historia";
import { CAPITULOS } from "../../../src/domain/vitrine/capitulos";

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
  it("test_avancar_com_a_tecla_vai_ate_a_parada_do_jogo", () => {
    const relogio = new RelogioFalso();
    const controle = new ControleDaHistoria(relogio.agora);
    ligarEntrada(window, controle, () => true);
    rodar(controle, relogio, 6000);
    window.dispatchEvent(new KeyboardEvent("keydown", { key: "ArrowDown" }));
    expect(rodar(controle, relogio, 6000)).toBeCloseTo(PARADAS_DOS_CAPITULOS[1] ?? -1, 5);
    expect(capituloEm(controle.segundos)).toBe("jogo");
  });

  it("test_seta_para_cima_volta_a_parada_anterior", () => {
    const relogio = new RelogioFalso();
    const controle = new ControleDaHistoria(relogio.agora);
    controle.irPara(PARADAS_DOS_CAPITULOS[2] ?? -1);
    ligarEntrada(window, controle, () => true);
    window.dispatchEvent(new KeyboardEvent("keydown", { key: "PageUp" }));
    expect(rodar(controle, relogio, 6000)).toBeCloseTo(PARADAS_DOS_CAPITULOS[1] ?? -1, 5);
  });

  it("test_voltar_na_abertura_nao_desfaz_o_titulo", () => {
    const relogio = new RelogioFalso();
    const controle = new ControleDaHistoria(relogio.agora);
    ligarEntrada(window, controle, () => true);
    rodar(controle, relogio, 6000);
    window.dispatchEvent(new KeyboardEvent("keydown", { key: "PageUp" }));
    expect(rodar(controle, relogio, 6000)).toBeCloseTo(PARADAS_DOS_CAPITULOS[0] ?? -1, 5);
  });

  it("test_passagem_toca_inteira_sem_pular_quadros", () => {
    const relogio = new RelogioFalso();
    const controle = new ControleDaHistoria(relogio.agora);
    rodar(controle, relogio, 6000);
    controle.avancarCapitulo();
    let anterior = controle.segundos;
    let maiorSalto = 0;
    for (let i = 0; i < 400; i++) {
      relogio.ms += 16;
      const agora = controle.passo();
      maiorSalto = Math.max(maiorSalto, Math.abs(agora - anterior));
      anterior = agora;
    }
    expect(maiorSalto).toBeLessThan(0.05);
  });

  it("test_rodinha_nao_rola_a_pagina", () => {
    const controle = new ControleDaHistoria(() => 0);
    ligarEntrada(window, controle, () => true);
    const rodinha = new WheelEvent("wheel", { deltaY: -300, cancelable: true });
    window.dispatchEvent(rodinha);
    expect(rodinha.defaultPrevented).toBe(true);
    expect(window.scrollY).toBe(0);
  });

  it("test_cada_capitulo_tem_uma_parada_em_ordem_dentro_dele", () => {
    expect(PARADAS_DOS_CAPITULOS).toHaveLength(11);
    PARADAS_DOS_CAPITULOS.forEach((parada, indice) => {
      expect(capituloEm(parada)).toBe(CAPITULOS[indice]?.id);
    });
    expect(PARADAS_DOS_CAPITULOS.at(-1)).toBe(DURACAO_DA_HISTORIA);
  });
});

describe("Requisito: História só anda com o visitante (spec vitrine-da-abertura)", () => {
  it("test_visitante_parado_30_segundos_continua_na_abertura", () => {
    const relogio = new RelogioFalso();
    const controle = new ControleDaHistoria(relogio.agora);
    expect(rodar(controle, relogio, 30_000)).toBeCloseTo(PARADAS_DOS_CAPITULOS[0] ?? -1, 5);
    expect(capituloEm(controle.segundos)).toBe("abertura");
  });

  it("test_parado_no_fim_nao_recomeca_sozinho", () => {
    const relogio = new RelogioFalso();
    const controle = new ControleDaHistoria(relogio.agora);
    controle.irPara(DURACAO_DA_HISTORIA);
    expect(rodar(controle, relogio, 30_000)).toBe(DURACAO_DA_HISTORIA);
  });
});

describe("Requisito: Rodinha acompanha a transição (spec vitrine-da-abertura)", () => {
  function naParada(indice: number): { controle: ControleDaHistoria; relogio: RelogioFalso } {
    const relogio = new RelogioFalso();
    const controle = new ControleDaHistoria(relogio.agora);
    controle.irPara(PARADAS_DOS_CAPITULOS[indice] ?? -1);
    ligarEntrada(window, controle, () => true);
    return { controle, relogio };
  }
  const girar = (deltaY: number): boolean =>
    window.dispatchEvent(new WheelEvent("wheel", { deltaY, cancelable: true }));

  it("test_meio_giro_para_no_meio_do_portal", () => {
    const { controle, relogio } = naParada(0);
    girar(-100);
    expect(rodar(controle, relogio, 3000)).toBeCloseTo((PARADAS_DOS_CAPITULOS[0] ?? -1) + 0.5, 5);
  });

  it("test_varios_giros_somam", () => {
    const { controle, relogio } = naParada(0);
    girar(-100);
    girar(-100);
    expect(rodar(controle, relogio, 3000)).toBeCloseTo((PARADAS_DOS_CAPITULOS[0] ?? -1) + 1, 5);
  });

  it("test_trecho_parado_e_atravessado", () => {
    const { controle, relogio } = naParada(1);
    girar(100);
    expect(rodar(controle, relogio, 3000)).toBeCloseTo(INICIO_DOS_CAPITULOS.jogo + 3, 5);
  });

  it("test_rodinha_para_baixo_na_abertura_nao_desfaz_o_titulo", () => {
    const { controle, relogio } = naParada(0);
    girar(300);
    expect(rodar(controle, relogio, 3000)).toBeCloseTo(PARADAS_DOS_CAPITULOS[0] ?? -1, 5);
  });

  it("test_rodinha_nao_passa_do_fim", () => {
    const { controle, relogio } = naParada(10);
    girar(-1000);
    expect(rodar(controle, relogio, 3000)).toBeCloseTo(DURACAO_DA_HISTORIA, 5);
  });
});
