import { describe, expect, it } from "vitest";
import { ClassificadorFalso, probabilidadesCom } from "./dubles";
import { conferirParidade, type CasoDeParidade } from "../../src/application/autoteste-de-paridade";
import { criarDesenho } from "../../src/domain/desenho/desenho";

// Spec `palpites-ao-vivo`, requisito "Autoteste de paridade ao abrir".
const ESPERADO_CNN = probabilidadesCom(0, 0.7);
const ESPERADO_LSTM = probabilidadesCom(0, 0.4);
const CASO: CasoDeParidade = {
  desenho: criarDesenho([
    [
      [0, 0],
      [255, 255],
    ],
  ]),
  probabilidadesCnn: ESPERADO_CNN,
  probabilidadesLstm: ESPERADO_LSTM,
};

function desviado(probabilidades: readonly number[], desvio: number): number[] {
  return probabilidades.map((p, i) => (i === 0 ? p + desvio : i === 1 ? p - desvio : p));
}

describe("autoteste de paridade ao abrir", () => {
  it("paridade conferida: redes iguais às do treino passam", async () => {
    const classificador = new ClassificadorFalso().programar(ESPERADO_CNN, ESPERADO_LSTM);
    const resultado = await conferirParidade(classificador, [CASO, CASO]);
    expect(resultado).toMatchObject({ passou: true, casos: 2 });
    expect(resultado.maiorDiferenca).toBe(0);
  });

  it("modelo trocado: probabilidades diferentes reprovam", async () => {
    const classificador = new ClassificadorFalso().programar(desviado(ESPERADO_CNN, 0.05), ESPERADO_LSTM);
    const resultado = await conferirParidade(classificador, [CASO]);
    expect(resultado.passou).toBe(false);
    expect(resultado.maiorDiferenca).toBeCloseTo(0.05);
  });

  it("tolera diferença de até 1e-4 (arredondamento do runtime)", async () => {
    const dentro = new ClassificadorFalso().programar(ESPERADO_CNN, desviado(ESPERADO_LSTM, 5e-5));
    const fora = new ClassificadorFalso().programar(ESPERADO_CNN, desviado(ESPERADO_LSTM, 2e-4));
    expect((await conferirParidade(dentro, [CASO])).passou).toBe(true);
    expect((await conferirParidade(fora, [CASO])).passou).toBe(false);
  });

  it("redes que não rodam reprovam", async () => {
    const resultado = await conferirParidade(new ClassificadorFalso().programarFalha(), [CASO]);
    expect(resultado.passou).toBe(false);
  });

  it("sem casos não há o que conferir: reprova", async () => {
    const resultado = await conferirParidade(new ClassificadorFalso(), []);
    expect(resultado.passou).toBe(false);
  });

  it("as redes recebem o desenho do treino como está, sem a simplificação da captura", async () => {
    const classificador = new ClassificadorFalso().programar(ESPERADO_CNN, ESPERADO_LSTM);
    await conferirParidade(classificador, [CASO]);
    expect(classificador.desenhosRecebidos[0]).toBe(CASO.desenho);
  });
});
