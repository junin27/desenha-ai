import { describe, expect, it } from "vitest";
import { falaDoZe, PreferenciasEmMemoria, ReservaFalsa, VozFalsa } from "./dubles";
import { montarPartida } from "./montagem";
import { ConversaComOZe } from "../../src/application/conversa-com-o-ze";
import { LeitorEmVoz } from "../../src/application/leitor-em-voz";

// Spec `voz-do-ze`, requisitos "O que o Zé fala" e "Botão liga/desliga".
function montar(opcoes: { preferencia?: boolean; disponivel?: boolean } = {}) {
  const montada = montarPartida();
  const voz = new VozFalsa(opcoes.disponivel ?? true);
  const preferencias = new PreferenciasEmMemoria(opcoes.preferencia);
  const leitor = new LeitorEmVoz(voz, preferencias);
  leitor.acompanharPartida(montada.partida);
  return { ...montada, voz, preferencias, leitor };
}

describe("o que o Zé fala", () => {
  it("charada de reserva falada: o texto exato, uma vez", async () => {
    const { partida, voz } = montar();
    await partida.comecar("Ana");
    expect(voz.falas).toEqual(["Charada de reserva da vaca"]);
  });

  it("pensamento não é falado, só o texto final", async () => {
    const { partida, narrador, voz } = montar();
    narrador.programarFala(falaDoZe("Malhada e mansa", "Charada: Dá leite. Quem é?"));
    await partida.comecar("Ana");
    expect(voz.falas).toEqual(["Dá leite. Quem é?"]);
  });

  it("troca de tela interrompe a fala antes da próxima tela", async () => {
    const { partida, voz } = montar();
    await partida.comecar("Ana");
    partida.desenhar();
    expect(voz.eventos.at(-1)).toBe("calar");
  });

  it("fala a narração do veredito", async () => {
    const { partida, voz } = montar();
    await partida.comecar("Ana");
    partida.desenhar();
    await partida.pronto();
    expect(voz.falas.at(-1)).toBe("Narração-modelo ERROU: vaca / nada");
  });

  it("fala a resposta do Pergunte ao Zé e cala ao fechar a conversa", async () => {
    const { voz, leitor, narrador } = montar();
    const conversa = new ConversaComOZe(narrador, new ReservaFalsa(), () => true);
    leitor.acompanharConversa(conversa);
    conversa.abrir();
    narrador.programarFala(falaDoZe("Hum", "A CNN olha a imagem."));
    await conversa.perguntar("O que é CNN?");
    conversa.voltar();
    expect(voz.falas).toEqual(["A CNN olha a imagem."]);
    expect(voz.eventos.at(-1)).toBe("calar");
  });
});

describe("botão liga/desliga", () => {
  it("sem escolha gravada, começa ligada quando há voz", () => {
    expect(montar().leitor.ligada).toBe(true);
  });

  it("desligar no meio da fala: para na hora e as próximas não são lidas", async () => {
    const { partida, voz, leitor } = montar();
    await partida.comecar("Ana");
    leitor.alternar();
    expect(voz.eventos.at(-1)).toBe("calar");
    partida.desenhar();
    await partida.pronto();
    expect(voz.falas).toEqual(["Charada de reserva da vaca"]);
  });

  it("a escolha é gravada nas preferências do estande", () => {
    const { leitor, preferencias } = montar();
    leitor.alternar();
    expect(preferencias.vozLigada()).toBe(false);
  });

  it("recarregar mantém a escolha: preferência desligada começa desligada", async () => {
    const { partida, voz, leitor } = montar({ preferencia: false });
    await partida.comecar("Ana");
    expect(leitor.ligada).toBe(false);
    expect(voz.falas).toEqual([]);
  });

  it("sem voz instalada, fica indisponível e não fala", async () => {
    const { partida, voz, leitor } = montar({ disponivel: false });
    await partida.comecar("Ana");
    expect(leitor.disponivel).toBe(false);
    expect(voz.falas).toEqual([]);
  });

  it("avisa a tela quando muda (botão ou vozes que chegam depois)", () => {
    const { voz, leitor } = montar({ disponivel: false });
    const avisos: boolean[] = [];
    leitor.aoMudar(() => avisos.push(leitor.disponivel));
    voz.ficarDisponivel();
    leitor.alternar();
    expect(avisos).toEqual([true, true]);
  });
});
