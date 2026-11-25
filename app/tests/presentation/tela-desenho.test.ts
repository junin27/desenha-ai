// @vitest-environment happy-dom
import { beforeEach, describe, expect, it } from "vitest";
import { ESTADO_INICIAL, type EstadoDaPartida } from "../../src/application/estado-da-partida";
import { TelaDesenho } from "../../src/presentation/telas/tela-desenho";
import { CATEGORIAS } from "../application/montagem";
import { ComandosEspioes } from "./comandos-espioes";

let comandos: ComandosEspioes;
let tela: TelaDesenho;

const semEspera = (): Promise<void> => Promise.resolve();

function estado(alteracao: Partial<EstadoDaPartida>): EstadoDaPartida {
  return { ...ESTADO_INICIAL, nome: "Ana", categorias: [0, 1, 2], etapa: "desenhando", ...alteracao };
}

function ferramentaAtiva(): string | undefined {
  return tela.raiz.querySelector<HTMLElement>("[data-ferramenta][aria-pressed=true]")?.dataset["ferramenta"];
}

function ponteiro(tipo: string, x: number, y: number): void {
  const canvas = tela.raiz.querySelector("canvas");
  canvas?.dispatchEvent(new PointerEvent(tipo, { clientX: x, clientY: y, pointerId: 1, bubbles: true }));
}

function humor(): string | undefined {
  return tela.raiz.querySelector<SVGElement>(".ze-svg")?.dataset["humor"];
}

beforeEach(() => {
  document.body.innerHTML = "";
  comandos = new ComandosEspioes();
  tela = new TelaDesenho(
    comandos,
    { nomesDasCategorias: CATEGORIAS, lerPlacar: () => [] },
    { esperar: semEspera },
  );
  document.body.append(tela.raiz);
});

describe("Requisito: Lápis, borracha e limpar (spec ferramentas-de-desenho)", () => {
  it("test_lapis_selecionado_no_comeco_da_rodada", () => {
    tela.atualizar(estado({}));
    expect(ferramentaAtiva()).toBe("lapis");
  });

  it("test_borracha_fica_destacada_ao_ser_escolhida", () => {
    tela.atualizar(estado({}));
    tela.raiz.querySelector<HTMLButtonElement>("[data-ferramenta=borracha]")?.click();
    expect(ferramentaAtiva()).toBe("borracha");
  });

  it("test_nova_rodada_volta_ao_lapis", () => {
    tela.atualizar(estado({}));
    tela.raiz.querySelector<HTMLButtonElement>("[data-ferramenta=borracha]")?.click();
    tela.atualizar(estado({ etapa: "julgando" }));
    tela.atualizar(estado({ rodada: 1 }));
    expect(ferramentaAtiva()).toBe("lapis");
  });

  it("test_borracha_que_apaga_o_unico_traco_limpa_os_palpites", () => {
    tela.atualizar(estado({}));
    ponteiro("pointerdown", 10, 10);
    ponteiro("pointerup", 100, 10);
    tela.raiz.querySelector<HTMLButtonElement>("[data-ferramenta=borracha]")?.click();
    ponteiro("pointerdown", 50, 12);
    expect(comandos.chamadas.at(-1)).toBe("limpar");
    expect(tela.tracos).toEqual([]);
  });

  it("test_borracha_que_deixa_tracos_reclassifica_o_restante", () => {
    tela.atualizar(estado({}));
    ponteiro("pointerdown", 10, 10);
    ponteiro("pointerup", 100, 10);
    ponteiro("pointerdown", 10, 200);
    ponteiro("pointerup", 100, 200);
    tela.raiz.querySelector<HTMLButtonElement>("[data-ferramenta=borracha]")?.click();
    ponteiro("pointerdown", 50, 12);
    expect(comandos.chamadas.at(-1)).toBe("traco:true");
    expect(comandos.desenhos.at(-1)?.tracos).toHaveLength(1);
  });
});

describe("Requisito: Quando cada humor aparece no desenho (spec personagem-do-ze)", () => {
  it("test_ze_torce_e_se_assusta_com_5s", async () => {
    const falasTerminadas = (): Promise<void> => new Promise((resolver) => setTimeout(resolver, 0));
    tela.atualizar(estado({ segundosRestantes: 12 }));
    await falasTerminadas();
    expect(humor()).toBe("torcendo");
    tela.atualizar(estado({ segundosRestantes: 5 }));
    await falasTerminadas();
    expect(humor()).toBe("assustado");
  });
});
