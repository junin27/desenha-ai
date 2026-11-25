import { describe, expect, it } from "vitest";
import { listarPlacar } from "../../../src/domain/rodada/listagem-do-placar";
import type { PartidaNoPlacar } from "../../../src/domain/rodada/pontuacao";

const partida = (nome: string, pontos: number, minuto: number): PartidaNoPlacar => ({
  nome,
  pontos,
  terminadaEmMs: minuto * 60_000,
});
// 12 partidas: J11 tem mais pontos (1º) e J0 menos (12º).
const ULTIMA = partida("J0", 0, 0);
const PRIMEIRA = partida("J11", 110, 11);
const DOZE = [
  ULTIMA,
  ...Array.from({ length: 10 }, (_, i) => partida(`J${i + 1}`, (i + 1) * 10, i + 1)),
  PRIMEIRA,
];

describe("Requisito: Ordem do placar e listagem (specs pontuacao-e-placar e placar-com-busca)", () => {
  it("test_sem_busca_mostra_as_10_primeiras_numeradas", () => {
    const linhas = listarPlacar(DOZE);
    expect(linhas).toHaveLength(10);
    expect(linhas.map((l) => l.posicao)).toEqual([1, 2, 3, 4, 5, 6, 7, 8, 9, 10]);
    expect(linhas[0]?.partida.nome).toBe("J11");
  });

  it("test_busca_alcanca_a_12a_com_a_posicao_oficial", () => {
    expect(listarPlacar(DOZE, { busca: "j0" })).toEqual([{ posicao: 12, partida: ULTIMA, destaque: false }]);
  });

  it("test_busca_ignora_acento_e_caixa", () => {
    const placar = [partida("Peão Veloz", 100, 1), partida("Bia", 50, 2)];
    expect(listarPlacar(placar, { busca: "PEAO" }).map((l) => l.partida.nome)).toEqual(["Peão Veloz"]);
  });

  it("test_busca_sem_resultado_devolve_lista_vazia", () => {
    expect(listarPlacar(DOZE, { busca: "xyz" })).toEqual([]);
  });

  it("test_ordem_recentes_poe_quem_terminou_por_ultimo_primeiro", () => {
    const ana = partida("Ana", 10, 5);
    const bia = partida("Bia", 99, 1);
    const linhas = listarPlacar([bia, ana], { ordem: "recentes" });
    expect(linhas.map((l) => [l.partida.nome, l.posicao])).toEqual([
      ["Ana", 2],
      ["Bia", 1],
    ]);
  });

  it("test_ordem_alfabetica_ignora_acento", () => {
    const placar = [partida("Zé", 1, 1), partida("Ágata", 2, 2), partida("Bruno", 3, 3)];
    expect(listarPlacar(placar, { ordem: "nome" }).map((l) => l.partida.nome)).toEqual([
      "Ágata",
      "Bruno",
      "Zé",
    ]);
  });

  it("test_partida_recem_jogada_fora_do_top10_aparece_abaixo_da_10a", () => {
    const linhas = listarPlacar(DOZE, { recemJogada: ULTIMA });
    expect(linhas).toHaveLength(11);
    expect(linhas[10]).toEqual({ posicao: 12, partida: ULTIMA, destaque: true });
  });

  it("test_partida_recem_jogada_no_top10_fica_destacada_no_lugar", () => {
    const linhas = listarPlacar(DOZE, { recemJogada: PRIMEIRA });
    expect(linhas).toHaveLength(10);
    expect(linhas[0]?.destaque).toBe(true);
  });
});
