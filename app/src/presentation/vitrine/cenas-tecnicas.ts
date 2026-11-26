import { formatarPorcentagem } from "../../application/resumo-da-vitrine";
import { criar } from "../dom";
import { PersonagemDoZe, type OpcoesDoPersonagem } from "../ze/personagem";
import {
  criarCartao,
  criarCena,
  criarMarcaDaJanela,
  criarVideoDaRoca,
  type DadosDasCenas,
} from "./cenas-da-historia";
import { cartaoDoCapitulo } from "./textos-da-vitrine";

/**
 * Fala de exemplo do Zé no capítulo do SLM, em tokens. É uma fala GRAVADA (marcada como tal na tela): rodar o
 * llama.cpp em loop na vitrine disputaria a CPU com a partida (fora do escopo da change vitrine-viva).
 */
const FALA_GRAVADA = [
  "Ô",
  " trem",
  " bão",
  ",",
  " sô",
  "!",
  " Isso",
  " aí",
  " é",
  " um",
  " desenho",
  " caprichado",
  "!",
];
const HEXAGONOS: readonly (readonly [string, number, number, string?])[] = [
  ["domínio · regras do jogo", 0, 0, "centro"],
  ["redes · ONNX", 0, -1],
  ["Zé · llama.cpp", 0.866, -0.5, "ze"],
  ["mão · MediaPipe", 0.866, 0.5],
  ["telas", 0, 1],
  ["placar", -0.866, 0.5],
  ["aplicação", -0.866, -0.5],
];
const PESOS_NA_GRADE = 60;
const BITS_DO_PESO = "0110100110111010";

export function cenaZe(
  dados: DadosDasCenas,
  opcoesDoZe: OpcoesDoPersonagem,
): {
  cena: HTMLElement;
  ze: PersonagemDoZe;
} {
  const ze = new PersonagemDoZe(opcoesDoZe);
  ze.raiz.classList.add("ze-grande");
  const cabeca = criar("i", { classe: "objeto-do-portal cabeca-do-ze", dados: { objeto: "cabeca" } });
  const balao = criar("div", { classe: "balao-tokens", dados: { parte: "tokens" } });
  for (const token of FALA_GRAVADA) balao.append(criar("span", { classe: "token", texto: token }));
  balao.append(criar("small", { classe: "gravada", texto: "fala gravada do Zé, em tokens" }));
  const lugar = criar("div", { classe: "lugar-do-ze" }, [ze.raiz, cabeca]);
  return { cena: criarCena("ze", [lugar, balao, criarCartao(cartaoDoCapitulo("ze", dados.resumo))]), ze };
}

export function cenaDestilacao(dados: DadosDasCenas): HTMLElement {
  const professor = criar("div", { classe: "professor" }, [criar("span", { texto: "professor · Gemini" })]);
  professor.insertAdjacentHTML(
    "afterbegin",
    '<svg viewBox="0 0 300 170" aria-hidden="true"><path class="nuvem" d="M60 150 C20 150 10 110 40 95 C30 60 70 40 95 55 C105 20 160 10 180 45 C200 25 250 35 250 75 C290 80 295 140 250 150 Z"/><circle cx="125" cy="98" r="7"/><circle cx="175" cy="98" r="7"/><path class="boca" d="M135 120 Q150 132 165 120"/></svg>',
  );
  const jarro = criar("div", { classe: "jarro", dados: { objeto: "jarro" } }, [
    criar("div", { classe: "nivel", dados: { parte: "nivel" } }),
    criar("span", { texto: "aluno · Qwen3 1,7B" }),
  ]);
  const gotas = criar("div", { classe: "gotas" });
  for (let i = 0; i < 10; i++) gotas.append(criar("i"));
  const contador =
    dados.resumo.exemplosDoZe === undefined
      ? []
      : [
          criar("p", { classe: "contador", dados: { parte: "contador-de-exemplos" } }, [
            criar("b", { texto: "0", dados: { ate: String(dados.resumo.exemplosDoZe) } }),
            document.createTextNode(" exemplos aprovados"),
          ]),
        ];
  return criarCena("destilacao", [
    professor,
    criar("div", { classe: "funil" }),
    jarro,
    gotas,
    ...contador,
    criarCartao(cartaoDoCapitulo("destilacao", dados.resumo)),
  ]);
}

