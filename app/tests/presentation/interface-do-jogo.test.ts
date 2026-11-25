// @vitest-environment happy-dom
import { beforeEach, describe, expect, it } from "vitest";
import { probabilidadesCom } from "../application/dubles";
import { CATEGORIAS } from "../application/montagem";
import { ESTADO_INICIAL, type EstadoDaPartida } from "../../src/application/estado-da-partida";
import type { PartidaNoPlacar } from "../../src/domain/rodada/pontuacao";
import { InterfaceDoJogo } from "../../src/presentation/interface-do-jogo";
import { ComandosEspioes } from "./comandos-espioes";

// Spec `interface-do-jogo`, requisito "Telas da partida" (D7: só o essencial; o resto no navegador).
let raiz: HTMLElement;
let comandos: ComandosEspioes;
let placar: PartidaNoPlacar[];
let tela: InterfaceDoJogo;

const RESULTADO_ACERTOU = {
  categoria: 0,
  veredito: "ACERTOU",
  pontos: 135,
  segundosRestantes: 14,
  narracao: "Ô trem bão! Era vaca!",
  origemDaNarracao: "ze",
  discordanciaDoZe: false,
} as const;

function estado(alteracao: Partial<EstadoDaPartida>): EstadoDaPartida {
  return { ...ESTADO_INICIAL, nome: "Ana", categorias: [0, 1, 2], ...alteracao };
}

function visivel(): string[] {
  return [...raiz.querySelectorAll<HTMLElement>("[data-tela]")]
    .filter((s) => !s.hidden)
    .map((s) => s.dataset["tela"] ?? "");
}

function texto(seletor: string): string {
  return raiz.querySelector(seletor)?.textContent ?? "";
}

function clicar(seletor: string): void {
  raiz.querySelector<HTMLButtonElement>(seletor)?.click();
}

beforeEach(() => {
  document.body.innerHTML = "<main></main>";
  raiz = document.querySelector("main") ?? document.body;
  comandos = new ComandosEspioes();
  placar = [];
  const semConversa = { abrir: () => undefined, perguntar: () => Promise.resolve(), voltar: () => undefined };
  tela = new InterfaceDoJogo(
    raiz,
    comandos,
    { nomesDasCategorias: CATEGORIAS, lerPlacar: () => placar },
    semConversa,
  );
});

describe("etapa e tela coincidem", () => {
  it.each([
    ["inicio", "inicio"],
    ["charada", "charada"],
    ["desenhando", "desenho"],
    ["julgando", "veredito"],
    ["resultado", "veredito"],
    ["fim", "fim"],
  ] as const)("etapa %s mostra só a tela %s", (etapa, nomeDaTela) => {
    tela.mostrar(estado({ etapa, resultados: [RESULTADO_ACERTOU] }));
    expect(visivel()).toEqual([nomeDaTela]);
  });
});

describe("tela de início", () => {
  it("botão Jogar começa a partida com o apelido digitado", () => {
    tela.mostrar(ESTADO_INICIAL);
    const campo = raiz.querySelector<HTMLInputElement>("[data-campo=apelido]");
    if (campo !== null) campo.value = "Zé";
    clicar("[data-acao=jogar]");
    expect(comandos.chamadas).toEqual(["comecar:Zé"]);
  });

  it("mostra o erro de nome inválido", () => {
    tela.mostrar({ ...ESTADO_INICIAL, erro: { codigo: "nome_invalido", detalhe: "x" } });
    expect(texto("[data-texto=erro]")).toContain("apelido");
  });

  it("mostra o placar ordenado (mais pontos primeiro)", () => {
    placar = [
      { nome: "Bia", pontos: 30, terminadaEmMs: 1 },
      { nome: "Ana", pontos: 165, terminadaEmMs: 2 },
    ];
    tela.mostrar(ESTADO_INICIAL);
    const linhas = [...raiz.querySelectorAll("[data-lista=placar] li")].map((li) => li.textContent);
    expect(linhas[0]).toContain("Ana");
    expect(linhas[0]).toContain("165");
    expect(linhas[1]).toContain("Bia");
  });

  it("aviso 'Redes divergentes do treino' só aparece quando avisado", () => {
    tela.mostrar(ESTADO_INICIAL);
    const aviso = raiz.querySelector<HTMLElement>("[data-texto=aviso-redes]");
    expect(aviso?.hidden).toBe(true);
    tela.avisarRedesDivergentes();
    expect(aviso?.hidden).toBe(false);
    expect(aviso?.textContent).toContain("Redes divergentes do treino");
  });
});

