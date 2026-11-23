import { describe, expect, it } from "vitest";
import {
  ClassificadorFalso,
  falaDoZe,
  NarradorFalso,
  PlacarEmMemoria,
  RelogioFalso,
  ReservaFalsa,
  SorteadorFixo,
} from "./dubles";
import { CATEGORIAS, PESO_DA_CNN } from "./montagem";
import { contarFalasDaPartida } from "../../src/application/contador-de-falas";
import { MedicoesDaSessao } from "../../src/application/medicoes-da-sessao";
import { NarradorAlternavel } from "../../src/application/narrador-alternavel";
import { NarradorMedido } from "../../src/application/narrador-medido";
import { Partida } from "../../src/application/partida";
import type { ErroDoNarrador, FalaFinal, NarradorDoJogo } from "../../src/application/portas";
import { ok, type Resultado } from "../../src/domain/resultado";

// Spec `comparacao-base-destilado`.
const CHARADA = falaDoZe("Malhada", "Charada: Dá leite. Quem é?");

/** Narrador cuja resposta o teste libera à mão. */
class NarradorControlado implements NarradorDoJogo {
  pedidos = 0;
  private liberar: (() => void) | undefined;

  falar(): Promise<Resultado<FalaFinal, ErroDoNarrador>> {
    this.pedidos += 1;
    return new Promise((resolver) => {
      this.liberar = () => {
        resolver(ok({ texto: CHARADA, tokens: 10, tokensPorSegundo: 5 }));
      };
    });
  }

  responder(): void {
    this.liberar?.();
  }
}

function partidaCom(narrador: NarradorDoJogo): Partida {
  return new Partida(
    {
      classificador: new ClassificadorFalso(),
      narrador,
      placar: new PlacarEmMemoria(),
      relogio: new RelogioFalso(),
      sorteador: new SorteadorFixo([0, 1, 2]),
      reserva: new ReservaFalsa(),
    },
    { categorias: CATEGORIAS, pesoDaCnn: PESO_DA_CNN },
  );
}

describe("alternância do narrador", () => {
  it("ao abrir, o narrador é o Zé destilado", async () => {
    const destilado = new NarradorFalso().programarFala(CHARADA);
    const base = new NarradorFalso();
    const alternavel = new NarradorAlternavel(destilado, base);
    const resposta = await alternavel.falar("x", () => undefined);
    expect(alternavel.escolhido).toBe("destilado");
    expect(resposta.ok && resposta.valor.modelo).toBe("destilado");
    expect(base.entradasRecebidas).toEqual([]);
  });

  it("trocar para o base: o próximo pedido vai para o modelo base", async () => {
    const destilado = new NarradorFalso();
    const base = new NarradorFalso().programarFala(CHARADA);
    const alternavel = new NarradorAlternavel(destilado, base);
    alternavel.escolher("base");
    const resposta = await alternavel.falar("TAREFA: CHARADA", () => undefined);
    expect(base.entradasRecebidas).toEqual(["TAREFA: CHARADA"]);
    expect(resposta.ok && resposta.valor.modelo).toBe("base");
  });

  it("troca no meio de uma fala: a fala termina no destilado e só a seguinte vai para o base", async () => {
    const destilado = new NarradorControlado();
    const base = new NarradorFalso().programarFala(CHARADA);
    const alternavel = new NarradorAlternavel(destilado, base);
    const emAndamento = alternavel.falar("1", () => undefined);
    alternavel.escolher("base");
    destilado.responder();
    const primeira = await emAndamento;
    await alternavel.falar("2", () => undefined);
    expect(primeira.ok && primeira.valor.modelo).toBe("destilado");
    expect(destilado.pedidos).toBe(1);
    expect(base.entradasRecebidas).toEqual(["2"]);
  });
});

describe("mesmas regras e selo do modelo", () => {
  it("a partida guarda o modelo que gerou a charada", async () => {
    const base = new NarradorFalso().programarFala(CHARADA);
    const alternavel = new NarradorAlternavel(new NarradorFalso(), base);
    alternavel.escolher("base");
    const partida = partidaCom(alternavel);
    await partida.comecar("Ana");
    expect(partida.estado.charada).toEqual({ texto: "Dá leite. Quem é?", origem: "ze", modelo: "base" });
  });

  it("base fora do formato: a rodada usa a reserva e o painel conta uma reserva para o base", async () => {
    const relogio = new RelogioFalso();
    const medicoes = new MedicoesDaSessao();
    const base = new NarradorMedido(
      new NarradorFalso().programarFala("Charada: sem marcas"),
      "base",
      medicoes,
      relogio,
    );
    const destilado = new NarradorMedido(new NarradorFalso(), "destilado", medicoes, relogio);
    const alternavel = new NarradorAlternavel(destilado, base);
    alternavel.escolher("base");
    const partida = partidaCom(alternavel);
    contarFalasDaPartida(partida, medicoes);
    await partida.comecar("Ana");
    expect(partida.estado.charada?.origem).toBe("reserva");
    expect(partida.estado.charada?.modelo).toBeUndefined();
    expect(medicoes.retrato.porModelo.base.reservas).toBe(1);
    expect(medicoes.retrato.porModelo.destilado.reservas).toBe(0);
  });
});
