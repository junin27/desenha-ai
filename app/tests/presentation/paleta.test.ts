// @vitest-environment happy-dom
import { beforeEach, describe, expect, it } from "vitest";
import { ESTADO_INICIAL, type EstadoDaPartida } from "../../src/application/estado-da-partida";
import type { GeradorDeSom } from "../../src/presentation/lapis/som-do-desenho";
import { TelaDesenho } from "../../src/presentation/telas/tela-desenho";
import { CATEGORIAS } from "../application/montagem";
import { ComandosEspioes } from "./comandos-espioes";

const semEspera = (): Promise<void> => Promise.resolve();
const somMudo: GeradorDeSom = { ajustarRuido: () => undefined, tocarBip: () => undefined };
let comandos: ComandosEspioes;
let tela: TelaDesenho;
let corNoPonto: string;

function estado(alteracao: Partial<EstadoDaPartida> = {}): EstadoDaPartida {
  return { ...ESTADO_INICIAL, nome: "Ana", categorias: [0, 1, 2], etapa: "desenhando", ...alteracao };
}

function pressionado(seletor: string): string | null | undefined {
  return tela.raiz.querySelector(seletor)?.getAttribute("aria-pressed");
}

function clicar(seletor: string): void {
  tela.raiz.querySelector<HTMLButtonElement>(seletor)?.click();
}

function ponteiro(tipo: string, x: number, y: number): void {
  tela.raiz
    .querySelector("canvas.quadro")
    ?.dispatchEvent(new PointerEvent(tipo, { clientX: x, clientY: y, pointerId: 1, bubbles: true }));
}

beforeEach(() => {
  document.body.innerHTML = "";
  comandos = new ComandosEspioes();
  corNoPonto = "#b3261e";
  tela = new TelaDesenho(
    comandos,
    { nomesDasCategorias: CATEGORIAS, lerPlacar: () => [] },
    { esperar: semEspera, gerador: somMudo, lerCor: () => corNoPonto },
  );
  document.body.append(tela.raiz);
});

describe("Requisito: Painel de desenho (spec paleta-de-desenho)", () => {
  it("test_comeco_da_rodada_lapis_espessura_media_e_cor_tinta", () => {
    clicar('[data-cor="#1f5fa8"]');
    clicar('[data-espessura="grossa"]');
    tela.atualizar(estado({ etapa: "julgando" }));
    tela.atualizar(estado({ rodada: 1 }));
    expect(pressionado("[data-ferramenta=lapis]")).toBe("true");
    expect(pressionado('[data-espessura="media"]')).toBe("true");
    expect(pressionado('[data-cor="#2b1a0a"]')).toBe("true");
  });

  it("test_paleta_tem_16_cores_e_3_espessuras", () => {
    expect(tela.raiz.querySelectorAll("[data-cor]")).toHaveLength(16);
    expect(tela.raiz.querySelectorAll("[data-espessura]")).toHaveLength(3);
    expect(tela.raiz.querySelectorAll("button[data-ferramenta]")).toHaveLength(4);
  });
});

describe("Requisito: Cor e espessura de cada traço", () => {
  it("test_traco_vermelho_manda_os_mesmos_pontos_e_guarda_a_cor", () => {
    tela.atualizar(estado());
    clicar('[data-cor="#b3261e"]');
    ponteiro("pointerdown", 10, 10);
    ponteiro("pointermove", 50, 50);
    ponteiro("pointerup", 90, 90);
    expect(comandos.desenhos.at(-1)?.tracos).toEqual([
      [
        [10, 10],
        [50, 50],
        [90, 90],
      ],
    ]);
    expect(tela.estilos[0]?.cor).toBe("#b3261e");
  });

  it("test_trocar_a_cor_vale_so_para_o_proximo_traco", () => {
    tela.atualizar(estado());
    ponteiro("pointerdown", 10, 10);
    ponteiro("pointerup", 20, 20);
    clicar('[data-cor="#2f7d32"]');
    ponteiro("pointerdown", 30, 30);
    ponteiro("pointerup", 40, 40);
    expect(tela.estilos.map((estilo) => estilo.cor)).toEqual(["#2b1a0a", "#2f7d32"]);
  });
});

describe("Requisito: Conta-gotas", () => {
  it("test_conta_gotas_pega_a_cor_e_volta_ao_lapis", () => {
    tela.atualizar(estado());
    clicar("[data-ferramenta=contagotas]");
    ponteiro("pointerdown", 30, 30);
    ponteiro("pointerup", 30, 30);
    expect(pressionado('[data-cor="#b3261e"]')).toBe("true");
    expect(pressionado("[data-ferramenta=lapis]")).toBe("true");
    expect(comandos.desenhos).toEqual([]);
  });
});

describe("Requisito: Balde", () => {
  it("test_balde_nao_cria_traco_nem_muda_os_palpites", () => {
    tela.atualizar(estado());
    clicar("[data-ferramenta=balde]");
    ponteiro("pointerdown", 30, 30);
    ponteiro("pointerup", 30, 30);
    expect(comandos.chamadas).toEqual([]);
    expect(tela.tracos).toEqual([]);
  });
});
