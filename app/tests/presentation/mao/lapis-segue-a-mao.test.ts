// @vitest-environment happy-dom
import { beforeEach, describe, expect, it } from "vitest";
import type { DetectorDeMao } from "../../../src/application/portas";
import type { Ponto } from "../../../src/domain/desenho/desenho";
import { centroDaPalma, noQuadro } from "../../../src/domain/mao/coordenadas";
import type { PontosDaMao } from "../../../src/domain/mao/pontos";
import type { GeradorDeSom } from "../../../src/presentation/lapis/som-do-desenho";
import { QuadroDeDesenho } from "../../../src/presentation/lapis/quadro-de-desenho";
import { ControleDaMao, type QuadroParaAMao } from "../../../src/presentation/mao/controle-da-mao";
import { ModoDeDesenhoAtual } from "../../../src/presentation/mao/seletor-de-modo";
import { TelaInicio } from "../../../src/presentation/telas/tela-inicio";
import { maoSintetica } from "../../domain/mao/mao-sintetica";
import { ComandosEspioes } from "../comandos-espioes";

// Tarefas 4.1 e 4.3 de `desenho-com-a-mao`: de onde vêm as coordenadas do lápis, o lápis visual que as segue
// e o seletor de modo na tela de apelido.
const LADO = 560;
const PONTA_DO_INDICADOR = 8;
const TOLERANCIA_EM_PX = 2;
const APONTANDO = maoSintetica(["indicador"]);
const FECHADA = maoSintetica([]);
const ABERTA = maoSintetica(["polegar", "indicador", "medio", "anelar", "minimo"]);

class DetectorFixo implements DetectorDeMao {
  constructor(public mao: PontosDaMao | undefined) {}
  detectar(): PontosDaMao | undefined {
    return this.mao;
  }
}

/** Guarda o último ponto de cada passo, para conferir de onde ele veio. */
class QuadroComPontos implements QuadroParaAMao {
  comecou: Ponto | undefined;
  continuou: Ponto | undefined;
  apontou: Ponto | undefined | "nada";
  usar(): void {}
  comecarEm(ponto: Ponto): void {
    this.comecou = ponto;
  }
  continuarEm(ponto: Ponto): void {
    this.continuou = ponto;
  }
  terminar(): void {}
  apontar(ponto: Ponto | undefined): void {
    this.apontou = ponto ?? "nada";
  }
}

function rodar(mao: PontosDaMao, quadros = 6): QuadroComPontos {
  const quadro = new QuadroComPontos();
  const controle = new ControleDaMao(quadro, new DetectorFixo(mao), () => undefined, LADO);
  for (let i = 0; i < quadros; i++) controle.quadroNovo(i * 100);
  return quadro;
}

describe("Requisito: Lápis pelo dedo — de onde vem o ponto (spec desenho-com-a-mao)", () => {
  it("test_lapis_desenha_pela_ponta_do_indicador_espelhada", () => {
    const ponta = APONTANDO[PONTA_DO_INDICADOR];
    if (ponta === undefined) throw new Error("mão sintética sem o ponto 8");
    const quadro = rodar(APONTANDO);
    expect(quadro.continuou).toEqual(noQuadro(ponta, LADO));
  });

  it("test_borracha_apaga_pelo_centro_da_palma", () => {
    const palma = centroDaPalma(FECHADA);
    if (palma === undefined) throw new Error("mão sintética sem palma");
    const quadro = rodar(FECHADA);
    expect(quadro.comecou).toEqual(noQuadro(palma, LADO));
  });

  it("test_mao_aberta_so_aponta_pela_palma_sem_desenhar", () => {
    const palma = centroDaPalma(ABERTA);
    if (palma === undefined) throw new Error("mão sintética sem palma");
    const quadro = rodar(ABERTA);
    expect(quadro.apontou).toEqual(noQuadro(palma, LADO));
    expect(quadro.comecou).toBeUndefined();
  });
});

const somMudo: GeradorDeSom = { ajustarRuido: () => undefined, tocarBip: () => undefined };

describe("Requisito: Lápis no quadro segue o dedo (spec lapis-no-quadro)", () => {
  let quadro: QuadroDeDesenho;
  const lapis = (): HTMLElement | null => quadro.raiz.querySelector<HTMLElement>(".lapis-no-quadro");
  const posicaoDoLapis = (): [number, number] => {
    const achou = /translate\(([-\d.]+)px, ([-\d.]+)px\)/u.exec(lapis()?.style.transform ?? "");
    return [Number(achou?.[1]), Number(achou?.[2])];
  };

  beforeEach(() => {
    quadro = new QuadroDeDesenho(() => undefined, { gerador: somMudo, somLigado: false });
  });

  it("test_comecar_e_continuar_pelo_dedo_levam_o_lapis_ate_o_ponto", () => {
    quadro.comecarEm([100, 120]);
    quadro.continuarEm([200, 150]);
    expect(lapis()?.classList.contains("visivel")).toBe(true);
    const [x, y] = posicaoDoLapis();
    // A captura interpola o traço em passos curtos, então a ponta chega a menos de 2 px do ponto pedido.
    expect(Math.abs(x - 200)).toBeLessThan(TOLERANCIA_EM_PX);
    expect(Math.abs(y - 150)).toBeLessThan(TOLERANCIA_EM_PX);
  });

  it("test_mao_some_esconde_o_lapis", () => {
    quadro.comecarEm([100, 120]);
    quadro.terminar();
    quadro.apontar(undefined);
    expect(lapis()?.classList.contains("visivel")).toBe(false);
  });

  it("test_apontar_sem_tocar_move_o_lapis", () => {
    quadro.apontar([300, 310]);
    expect(lapis()?.style.transform).toContain("translate(300px, 310px)");
  });
});

describe("Requisito: Modo de desenho na tela de apelido (spec desenho-com-a-mao)", () => {
  it("test_apelido_tem_o_seletor_e_escolher_mao_muda_o_modo_compartilhado", () => {
    const gravados: string[] = [];
    const modo = new ModoDeDesenhoAtual("mouse", (novo) => gravados.push(novo));
    const semConversa = {
      abrir: () => undefined,
      perguntar: () => Promise.resolve(),
      voltar: () => undefined,
    };
    const tela = new TelaInicio(new ComandosEspioes(), semConversa, () => undefined, {}, modo);
    const mao = tela.raiz.querySelector<HTMLButtonElement>("[data-modo=mao]");
    expect(mao).not.toBeNull();
    mao?.click();
    expect(modo.valor).toBe("mao");
    expect(gravados).toEqual(["mao"]);
  });
});
