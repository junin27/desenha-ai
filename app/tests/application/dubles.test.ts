import { describe, expect, it } from "vitest";
import { ClassificadorFalso, NarradorFalso, RelogioFalso, SorteadorFixo, falaDoZe } from "./dubles";
import { criarDesenho } from "../../src/domain/desenho/desenho";
import type { LeituraParcial } from "../../src/domain/ze/conversa";

// Os dublês sustentam todos os testes da aplicação: se eles mentirem, os testes da partida mentem junto.
describe("dublês das portas", () => {
  it("relógio falso dispara o agendamento a cada intervalo e para ao cancelar", () => {
    const relogio = new RelogioFalso();
    const disparos: number[] = [];
    const cancelar = relogio.aCada(100, () => disparos.push(relogio.agora()));
    relogio.avancar(350);
    cancelar();
    relogio.avancar(200);
    expect(disparos).toEqual([100, 200, 300]);
    expect(relogio.agora()).toBe(550);
  });

  it("sorteador fixo devolve a ordem pedida", () => {
    expect(new SorteadorFixo([2, 0]).embaralhar(["a", "b", "c"])).toEqual(["c", "a"]);
    expect(new SorteadorFixo().embaralhar(["a", "b"])).toEqual(["a", "b"]);
  });

  it("classificador falso devolve as respostas programadas em ordem e repete a última", async () => {
    const classificador = new ClassificadorFalso().programar([1, 0]).programar([0, 1]);
    const desenho = criarDesenho([[[0, 0]]]);
    const primeira = await classificador.classificar(desenho);
    const segunda = await classificador.classificar(desenho);
    const terceira = await classificador.classificar(desenho);
    expect([primeira, segunda, terceira].map((r) => (r.ok ? r.valor.cnn : []))).toEqual([
      [1, 0],
      [0, 1],
      [0, 1],
    ]);
  });

  it("narrador falso informa leituras parciais e termina com a fala completa", async () => {
    const leituras: LeituraParcial[] = [];
    const narrador = new NarradorFalso().programarFala(falaDoZe("Malhada", "Charada: Quem dá leite?"));
    const resposta = await narrador.falar("TAREFA: CHARADA", (l) => leituras.push(l));
    expect(resposta.ok).toBe(true);
    expect(leituras[0]?.etapa).toBe("pensando");
    expect(leituras.at(-1)).toEqual({
      etapa: "completa",
      pensamento: "Malhada",
      resposta: "Charada: Quem dá leite?",
    });
  });
});
