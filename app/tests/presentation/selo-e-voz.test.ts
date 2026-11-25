// @vitest-environment happy-dom
import { beforeEach, describe, expect, it } from "vitest";
import { CATEGORIAS } from "../application/montagem";
import { ESTADO_INICIAL, type EstadoDaPartida } from "../../src/application/estado-da-partida";
import { criarBotaoDaVoz, type ControleDaVoz } from "../../src/presentation/botao-da-voz";
import { InterfaceDoJogo } from "../../src/presentation/interface-do-jogo";
import { ComandosEspioes } from "./comandos-espioes";

// Specs `comparacao-base-destilado` ("Selo de quem está falando") e `voz-do-ze` ("Botão liga/desliga").
let raiz: HTMLElement;
let tela: InterfaceDoJogo;

const semConversa = { abrir: () => undefined, perguntar: () => Promise.resolve(), voltar: () => undefined };

function estado(alteracao: Partial<EstadoDaPartida>): EstadoDaPartida {
  return { ...ESTADO_INICIAL, nome: "Ana", categorias: [0, 1, 2], ...alteracao };
}

function elementoDoSelo(): HTMLElement | null | undefined {
  const visiveis = [...raiz.querySelectorAll<HTMLElement>("[data-tela]")].filter((secao) => !secao.hidden);
  return visiveis[0]?.querySelector<HTMLElement>("[data-texto=selo]");
}

function selo(): string {
  return elementoDoSelo()?.textContent ?? "";
}

beforeEach(() => {
  document.body.innerHTML = "<main></main>";
  raiz = document.querySelector("main") ?? document.body;
  const informacoes = { nomesDasCategorias: CATEGORIAS, lerPlacar: () => [] };
  tela = new InterfaceDoJogo(raiz, new ComandosEspioes(), informacoes, semConversa);
});

describe("selo de quem está falando", () => {
  it("selo da reserva: charada de reserva aparece sem selo (termo de bastidor)", () => {
    tela.mostrar(estado({ etapa: "charada", charada: { texto: "Dá leite.", origem: "reserva" } }));
    expect(elementoDoSelo()?.hidden).toBe(true);
    expect(selo()).toBe("");
  });

  it.each([
    ["destilado", "Zé destilado"],
    ["base", "Qwen3 base (sem fine-tuning)"],
  ] as const)("charada do modelo %s mostra '%s'", (modelo, texto) => {
    tela.mostrar(estado({ etapa: "charada", charada: { texto: "Dá leite.", origem: "ze", modelo } }));
    expect(selo()).toBe(texto);
  });

  it("o veredito mostra o selo da narração", () => {
    const resultado = {
      categoria: 0,
      veredito: "QUASE",
      pontos: 30,
      segundosRestantes: 0,
      narracao: "Quase!",
      origemDaNarracao: "ze",
      modeloDaNarracao: "base",
      discordanciaDoZe: false,
    } as const;
    tela.mostrar(estado({ etapa: "resultado", resultados: [resultado] }));
    expect(selo()).toBe("Qwen3 base (sem fine-tuning)");
  });

  it("a resposta do Pergunte ao Zé mostra o selo", () => {
    tela.mostrar(ESTADO_INICIAL);
    raiz.querySelector<HTMLButtonElement>("[data-acao=jogar-agora]")?.click();
    tela.mostrarConversa({
      aberta: true,
      respondendo: false,
      falaAoVivo: undefined,
      erro: undefined,
      resposta: { texto: "Oi", origem: "reserva" },
    });
    expect(elementoDoSelo()?.hidden).toBe(true);
  });
});

class ControleFalso implements ControleDaVoz {
  ligada = true;
  disponivel = true;
  cliques = 0;
  private ouvinte: (() => void) | undefined;
  alternar(): void {
    this.cliques += 1;
    this.ligada = !this.ligada;
    this.ouvinte?.();
  }
  aoMudar(ouvinte: () => void): () => void {
    this.ouvinte = ouvinte;
    return () => undefined;
  }
  mudarDisponibilidade(disponivel: boolean): void {
    this.disponivel = disponivel;
    this.ouvinte?.();
  }
}

describe("botão liga/desliga da voz", () => {
  it("mostra o estado e alterna ao clicar", () => {
    const controle = new ControleFalso();
    const botao = criarBotaoDaVoz(controle);
    expect(botao.textContent).toContain("ligada");
    botao.click();
    expect(controle.cliques).toBe(1);
    expect(botao.textContent).toContain("desligada");
  });

  it("sem voz local, fica desativado com 'Voz pt-BR não instalada' e reage quando a voz chega", () => {
    const controle = new ControleFalso();
    controle.disponivel = false;
    const botao = criarBotaoDaVoz(controle);
    expect(botao.disabled).toBe(true);
    expect(botao.textContent).toBe("Voz pt-BR não instalada");
    controle.mudarDisponibilidade(true);
    expect(botao.disabled).toBe(false);
  });
});