export function cenaQlora(dados: DadosDasCenas): HTMLElement {
  const pesos = criar("div", { classe: "pesos" });
  for (let i = 0; i < PESOS_NA_GRADE; i++) pesos.append(criar("div", { classe: "peso" }));
  pesos.children[24]?.setAttribute("data-objeto", "peso");
  const { lora, formato } = dados.resumo;
  const legenda =
    lora === undefined
      ? []
      : [
          criar("p", {
            classe: "legenda-pesos",
            texto: `■ congelados em 4 bits · ■ ${lora.percentualTreinavel.toFixed(1).replace(".", ",")}% treináveis (rank ${lora.rank})`,
          }),
        ];
  const antesDepois =
    formato === undefined
      ? []
      : [
          criar("p", { classe: "antes-depois" }, [
            criar("span", { texto: `formato certo: ${formatarPorcentagem(formato.base)} →` }),
            criar("b", { texto: formatarPorcentagem(formato.destilado) }),
          ]),
        ];
  return criarCena("qlora", [
    pesos,
    criar("div", { classe: "adaptador a", texto: "A" }),
    criar("div", { classe: "adaptador b", texto: "B" }),
    ...legenda,
    ...antesDepois,
    criarCartao(cartaoDoCapitulo("qlora", dados.resumo)),
  ]);
}

export function cenaQuantizacao(dados: DadosDasCenas): HTMLElement {
  const bits = criar("div", { classe: "bits" });
  for (const bit of BITS_DO_PESO) bits.append(criar("i", { texto: bit }));
  const q = dados.resumo.quantizacao;
  const tamanho = q === undefined ? [] : [criar("b", { classe: "tamanho", texto: gb(q.gb8Bits) })];
  const arquivo = criar("div", { classe: "arquivo", dados: { objeto: "arquivo" } }, [
    criar("span", { classe: "icone", texto: "📄" }),
    criar("b", { texto: "zedorabisco-1.7b-Q8_0.gguf" }),
    ...tamanho,
  ]);
  return criarCena("quantizacao", [
    bits,
    arquivo,
    criar("p", { classe: "cpu", texto: "CPU · llama.cpp · sem placa de vídeo" }),
    criarCartao(cartaoDoCapitulo("quantizacao", dados.resumo)),
  ]);
}

export function cenaEngenharia(dados: DadosDasCenas): HTMLElement {
  const mapa = criar("div", { classe: "hexagonos" });
  for (const [texto, dx, dy, papel] of HEXAGONOS) {
    const hex = criar("div", { classe: `hex ${papel ?? ""}`.trim() }, [criar("span", { texto })]);
    hex.style.setProperty("--dx", String(dx));
    hex.style.setProperty("--dy", String(dy));
    if (papel === "ze") hex.dataset.objeto = "hex-ze";
    mapa.append(hex);
  }
  const t = dados.resumo.testes;
  const contagem =
    t === undefined
      ? []
      : [criar("span", { texto: `${t.python} testes em Python · ${t.typescript} em TypeScript` })];
  const selos = criar("div", { classe: "selos" }, [
    ...contagem,
    criar("span", { texto: "OpenSpec: spec antes do código" }),
    criar("span", { texto: "Contratos Python ↔ navegador" }),
    criar("span", { texto: "100% offline" }),
  ]);
  return criarCena("engenharia", [mapa, selos, criarCartao(cartaoDoCapitulo("engenharia", dados.resumo))]);
}

export function cenaConvite(
  opcoesDoZe: OpcoesDoPersonagem,
  aoJogar: (botao: HTMLElement) => void,
): { cena: HTMLElement; ze: PersonagemDoZe; video: HTMLVideoElement; jogar: HTMLButtonElement } {
  const ze = new PersonagemDoZe(opcoesDoZe);
  ze.raiz.classList.add("ze-do-convite");
  ze.mudarHumor("comemorando");
  const video = criarVideoDaRoca();
  const jogar = criar("button", {
    classe: "jogar-vitrine",
    texto: "Jogar!",
    dados: { acao: "jogar-convite" },
  });
  jogar.type = "button";
  jogar.addEventListener("click", () => {
    aoJogar(jogar);
  });
  const titulo = criar("h2", { classe: "titulo-vitrine convite", texto: "Sua vez, " }, [
    criar("span", { classe: "destaque", texto: "sô!" }),
  ]);
  const cena = criarCena("convite", [
    video,
    criar("div", { classe: "por-do-sol" }),
    criarMarcaDaJanela(),
    ze.raiz,
    titulo,
    jogar,
  ]);
  return { cena, ze, video, jogar };
}

function gb(valor: number): string {
  return `${valor.toFixed(2).replace(".", ",")} GB`;
}
