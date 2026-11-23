import { describe, expect, it } from "vitest";
import { probabilidadesCom } from "./dubles";
import { montarPartida, type PartidaDeTeste } from "./montagem";
import { criarDesenho } from "../../src/domain/desenho/desenho";

// Spec `palpites-ao-vivo`, requisito "Palpite a cada traço" (D3 do design).
const DESENHO = criarDesenho([
  [
    [10, 10],
    [200, 40],
  ],
]);
const PALPITE_ANTIGO = probabilidadesCom(1, 0.5);
const PALPITE_NOVO = probabilidadesCom(2, 0.5);

async function comecarODesenho(controlado = false): Promise<PartidaDeTeste> {
  const montada = montarPartida([0, 1, 2], controlado);
  await montada.partida.comecar("Ana");
  montada.partida.desenhar();
  return montada;
}

describe("palpites não se acumulam", () => {
  it("o palpite antigo que chega depois do pedido novo é descartado", async () => {
    const { partida, classificadorControlado: redes } = await comecarODesenho(true);
    const antigo = partida.registrarTraco(DESENHO);
    const novo = partida.registrarTraco(DESENHO);
    redes.liberar(0, PALPITE_ANTIGO);
    await antigo;
    expect(partida.estado.palpite).toBeUndefined();
    redes.liberar(1, PALPITE_NOVO);
    await novo;
    expect(partida.estado.palpite?.cnn).toEqual(PALPITE_NOVO);
  });

  it("o palpite antigo que chega por último não sobrescreve o mais recente", async () => {
    const { partida, classificadorControlado: redes } = await comecarODesenho(true);
    const antigo = partida.registrarTraco(DESENHO);
    const novo = partida.registrarTraco(DESENHO);
    redes.liberar(1, PALPITE_NOVO);
    await novo;
    redes.liberar(0, PALPITE_ANTIGO);
    await antigo;
    expect(partida.estado.palpite?.cnn).toEqual(PALPITE_NOVO);
  });

  it("limpar descarta o palpite que ainda estava sendo calculado", async () => {
    const { partida, classificadorControlado: redes } = await comecarODesenho(true);
    const pendente = partida.registrarTraco(DESENHO);
    partida.limparDesenho();
    redes.liberar(0, PALPITE_NOVO);
    await pendente;
    expect(partida.estado.palpite).toBeUndefined();
  });
});

describe("limite de 250 ms durante o traço", () => {
  it("durante o traço pede no máximo um palpite a cada 250 ms", async () => {
    const { partida, classificador, relogio } = await comecarODesenho();
    for (const passo of [0, 100, 100, 50]) {
      relogio.avancar(passo);
      await partida.registrarTraco(DESENHO, false);
    }
    expect(classificador.desenhosRecebidos).toHaveLength(2); // aos 0 e aos 250 ms
  });

  it("ao soltar o traço sempre pede um palpite, mesmo dentro dos 250 ms", async () => {
    const { partida, classificador, relogio } = await comecarODesenho();
    await partida.registrarTraco(DESENHO, false);
    relogio.avancar(50);
    await partida.registrarTraco(DESENHO, true);
    expect(classificador.desenhosRecebidos).toHaveLength(2);
  });
});
