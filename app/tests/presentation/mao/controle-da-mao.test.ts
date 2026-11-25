import { beforeEach, describe, expect, it } from "vitest";
import type { DetectorDeMao } from "../../../src/application/portas";
import type { Ponto } from "../../../src/domain/desenho/desenho";
import type { PontosDaMao } from "../../../src/domain/mao/pontos";
import type { Ferramenta } from "../../../src/presentation/captura-do-desenho";
import { ControleDaMao, type QuadroParaAMao } from "../../../src/presentation/mao/controle-da-mao";
import { maoSintetica } from "../../domain/mao/mao-sintetica";

/** Devolve, a cada quadro, a próxima mão da fila (ou a última, repetida). */
class DetectorFalso implements DetectorDeMao {
  fila: (PontosDaMao | undefined)[] = [];
  detectar(): PontosDaMao | undefined {
    return this.fila.length > 1 ? this.fila.shift() : this.fila[0];
  }
}

/** Registra o que o controle pediu ao quadro. */
class QuadroEspiao implements QuadroParaAMao {
  readonly passos: string[] = [];
  ferramenta: Ferramenta = "lapis";
  usar(ferramenta: Ferramenta): void {
    this.ferramenta = ferramenta;
    this.passos.push(`usar:${ferramenta}`);
  }
  comecarEm(ponto: Ponto): void {
    this.passos.push(`comecar:${ponto.map(Math.round).join(",")}`);
  }
  continuarEm(ponto: Ponto): void {
    this.passos.push(`continuar:${ponto.map(Math.round).join(",")}`);
  }
  terminar(): void {
    this.passos.push("terminar");
  }
  apontar(ponto: Ponto | undefined): void {
    this.passos.push(ponto === undefined ? "apontar:nada" : "apontar");
  }
}

const APONTANDO = maoSintetica(["indicador"]);
const FECHADA = maoSintetica([]);
const ABERTA = maoSintetica(["polegar", "indicador", "medio", "anelar", "minimo"]);

let detector: DetectorFalso;
let quadro: QuadroEspiao;
let limpezas: number;
let controle: ControleDaMao;

function quadros(n: number, inicioMs = 0, passoMs = 100): void {
  for (let i = 0; i < n; i++) controle.quadroNovo(inicioMs + i * passoMs);
}

beforeEach(() => {
  detector = new DetectorFalso();
  quadro = new QuadroEspiao();
  limpezas = 0;
  controle = new ControleDaMao(quadro, detector, () => (limpezas += 1));
});

describe("Requisito: Lápis pelo dedo (spec desenho-com-a-mao)", () => {
  it("test_indicador_desenha_depois_de_3_quadros_e_continua", () => {
    detector.fila = [APONTANDO];
    quadros(5);
    expect(quadro.passos.filter((p) => p.startsWith("usar") || p.startsWith("comecar"))).toHaveLength(2);
    expect(quadro.passos).toContain("usar:lapis");
    expect(quadro.passos.filter((p) => p.startsWith("continuar")).length).toBeGreaterThanOrEqual(2);
  });

  it("test_abrir_a_mao_termina_o_traco", () => {
    detector.fila = [APONTANDO, APONTANDO, APONTANDO, APONTANDO, ABERTA];
    quadros(9);
    expect(quadro.passos).toContain("terminar");
  });

  it("test_mao_some_termina_o_traco_e_esconde_o_lapis", () => {
    detector.fila = [APONTANDO, APONTANDO, APONTANDO, APONTANDO, undefined];
    quadros(9);
    expect(quadro.passos).toContain("terminar");
    expect(quadro.passos.at(-1)).toBe("apontar:nada");
  });

  it("test_estado_mostra_o_gesto_para_a_miniatura", () => {
    detector.fila = [APONTANDO];
    quadros(3);
    expect(controle.quadroNovo(400).gesto).toBe("lapis");
  });
});

describe("Requisito: Borracha pela mão fechada", () => {
  it("test_mao_fechada_usa_a_borracha_e_apaga", () => {
    detector.fila = [FECHADA];
    quadros(4);
    expect(quadro.passos).toContain("usar:borracha");
    expect(quadro.passos.some((p) => p.startsWith("comecar"))).toBe(true);
  });
});

describe("Requisito: Limpar com a mão aberta parada", () => {
  it("test_mao_aberta_parada_3s_limpa_uma_vez", () => {
    detector.fila = [ABERTA];
    quadros(40, 0, 100); // 4 s
    expect(limpezas).toBe(1);
  });

  it("test_fracao_do_anel_cresce", () => {
    detector.fila = [ABERTA];
    quadros(3, 0, 100);
    const meio = controle.quadroNovo(1800).fracaoDaLimpeza;
    expect(meio).toBeGreaterThan(0.3);
    expect(meio).toBeLessThan(1);
  });
});

describe("Requisito: Troca de modo durante o desenho", () => {
  it("test_parar_termina_o_traco_em_andamento", () => {
    detector.fila = [APONTANDO];
    quadros(5);
    controle.parar();
    expect(quadro.passos.at(-2)).toBe("terminar");
    expect(quadro.passos.at(-1)).toBe("apontar:nada");
  });
});
