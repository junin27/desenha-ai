import { describe, expect, it } from "vitest";
import { falaDoZe, probabilidadesCom, TOTAL_DE_CATEGORIAS } from "./dubles";
import { montarPartida, type PartidaDeTeste } from "./montagem";
import { criarDesenho } from "../../src/domain/desenho/desenho";

// Spec `partida`, requisito "Veredito e pontos pela regra".
const VACA = 0;
const DESENHO = criarDesenho([
  [
    [10, 10],
    [200, 40],
    [120, 180],
  ],
]);

/** Vaca em 3º lugar (cavalo 40%, porco 30%, vaca 20%): a regra dá QUASE. */
function vacaEmTerceiro(): number[] {
  const resto = 0.1 / (TOTAL_DE_CATEGORIAS - 3);
  return Array.from({ length: TOTAL_DE_CATEGORIAS }, (_, i) => [0.2, 0.4, 0.3][i] ?? resto);
}

async function desenharEJulgar(probabilidades: readonly number[], fala?: string): Promise<PartidaDeTeste> {
  const montada = montarPartida();
  await montada.partida.comecar("Ana");
  montada.partida.desenhar();
  montada.classificador.programar(probabilidades);
  if (fala === undefined) montada.narrador.programarFalha();
  else montada.narrador.programarFala(fala);
  await montada.partida.registrarTraco(DESENHO);
  await montada.partida.pronto();
  return montada;
}

describe("veredito e pontos pela regra", () => {
  it("Ze discorda da regra: vale QUASE, narração-modelo de QUASE e discordancia registrada", async () => {
    const fala = falaDoZe("Cravou", "VEREDITO: ACERTOU\nNARRAÇÃO: Que vaca linda, sô!");
    const { partida } = await desenharEJulgar(vacaEmTerceiro(), fala);
    expect(partida.estado.etapa).toBe("resultado");
    expect(partida.estado.resultados[0]).toMatchObject({
      veredito: "QUASE",
      pontos: 30,
      narracao: "Narração-modelo QUASE: vaca / cavalo",
      origemDaNarracao: "reserva",
      discordanciaDoZe: true,
    });
  });

  it("Ze concorda com a regra: a narração dele é usada", async () => {
    const fala = falaDoZe("Quase", "VEREDITO: QUASE\nNARRAÇÃO: Passou raspando, uai!");
    const { partida } = await desenharEJulgar(vacaEmTerceiro(), fala);
    expect(partida.estado.resultados[0]).toMatchObject({
      veredito: "QUASE",
      narracao: "Passou raspando, uai!",
      origemDaNarracao: "ze",
      discordanciaDoZe: false,
    });
  });

  it("pontos de um acerto rapido: ACERTOU com 14 s restantes vale 135", async () => {
    const montada = montarPartida();
    await montada.partida.comecar("Ana");
    montada.partida.desenhar();
    montada.classificador.programar(probabilidadesCom(VACA, 0.3)).programar(probabilidadesCom(VACA, 0.85));
    await montada.partida.registrarTraco(DESENHO);
    montada.relogio.avancar(6000);
    await montada.partida.registrarTraco(DESENHO);
    expect(montada.partida.estado.resultados[0]).toMatchObject({ veredito: "ACERTOU", pontos: 135 });
  });

  it("narrador indisponivel no veredito usa a narração-modelo sem registrar discordancia", async () => {
    const { partida } = await desenharEJulgar(vacaEmTerceiro());
    expect(partida.estado.resultados[0]).toMatchObject({
      origemDaNarracao: "reserva",
      discordanciaDoZe: false,
    });
  });

  it("fala do veredito fora do formato usa a narração-modelo", async () => {
    const { partida } = await desenharEJulgar(vacaEmTerceiro(), falaDoZe("Hum", "Ficou bom demais!"));
    expect(partida.estado.resultados[0]).toMatchObject({
      origemDaNarracao: "reserva",
      discordanciaDoZe: false,
    });
  });

  it("rodada sem traco vale ERROU e 0 pontos, sem pedir veredito ao Ze", async () => {
    const montada = montarPartida();
    await montada.partida.comecar("Ana");
    montada.partida.desenhar();
    montada.relogio.avancar(20_000);
    await montada.partida.aguardar();
    expect(montada.partida.estado.resultados[0]).toMatchObject({ veredito: "ERROU", pontos: 0 });
    expect(montada.partida.estado.resultados[0]?.narracao).toBe("Narração-modelo ERROU: vaca / nada");
    expect(montada.narrador.entradasRecebidas.some((e) => e.startsWith("TAREFA: VEREDITO"))).toBe(false);
  });

  it("pede a narração com a entrada VEREDITO (top-5 de cada rede) e desenho a 100% no Pronto", async () => {
    const { narrador } = await desenharEJulgar(vacaEmTerceiro());
    const entrada = narrador.entradasRecebidas.find((e) => e.startsWith("TAREFA: VEREDITO")) ?? "";
    const linhas = entrada.split("\n");
    expect(linhas.slice(0, 3)).toEqual(["TAREFA: VEREDITO", "Desafio: vaca", "Desenho concluído: 100%"]);
    expect(linhas[5]?.startsWith("Ensemble: cavalo 40%, porco 30%, vaca 20%, ")).toBe(true);
    expect(linhas[5]?.split(", ")).toHaveLength(5);
  });

  it("na vitoria antecipada o desenho concluido é a fração do tempo usada", async () => {
    const montada = montarPartida();
    await montada.partida.comecar("Ana");
    montada.partida.desenhar();
    montada.classificador.programar(probabilidadesCom(VACA, 0.3)).programar(probabilidadesCom(VACA, 0.85));
    await montada.partida.registrarTraco(DESENHO);
    montada.relogio.avancar(6000);
    await montada.partida.registrarTraco(DESENHO);
    const entrada = montada.narrador.entradasRecebidas.find((e) => e.startsWith("TAREFA: VEREDITO")) ?? "";
    expect(entrada.split("\n")[2]).toBe("Desenho concluído: 30%");
  });
});
