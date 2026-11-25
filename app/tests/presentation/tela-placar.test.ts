// @vitest-environment happy-dom
import { beforeEach, describe, expect, it } from "vitest";
import { ESTADO_INICIAL, type EstadoDaPartida } from "../../src/application/estado-da-partida";
import type { PartidaNoPlacar } from "../../src/domain/rodada/pontuacao";
import { TelaPlacar } from "../../src/presentation/telas/tela-placar";
import { CATEGORIAS } from "../application/montagem";
import { ComandosEspioes } from "./comandos-espioes";

let placar: PartidaNoPlacar[];
let comandos: ComandosEspioes;
let voltou: number;
let tela: TelaPlacar;

const partida = (nome: string, pontos: number, minuto: number): PartidaNoPlacar => ({
  nome,
  pontos,
  terminadaEmMs: minuto * 60_000,
});

function fim(alteracao: Partial<EstadoDaPartida> = {}): EstadoDaPartida {
  return { ...ESTADO_INICIAL, etapa: "fim", ...alteracao };
}

function linhas(): string[] {
  return [...tela.raiz.querySelectorAll("[data-lista=placar] li")].map((li) => li.textContent);
}

function pesquisar(texto: string): void {
  const campo = tela.raiz.querySelector<HTMLInputElement>("[data-campo=busca]");
  if (campo === null) return;
  campo.value = texto;
  campo.dispatchEvent(new Event("input"));
}

beforeEach(() => {
  placar = [];
  comandos = new ComandosEspioes();
  voltou = 0;
  tela = new TelaPlacar(
    comandos,
    { nomesDasCategorias: CATEGORIAS, lerPlacar: () => placar },
    () => (voltou += 1),
  );
});

describe("Requisito: Pódio das 5 melhores (spec placar-com-busca)", () => {
  it("test_podio_com_3_partidas_tem_3_degraus_e_o_1o_no_mais_alto", () => {
    placar = [partida("Bia", 30, 1), partida("Ana", 165, 2), partida("Caio", 90, 3)];
    tela.atualizar(fim());
    const degraus = [...tela.raiz.querySelectorAll<HTMLElement>("[data-parte=podio] [data-posicao]")];
    expect(degraus).toHaveLength(3);
    const primeiro = degraus.find((degrau) => degrau.dataset["posicao"] === "1");
    expect(primeiro?.textContent).toContain("Ana");
    expect(primeiro?.classList.contains("mais-alto")).toBe(true);
  });
});

describe("Requisito: Pesquisa por apelido e posição oficial", () => {
  it("test_pesquisa_sem_acento_mostra_a_posicao_oficial", () => {
    placar = [partida("Peão Veloz", 30, 1), partida("Ana", 165, 2)];
    tela.atualizar(fim());
    pesquisar("peao");
    expect(linhas()).toEqual(["2º Peão Veloz 30 pts"]);
  });

  it("test_pesquisa_sem_resultado_avisa", () => {
    placar = [partida("Ana", 165, 2)];
    tela.atualizar(fim());
    pesquisar("xyz");
    expect(linhas()).toEqual([]);
    expect(tela.raiz.textContent).toContain('Ninguém com "xyz" no placar.');
  });
});

describe("Requisito: Ordenar a lista", () => {
  it("test_recentes_poe_ana_antes_de_bia_e_destaca_a_opcao", () => {
    placar = [partida("Bia", 200, 1), partida("Ana", 10, 5)];
    tela.atualizar(fim());
    tela.raiz.querySelector<HTMLButtonElement>("[data-ordem=recentes]")?.click();
    expect(linhas()[0]).toContain("Ana");
    expect(tela.raiz.querySelector("[data-ordem=recentes]")?.getAttribute("aria-pressed")).toBe("true");
  });
});

describe("Requisito: Partida recém-jogada em destaque", () => {
  it("test_fim_da_partida_destaca_a_linha_e_mostra_total_e_posicao", () => {
    placar = [partida("Bia", 200, 1), partida("Ana", 165, 2), partida("Caio", 30, 3)];
    tela.atualizar(fim({ nome: "Ana", total: 165 }));
    const destacada = tela.raiz.querySelector("[data-lista=placar] li.destaque");
    expect(destacada?.textContent).toContain("2º Ana");
    expect(tela.raiz.querySelector("[data-texto=total]")?.textContent).toContain("165");
    expect(tela.raiz.querySelector("[data-texto=posicao]")?.textContent).toContain("2º");
  });

  it("test_jogar_de_novo_e_voltar", () => {
    tela.atualizar(fim());
    tela.raiz.querySelector<HTMLButtonElement>("[data-acao=nova-partida]")?.click();
    tela.raiz.querySelector<HTMLButtonElement>("[data-acao=voltar-do-placar]")?.click();
    expect(comandos.chamadas).toEqual(["nova"]);
    expect(voltou).toBe(1);
  });
});
