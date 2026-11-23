import { describe, expect, it } from "vitest";
import { falaDoZe, NarradorFalso, ReservaFalsa } from "./dubles";
import { ConversaComOZe } from "../../src/application/conversa-com-o-ze";
import { contarFalasDaConversa } from "../../src/application/contador-de-falas";
import { MedicoesDaSessao } from "../../src/application/medicoes-da-sessao";
import type { LeituraParcial } from "../../src/domain/ze/conversa";

// Spec `pergunte-ao-ze`.
function montar(podeAbrir = true) {
  const narrador = new NarradorFalso();
  const conversa = new ConversaComOZe(narrador, new ReservaFalsa(), () => podeAbrir);
  conversa.abrir();
  return { narrador, conversa };
}

describe("abrir e voltar", () => {
  it("ida e volta: abre a conversa e volta limpando a pergunta anterior", async () => {
    const { conversa, narrador } = montar();
    narrador.programarFala(falaDoZe("Hum", "A CNN olha a imagem."));
    await conversa.perguntar("O que é CNN?");
    conversa.voltar();
    expect(conversa.estado).toMatchObject({ aberta: false, resposta: undefined, erro: undefined });
  });

  it("só abre com a partida na tela de início", () => {
    const { conversa } = montar(false);
    expect(conversa.estado.aberta).toBe(false);
  });
});

describe("pergunta válida", () => {
  it.each([
    ["pergunta vazia", "    "],
    ["pergunta longa demais", "a".repeat(201)],
  ])("%s mostra o erro e não chama o Zé", async (_, pergunta) => {
    const { conversa, narrador } = montar();
    await conversa.perguntar(pergunta);
    expect(conversa.estado.erro?.codigo).toBe("pergunta_invalida");
    expect(narrador.entradasRecebidas).toEqual([]);
  });

  it("aceita 200 caracteres", async () => {
    const { conversa, narrador } = montar();
    await conversa.perguntar("a".repeat(200));
    expect(narrador.entradasRecebidas).toHaveLength(1);
  });
});

describe("resposta ao vivo", () => {
  it("resposta do Zé: envia a entrada PERGUNTA e mostra a <resposta> com origem ze", async () => {
    const { conversa, narrador } = montar();
    narrador.programarFala(falaDoZe("Pergunta de rede", "A CNN olha a imagem inteira, sô."));
    await conversa.perguntar("  O que é   CNN? ");
    expect(narrador.entradasRecebidas).toEqual(["TAREFA: PERGUNTA\nVisitante: O que é CNN?"]);
    expect(conversa.estado.resposta).toMatchObject({
      texto: "A CNN olha a imagem inteira, sô.",
      origem: "ze",
    });
  });

  it("mostra o raciocínio ao vivo e limpa ao terminar", async () => {
    const { conversa, narrador } = montar();
    narrador.programarFala(falaDoZe("Pensando na CNN", "Resposta."));
    const leituras: LeituraParcial[] = [];
    conversa.aoMudar((estado) => {
      if (estado.falaAoVivo !== undefined) leituras.push(estado.falaAoVivo);
    });
    await conversa.perguntar("O que é CNN?");
    expect(leituras.some((l) => l.etapa === "pensando")).toBe(true);
    expect(conversa.estado.falaAoVivo).toBeUndefined();
  });

  it("uma pergunta por vez: enquanto o Zé responde, outra pergunta é ignorada", async () => {
    const { conversa, narrador } = montar();
    narrador.programarFala(falaDoZe("a", "Primeira.")).programarFala(falaDoZe("b", "Segunda."));
    const respondendo: boolean[] = [];
    conversa.aoMudar((estado) => respondendo.push(estado.respondendo));
    const primeira = conversa.perguntar("Primeira?");
    await conversa.perguntar("Segunda?");
    await primeira;
    expect(narrador.entradasRecebidas).toHaveLength(1);
    expect(respondendo[0]).toBe(true);
    expect(conversa.estado.respondendo).toBe(false);
  });
});

describe("resposta de reserva e bloqueio", () => {
  it("Zé desligado: mostra a resposta-modelo com origem reserva", async () => {
    const { conversa, narrador } = montar();
    narrador.programarFalha("narrador_indisponivel");
    await conversa.perguntar("O que é CNN?");
    expect(conversa.estado.resposta).toMatchObject({ texto: "Resposta de reserva", origem: "reserva" });
  });

  it("fala fora do formato também usa a reserva", async () => {
    const { conversa, narrador } = montar();
    narrador.programarFala("resposta sem marcas");
    await conversa.perguntar("O que é CNN?");
    expect(conversa.estado.resposta?.origem).toBe("reserva");
  });

  it("palavra bloqueada com acento e maiúscula: resposta de bloqueio e o Zé não recebe pedido", async () => {
    const { conversa, narrador } = montar();
    await conversa.perguntar("Qual é a PÓRRA do jogo?");
    expect(conversa.estado.resposta).toMatchObject({ texto: "Resposta de bloqueio", origem: "reserva" });
    expect(narrador.entradasRecebidas).toEqual([]);
  });

  it("o painel conta a resposta da conversa no modelo do pedido", async () => {
    const { conversa, narrador } = montar();
    const medicoes = new MedicoesDaSessao();
    contarFalasDaConversa(conversa, medicoes);
    narrador.programarFala(falaDoZe("a", "Resposta."));
    medicoes.registrarPedido("destilado");
    await conversa.perguntar("O que é CNN?");
    expect(medicoes.retrato.porModelo.destilado.falasDoZe).toBe(1);
  });
});
