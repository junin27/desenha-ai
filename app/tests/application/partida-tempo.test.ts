import { describe, expect, it } from "vitest";
import { probabilidadesCom } from "./dubles";
import { montarPartida, type PartidaDeTeste } from "./montagem";
import { criarDesenho } from "../../src/domain/desenho/desenho";
import { prepararDesenhoCapturado } from "../../src/domain/desenho/simplificacao";

// Spec `partida`, requisito "Tempo do desenho e vitória antecipada".
const VACA = 0;
const DESENHO = criarDesenho([
  [
    [10, 10],
    [200, 40],
    [120, 180],
  ],
]);
const PALPITE_FRACO = probabilidadesCom(VACA, 0.3);
const PALPITE_FORTE = probabilidadesCom(VACA, 0.85);

async function comecarODesenho(): Promise<PartidaDeTeste> {
  const montada = montarPartida();
  await montada.partida.comecar("Ana");
  montada.partida.desenhar();
  return montada;
}

describe("tempo do desenho e vitória antecipada", () => {
  it("vitoria antecipada aos 6 s com 85% vai para julgando com 14 s restantes", async () => {
    const { partida, classificador, relogio, etapas } = await comecarODesenho();
    classificador.programar(PALPITE_FRACO).programar(PALPITE_FORTE);
    await partida.registrarTraco(DESENHO);
    relogio.avancar(6000);
    await partida.registrarTraco(DESENHO);
    expect(etapas).toContain("julgando");
    expect(partida.estado.segundosRestantes).toBe(14);
  });

  it("sem vitoria antecipada antes de 2 s, mesmo com 85%", async () => {
    const { partida, classificador, relogio } = await comecarODesenho();
    classificador.programar(PALPITE_FORTE);
    await partida.registrarTraco(DESENHO);
    relogio.avancar(1500);
    await partida.registrarTraco(DESENHO);
    expect(partida.estado.etapa).toBe("desenhando");
  });

  it("tempo esgotado aos 20 s vai para julgando com 0 s e o ultimo palpite", async () => {
    const { partida, classificador, relogio, etapas } = await comecarODesenho();
    classificador.programar(PALPITE_FRACO);
    await partida.registrarTraco(DESENHO);
    relogio.avancar(20_000);
    await partida.aguardar();
    expect(etapas).toContain("julgando");
    expect(partida.estado.segundosRestantes).toBe(0);
    expect(partida.estado.palpite?.ensemble[VACA]).toBeCloseTo(0.3);
  });

  it("o cronometro conta a partir do primeiro traco", async () => {
    const { partida, relogio } = await comecarODesenho();
    relogio.avancar(5000);
    expect(partida.estado.segundosRestantes).toBe(20);
    await partida.registrarTraco(DESENHO);
    relogio.avancar(5000);
    expect(partida.estado.segundosRestantes).toBe(15);
  });

  it("botao Pronto encerra antes do tempo e guarda os segundos restantes", async () => {
    const { partida, relogio, etapas } = await comecarODesenho();
    await partida.registrarTraco(DESENHO);
    relogio.avancar(8000);
    await partida.pronto();
    expect(etapas).toContain("julgando");
    expect(partida.estado.segundosRestantes).toBe(12);
  });

  it("rodada sem traco é encerrada 20 s depois do inicio da etapa, sem palpite", async () => {
    const { partida, relogio } = await comecarODesenho();
    relogio.avancar(19_900);
    expect(partida.estado.etapa).toBe("desenhando");
    relogio.avancar(100);
    await partida.aguardar();
    expect(partida.estado.etapa).not.toBe("desenhando");
    expect(partida.estado.palpite).toBeUndefined();
    expect(partida.estado.segundosRestantes).toBe(0);
  });

  it("o cronometro para quando a rodada sai do desenho", async () => {
    const { partida, relogio } = await comecarODesenho();
    await partida.pronto();
    expect(relogio.agendamentosAtivos).toBe(0);
  });

  it("as redes recebem o desenho capturado já preparado (normalizado e simplificado)", async () => {
    const { partida, classificador } = await comecarODesenho();
    await partida.registrarTraco(DESENHO);
    expect(classificador.desenhosRecebidos[0]).toEqual(prepararDesenhoCapturado(DESENHO));
  });

  it("o palpite traz CNN, LSTM e o ensemble com o peso da CNN", async () => {
    const { partida, classificador } = await comecarODesenho();
    classificador.programar(probabilidadesCom(VACA, 0.5), probabilidadesCom(VACA, 0.25));
    await partida.registrarTraco(DESENHO);
    expect(partida.estado.palpite?.ensemble[VACA]).toBeCloseTo(0.6 * 0.5 + 0.4 * 0.25);
  });

  it("limpar apaga o palpite sem reiniciar o cronometro", async () => {
    const { partida, classificador, relogio } = await comecarODesenho();
    classificador.programar(PALPITE_FRACO);
    await partida.registrarTraco(DESENHO);
    relogio.avancar(3000);
    partida.limparDesenho();
    expect(partida.estado.palpite).toBeUndefined();
    expect(partida.estado.segundosRestantes).toBe(17);
  });
});
