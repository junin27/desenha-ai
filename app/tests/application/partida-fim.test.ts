import { describe, expect, it } from "vitest";
import { probabilidadesCom } from "./dubles";
import { montarPartida } from "./montagem";
import { criarDesenho } from "../../src/domain/desenho/desenho";

// Spec `partida`, requisito "Fim da partida e placar".
const DESENHO = criarDesenho([
  [
    [10, 10],
    [200, 40],
    [120, 180],
  ],
]);
const VACA = 0;
const PORCO = 2;

describe("fim da partida e placar", () => {
  it("partida gravada: rodadas de 135, 30 e 0 gravam 165 pontos com o nome do jogador", async () => {
    const { partida, classificador, relogio, placar } = montarPartida();
    await partida.comecar("Ana");

    partida.desenhar(); // rodada 1 (vaca): vitória antecipada aos 6 s
    classificador.programar(probabilidadesCom(VACA, 0.3)).programar(probabilidadesCom(VACA, 0.85));
    await partida.registrarTraco(DESENHO);
    relogio.avancar(6000);
    await partida.registrarTraco(DESENHO);
    await partida.proximaRodada();

    partida.desenhar(); // rodada 2 (cavalo): o porco lidera e o cavalo fica em 2º, QUASE
    const quase = probabilidadesCom(PORCO, 0.5).map((p, i) =>
      i === 1 ? p + 0.01 : i === PORCO ? p - 0.01 : p,
    );
    classificador.programar(quase);
    await partida.registrarTraco(DESENHO);
    await partida.pronto();
    await partida.proximaRodada();

    partida.desenhar(); // rodada 3 (porco): sem traço até o fim do tempo, ERROU
    relogio.avancar(20_000);
    await partida.aguardar();
    expect(partida.estado.resultados.map((r) => r.pontos)).toEqual([135, 30, 0]);
    expect(placar.partidas).toEqual([]);

    await partida.proximaRodada();
    expect(partida.estado.etapa).toBe("fim");
    expect(placar.partidas).toEqual([{ nome: "Ana", pontos: 165, terminadaEmMs: relogio.agora() }]);
  });

  it("o total da partida fica disponível no estado", async () => {
    const { partida } = montarPartida();
    await partida.comecar("Ana");
    for (let rodada = 0; rodada < 3; rodada++) {
      partida.desenhar();
      await partida.pronto();
      await partida.proximaRodada();
    }
    expect(partida.estado.etapa).toBe("fim");
    expect(partida.estado.total).toBe(0);
  });
});
