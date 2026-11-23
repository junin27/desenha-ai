// @vitest-environment happy-dom
import { beforeEach, describe, expect, it } from "vitest";
import { CATEGORIAS } from "../application/montagem";
import type { EstadoDaConversa } from "../../src/application/conversa-com-o-ze";
import { ESTADO_INICIAL } from "../../src/application/estado-da-partida";
import { InterfaceDoJogo, type ComandosDaConversa } from "../../src/presentation/interface-do-jogo";
import { ComandosEspioes } from "./comandos-espioes";

// Spec `pergunte-ao-ze` (parte visível).
class ConversaEspia implements ComandosDaConversa {
  readonly chamadas: string[] = [];
  abrir(): void {
    this.chamadas.push("abrir");
  }
  perguntar(pergunta: string): Promise<void> {
    this.chamadas.push(`perguntar:${pergunta}`);
    return Promise.resolve();
  }
  voltar(): void {
    this.chamadas.push("voltar");
  }
}

const FECHADA: EstadoDaConversa = {
  aberta: false,
  respondendo: false,
  falaAoVivo: undefined,
  resposta: undefined,
  erro: undefined,
};
const ABERTA: EstadoDaConversa = { ...FECHADA, aberta: true };

let raiz: HTMLElement;
let conversa: ConversaEspia;
let tela: InterfaceDoJogo;

function visivel(): string[] {
  return [...raiz.querySelectorAll<HTMLElement>("[data-tela]")]
    .filter((secao) => !secao.hidden)
    .map((secao) => secao.dataset["tela"] ?? "");
}

function elemento(seletor: string): HTMLElement | null {
  return raiz.querySelector(seletor);
}

beforeEach(() => {
  document.body.innerHTML = "<main></main>";
  raiz = document.querySelector("main") ?? document.body;
  conversa = new ConversaEspia();
  tela = new InterfaceDoJogo(
    raiz,
    new ComandosEspioes(),
    { nomesDasCategorias: CATEGORIAS, lerPlacar: () => [] },
    conversa,
  );
  tela.mostrar(ESTADO_INICIAL);
});

describe("Pergunte ao Zé na tela", () => {
  it("a tela de início tem o botão Pergunte ao Zé, que abre a conversa", () => {
    raiz.querySelector<HTMLButtonElement>("[data-acao=pergunte-ao-ze]")?.click();
    expect(conversa.chamadas).toEqual(["abrir"]);
  });

  it("ida e volta: conversa aberta mostra a tela da pergunta; fechada, volta ao início", () => {
    tela.mostrarConversa(ABERTA);
    expect(visivel()).toEqual(["pergunta"]);
    raiz.querySelector<HTMLButtonElement>("[data-acao=voltar]")?.click();
    expect(conversa.chamadas).toEqual(["voltar"]);
    tela.mostrarConversa(FECHADA);
    expect(visivel()).toEqual(["inicio"]);
  });

  it("Perguntar envia o texto digitado", () => {
    tela.mostrarConversa(ABERTA);
    const campo = raiz.querySelector<HTMLTextAreaElement>("[data-campo=pergunta]");
    if (campo !== null) campo.value = "O que é CNN?";
    raiz.querySelector<HTMLButtonElement>("[data-acao=perguntar]")?.click();
    expect(conversa.chamadas).toEqual(["perguntar:O que é CNN?"]);
  });

  it("enquanto o Zé responde, Perguntar fica desativado e o raciocínio aparece ao vivo", () => {
    tela.mostrarConversa({
      ...ABERTA,
      respondendo: true,
      falaAoVivo: { etapa: "pensando", pensamento: "Hum, CNN", resposta: "" },
    });
    expect(raiz.querySelector<HTMLButtonElement>("[data-acao=perguntar]")?.disabled).toBe(true);
    expect(elemento("[data-texto=ze-pergunta-ao-vivo]")?.textContent).toContain("Hum, CNN");
  });

  it("mostra a resposta e o erro de pergunta inválida", () => {
    tela.mostrarConversa({
      ...ABERTA,
      resposta: { texto: "A CNN olha a imagem.", origem: "ze", modelo: "destilado" },
    });
    expect(elemento("[data-texto=resposta]")?.textContent).toBe("A CNN olha a imagem.");
    tela.mostrarConversa({ ...ABERTA, erro: { codigo: "pergunta_invalida", detalhe: "x" } });
    expect(elemento("[data-texto=erro-pergunta]")?.textContent).toContain("200");
  });
});
