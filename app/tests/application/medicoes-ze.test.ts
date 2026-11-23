import { describe, expect, it } from "vitest";
import { falaDoZe, NarradorFalso, probabilidadesCom, RelogioFalso, TOTAL_DE_CATEGORIAS } from "./dubles";
import { montarPartida } from "./montagem";
import { contarFalasDaPartida } from "../../src/application/contador-de-falas";
import { MedicoesDaSessao } from "../../src/application/medicoes-da-sessao";
import { NarradorMedido } from "../../src/application/narrador-medido";
import type { ErroDoNarrador, FalaFinal, NarradorDoJogo, OuvinteDaFala } from "../../src/application/portas";
import { criarDesenho } from "../../src/domain/desenho/desenho";
import { ok, type Resultado } from "../../src/domain/resultado";
import { lerParcial } from "../../src/domain/ze/conversa";

// Spec `painel-tecnico`, requisito "Medições do Zé".
const FALA = falaDoZe("Malhada", "Charada: Dá leite. Quem é?");

/** Narrador que leva 300 ms até o 1º pedaço e 8 s no total, no relógio falso. */
class NarradorCronometrado implements NarradorDoJogo {
  constructor(private readonly relogio: RelogioFalso) {}

  falar(_entrada: string, aoLer: OuvinteDaFala): Promise<Resultado<FalaFinal, ErroDoNarrador>> {
    this.relogio.avancar(300);
    aoLer(lerParcial("<pensamento>Malha"));
    this.relogio.avancar(7700);
    return Promise.resolve(ok({ texto: FALA, tokens: 120, tokensPorSegundo: 15 }));
  }
}

describe("medições do Zé", () => {
  it("fala medida: 120 tokens a 15 tokens/s, tempo até o 1º token e duração", async () => {
    const relogio = new RelogioFalso();
    const medicoes = new MedicoesDaSessao();
    await new NarradorMedido(new NarradorCronometrado(relogio), "destilado", medicoes, relogio).falar(
      "x",
      () => undefined,
    );
    expect(medicoes.retrato.ultimaFala).toEqual({
      modelo: "destilado",
      ateOPrimeiroTokenMs: 300,
      duracaoMs: 8000,
      tokens: 120,
      tokensPorSegundo: 15,
    });
  });

  it("repassa as leituras parciais ao ouvinte original", async () => {
    const relogio = new RelogioFalso();
    const lidas: string[] = [];
    const narrador = new NarradorMedido(
      new NarradorCronometrado(relogio),
      "base",
      new MedicoesDaSessao(),
      relogio,
    );
    await narrador.falar("x", (leitura) => lidas.push(leitura.pensamento));
    expect(lidas).toEqual(["Malha"]);
  });

  it("servidor desligado contado: narrador_indisponivel do modelo escolhido aumenta em 1", async () => {
    const medicoes = new MedicoesDaSessao();
    const narrador = new NarradorMedido(
      new NarradorFalso().programarFalha(),
      "base",
      medicoes,
      new RelogioFalso(),
    );
    await narrador.falar("x", () => undefined);
    expect(medicoes.retrato.porModelo.base.falhas.narrador_indisponivel).toBe(1);
    expect(medicoes.retrato.porModelo.destilado.falhas.narrador_indisponivel).toBe(0);
  });
});

describe("contagem das falas da partida por modelo", () => {
  const DESENHO = criarDesenho([
    [
      [0, 0],
      [200, 100],
    ],
  ]);

  it("conta charada do Zé, charada de reserva e discordância no modelo que foi pedido", async () => {
    const { partida, narrador: narradorFalso, classificador } = montarPartida();
    const medicoes = new MedicoesDaSessao();
    contarFalasDaPartida(partida, medicoes);
    // A montagem usa o NarradorFalso direto; aqui o pedido é registrado à mão, como o NarradorMedido faria.
    const pedir = (): void => {
      medicoes.registrarPedido("destilado");
    };
    narradorFalso.programarFala(falaDoZe("Hum", "Charada: Dá leite. Quem é?"));
    pedir();
    await partida.comecar("Ana");
    partida.desenhar();
    const terceiro = Array.from({ length: TOTAL_DE_CATEGORIAS }, (_, i) => [0.2, 0.4, 0.3][i] ?? 0.1 / 27);
    classificador.programar(terceiro);
    await partida.registrarTraco(DESENHO);
    narradorFalso.programarFala(falaDoZe("Cravou", "VEREDITO: ACERTOU\nNARRAÇÃO: Boa!"));
    pedir();
    await partida.pronto();
    expect(medicoes.retrato.porModelo.destilado).toMatchObject({
      falasDoZe: 1,
      reservas: 1,
      discordancias: 1,
    });
  });

  it("rodada sem traço não conta reserva (o Zé nem foi chamado)", async () => {
    const { partida, relogio } = montarPartida();
    const medicoes = new MedicoesDaSessao();
    contarFalasDaPartida(partida, medicoes);
    medicoes.registrarPedido("destilado");
    await partida.comecar("Ana"); // charada: o NarradorFalso sem programação falha → reserva contada
    partida.desenhar();
    relogio.avancar(20_000);
    await partida.aguardar();
    expect(medicoes.retrato.porModelo.destilado).toMatchObject({ falasDoZe: 0, reservas: 1 });
  });

  it("vale também para o veredito do Zé que concorda com a regra", async () => {
    const { partida, narrador, classificador } = montarPartida();
    const medicoes = new MedicoesDaSessao();
    contarFalasDaPartida(partida, medicoes);
    await partida.comecar("Ana");
    partida.desenhar();
    classificador.programar(probabilidadesCom(0, 0.5));
    await partida.registrarTraco(DESENHO);
    narrador.programarFala(falaDoZe("Cravou", "VEREDITO: ACERTOU\nNARRAÇÃO: Boa!"));
    medicoes.registrarPedido("base");
    await partida.pronto();
    expect(medicoes.retrato.porModelo.base).toMatchObject({ falasDoZe: 1, reservas: 0, discordancias: 0 });
  });
});