describe("tela da charada", () => {
  it("charada sem vazamento: mostra só 'Pensando…' enquanto o Zé gera, sem o raciocínio que cita a palavra", () => {
    tela.mostrar(
      estado({
        etapa: "charada",
        falaAoVivo: { etapa: "pensando", pensamento: "A palavra é melancia", resposta: "" },
      }),
    );
    expect(texto("[data-texto=rodada]")).toContain("1 de 3");
    expect(texto("[data-texto=ze-ao-vivo]")).toBe("Pensando…");
    expect(raiz.textContent).not.toContain("melancia");
    expect(raiz.querySelector<HTMLButtonElement>("[data-acao=desenhar]")?.disabled).toBe(true);
  });

  it("charada sem vazamento: a resposta parcial, ainda não filtrada, também não aparece", () => {
    tela.mostrar(
      estado({
        etapa: "charada",
        falaAoVivo: { etapa: "respondendo", pensamento: "", resposta: "Charada: É melancia" },
      }),
    );
    expect(texto("[data-texto=ze-ao-vivo]")).toBe("Pensando…");
    expect(raiz.textContent).not.toContain("melancia");
  });

  it("com a charada pronta, mostra o texto e libera o botão de desenhar", () => {
    tela.mostrar(estado({ etapa: "charada", charada: { texto: "Dá leite. Quem é?", origem: "ze" } }));
    expect(texto("[data-texto=charada]")).toBe("Dá leite. Quem é?");
    clicar("[data-acao=desenhar]");
    expect(comandos.chamadas).toEqual(["desenhar"]);
  });
});

describe("tela do desenho", () => {
  it("mostra cronômetro arredondado para cima, charada e os 3 primeiros palpites", () => {
    const ensemble = probabilidadesCom(0, 0.85);
    tela.mostrar(
      estado({
        etapa: "desenhando",
        charada: { texto: "Dá leite. Quem é?", origem: "ze" },
        segundosRestantes: 13.2,
        palpite: { cnn: ensemble, lstm: ensemble, ensemble },
      }),
    );
    expect(texto("[data-texto=cronometro]")).toBe("14");
    expect(texto("[data-texto=charada-no-desenho]")).toBe("Dá leite. Quem é?");
    const palpites = [...raiz.querySelectorAll("[data-lista=palpites] li")].map((li) => li.textContent);
    expect(palpites).toHaveLength(3);
    expect(palpites[0]).toContain("vaca");
    expect(palpites[0]).toContain("85%");
  });

  it("botões Limpar e Pronto chamam a partida", () => {
    tela.mostrar(estado({ etapa: "desenhando" }));
    clicar("[data-acao=limpar]");
    clicar("[data-acao=pronto]");
    expect(comandos.chamadas).toEqual(["limpar", "pronto"]);
  });

  it("o traço no canvas vira desenho para a partida", () => {
    tela.mostrar(estado({ etapa: "desenhando" }));
    const canvas = raiz.querySelector("canvas");
    for (const [tipo, x] of [
      ["pointerdown", 10],
      ["pointerup", 50],
    ] as const) {
      canvas?.dispatchEvent(new PointerEvent(tipo, { clientX: x, clientY: x, pointerId: 1 }));
    }
    expect(comandos.chamadas).toEqual(["traco:false", "traco:true"]);
    expect(comandos.desenhos.at(-1)?.tracos).toEqual([
      [
        [10, 10],
        [50, 50],
      ],
    ]);
  });
});

describe("tela do veredito", () => {
  it("julgando mostra o Zé narrando ao vivo", () => {
    tela.mostrar(
      estado({
        etapa: "julgando",
        falaAoVivo: { etapa: "respondendo", pensamento: "", resposta: "VEREDITO: AC" },
      }),
    );
    expect(texto("[data-texto=ze-julgando]")).toContain("VEREDITO: AC");
  });

  it("resultado mostra veredito, pontos, desafio e narração", () => {
    tela.mostrar(estado({ etapa: "resultado", resultados: [RESULTADO_ACERTOU] }));
    expect(texto("[data-texto=veredito]")).toContain("Acertou");
    expect(texto("[data-texto=pontos]")).toContain("+135");
    expect(texto("[data-texto=desafio]")).toContain("vaca");
    expect(texto("[data-texto=narracao]")).toBe("Ô trem bão! Era vaca!");
    clicar("[data-acao=proxima]");
    expect(comandos.chamadas).toEqual(["proxima"]);
  });
});

describe("tela do fim", () => {
  it("mostra o total e a posição no placar", () => {
    placar = [
      { nome: "Bia", pontos: 200, terminadaEmMs: 1 },
      { nome: "Ana", pontos: 165, terminadaEmMs: 2 },
      { nome: "Caio", pontos: 30, terminadaEmMs: 3 },
    ];
    tela.mostrar(estado({ etapa: "fim", total: 165 }));
    expect(texto("[data-texto=total]")).toContain("165");
    expect(texto("[data-texto=posicao]")).toContain("2º");
    clicar("[data-acao=nova-partida]");
    expect(comandos.chamadas).toEqual(["nova"]);
  });
});
