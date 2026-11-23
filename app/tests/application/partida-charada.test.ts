import { describe, expect, it } from "vitest";
import { falaDoZe } from "./dubles";
import { montarPartida } from "./montagem";
import type { LeituraParcial } from "../../src/domain/ze/conversa";

// Spec `partida`, requisito "Charada com reserva".
describe("charada com reserva", () => {
  it("charada do Ze no formato e sem vazamento é usada com origem ze", async () => {
    const { partida, narrador } = montarPartida();
    narrador.programarFala(falaDoZe("Malhada e mansa", "Charada: Malhada e mansa, dá leite. Quem é?"));
    await partida.comecar("Ana");
    expect(partida.estado.charada).toEqual({ texto: "Malhada e mansa, dá leite. Quem é?", origem: "ze" });
  });

  it("pede a charada com a palavra secreta e o nível da rodada (fácil, médio, difícil)", async () => {
    const { partida, narrador } = montarPartida();
    await partida.comecar("Ana");
    for (let rodada = 0; rodada < 2; rodada++) {
      partida.desenhar();
      await partida.pronto();
      await partida.proximaRodada();
    }
    const charadas = narrador.entradasRecebidas.filter((e) => e.startsWith("TAREFA: CHARADA"));
    expect(charadas).toEqual([
      "TAREFA: CHARADA\nPalavra secreta: vaca\nNível: fácil",
      "TAREFA: CHARADA\nPalavra secreta: cavalo\nNível: médio",
      "TAREFA: CHARADA\nPalavra secreta: porco\nNível: difícil",
    ]);
  });

  it("charada do Ze que vaza a palavra é trocada pela reserva", async () => {
    const { partida, narrador } = montarPartida();
    narrador.programarFala(falaDoZe("Vaca", "Charada: Quem é a vaquinha?"));
    await partida.comecar("Ana");
    expect(partida.estado.charada).toEqual({ texto: "Charada de reserva da vaca", origem: "reserva" });
  });

  it.each(["narrador_indisponivel", "narrador_lento"] as const)(
    "falha %s do narrador usa a charada de reserva",
    async (codigo) => {
      const { partida, narrador } = montarPartida();
      narrador.programarFalha(codigo);
      await partida.comecar("Ana");
      expect(partida.estado.charada?.origem).toBe("reserva");
    },
  );

  it.each([
    ["sem as tags", "Charada: Quem dá leite?"],
    ["sem o prefixo Charada:", falaDoZe("Hum", "Quem dá leite?")],
  ])("fala fora do formato (%s) usa a charada de reserva", async (_, texto) => {
    const { partida, narrador } = montarPartida();
    narrador.programarFala(texto);
    await partida.comecar("Ana");
    expect(partida.estado.charada?.origem).toBe("reserva");
  });

  it("mostra o Ze pensando ao vivo durante a charada e limpa a fala ao terminar", async () => {
    const { partida, narrador } = montarPartida();
    narrador.programarFala(falaDoZe("Malhada e mansa", "Charada: Dá leite. Quem é?"));
    const leituras: LeituraParcial[] = [];
    partida.aoMudar((estado) => {
      if (estado.falaAoVivo !== undefined) leituras.push(estado.falaAoVivo);
    });
    await partida.comecar("Ana");
    expect(leituras.some((l) => l.etapa === "pensando" && l.pensamento.startsWith("Malhada"))).toBe(true);
    expect(partida.estado.falaAoVivo).toBeUndefined();
  });

  it("o botão de desenhar só funciona depois que a charada chegou", async () => {
    const { partida } = montarPartida();
    const comecando = partida.comecar("Ana");
    partida.desenhar();
    expect(partida.estado.etapa).toBe("charada");
    await comecando;
    partida.desenhar();
    expect(partida.estado.etapa).toBe("desenhando");
  });
});
