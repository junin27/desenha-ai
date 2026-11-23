import { falha, ok, type Resultado } from "../resultado";
import type { Veredito } from "../rodada/veredito";
import { ESPACOS, aparar, apararInicio, normalizarEspacos } from "../texto";

/** Espelha `desenha_ml.conversa`; amarrado por `contratos/conversa.json`. */
export const INSTRUCAO_DE_SISTEMA =
  "Você é o Zé do Rabisco, locutor de rodeio goiano do jogo Desenha Aí, Sô!. " +
  "Raciocine de forma curta dentro de <pensamento>...</pensamento> e responda dentro de " +
  "<resposta>...</resposta>, em português, com humor caipira e respeitoso.";

export const NIVEIS = ["fácil", "médio", "difícil"] as const;
export type Nivel = (typeof NIVEIS)[number];
const TAMANHO_MAXIMO_DA_PERGUNTA = 200;
const TOLERANCIA_DO_ARREDONDAMENTO = 1e-9; // 0,345 vale 0,34499... em binário (D2 do design)
const TAGS = ["<pensamento>", "</pensamento>", "<resposta>", "</resposta>"] as const;
const PREFIXO_DA_CHARADA = "Charada:";

const FALA = new RegExp(
  `^${ESPACOS}*<pensamento>([\\s\\S]*?)</pensamento>${ESPACOS}*<resposta>([\\s\\S]*?)</resposta>${ESPACOS}*$`,
);
const VEREDITO = new RegExp(
  `^VEREDITO:[ \\t]*(ACERTOU|QUASE|ERROU)[ \\t]*\\r?\\n${ESPACOS}*NARRAÇÃO:[ \\t]*([\\s\\S]+)$`,
);

export interface ErroDeConversa {
  readonly codigo: "nivel_invalido" | "pergunta_invalida" | "formato_invalido";
  readonly detalhe: string;
}
export interface Fala {
  readonly pensamento: string;
  readonly resposta: string;
}
export interface LeituraParcial {
  readonly etapa: "pensando" | "respondendo" | "completa";
  readonly pensamento: string;
  readonly resposta: string;
}
export type Palpites = readonly (readonly [string, number])[];

/** Inteiro mais próximo, meio para cima (Math.round e o round() do Python divergem). */
export function porcentagem(probabilidade: number): number {
  return Math.floor(100 * probabilidade + 0.5 + TOLERANCIA_DO_ARREDONDAMENTO);
}

export function entradaCharada(palavra: string, nivel: string): Resultado<string, ErroDeConversa> {
  if (!(NIVEIS as readonly string[]).includes(nivel)) {
    return falha({
      codigo: "nivel_invalido",
      detalhe: `nível "${nivel}" inválido; esperado ${NIVEIS.join(", ")}`,
    });
  }
  return ok(`TAREFA: CHARADA\nPalavra secreta: ${palavra}\nNível: ${nivel}`);
}

export function entradaVeredito(
  alvo: string,
  fracao: number,
  cnn: Palpites,
  lstm: Palpites,
  ensemble: Palpites,
): string {
  return [
    "TAREFA: VEREDITO",
    `Desafio: ${alvo}`,
    `Desenho concluído: ${porcentagem(fracao)}%`,
    `CNN (imagem): ${palpitesEmTexto(cnn)}`,
    `LSTM (traços): ${palpitesEmTexto(lstm)}`,
    `Ensemble: ${palpitesEmTexto(ensemble)}`,
  ].join("\n");
}

function palpitesEmTexto(palpites: Palpites): string {
  return palpites.map(([nome, p]) => `${nome} ${porcentagem(p)}%`).join(", ");
}

export function entradaPergunta(pergunta: string): Resultado<string, ErroDeConversa> {
  const limpa = normalizarEspacos(pergunta);
  const tamanho = Array.from(limpa).length;
  if (tamanho < 1 || tamanho > TAMANHO_MAXIMO_DA_PERGUNTA) {
    const detalhe = `pergunta com ${tamanho} caracteres; esperado de 1 a ${TAMANHO_MAXIMO_DA_PERGUNTA}`;
    return falha({ codigo: "pergunta_invalida", detalhe });
  }
  return ok(`TAREFA: PERGUNTA\nVisitante: ${limpa}`);
}

/** Exatamente um <pensamento> seguido de um <resposta>, só espaços fora deles. */
export function lerFala(texto: string): Resultado<Fala, ErroDeConversa> {
  const encontrado = FALA.exec(texto);
  if (encontrado === null || TAGS.some((tag) => texto.split(tag).length !== 2)) {
    return formatoInvalido(`fala fora do formato <pensamento>/<resposta>: ${texto.slice(0, 80)}`);
  }
  return ok({ pensamento: aparar(encontrado[1] ?? ""), resposta: aparar(encontrado[2] ?? "") });
}

export function lerCharada(resposta: string): Resultado<string, ErroDeConversa> {
  const texto = aparar(resposta);
  const charada = aparar(texto.slice(PREFIXO_DA_CHARADA.length));
  if (!texto.startsWith(PREFIXO_DA_CHARADA) || charada === "") {
    return formatoInvalido(`charada sem o prefixo "${PREFIXO_DA_CHARADA}": ${texto.slice(0, 80)}`);
  }
  return ok(charada);
}

export function lerVeredito(resposta: string): Resultado<readonly [Veredito, string], ErroDeConversa> {
  const encontrado = VEREDITO.exec(aparar(resposta));
  const narracao = aparar(encontrado?.[2] ?? "");
  if (encontrado === null || narracao === "") {
    return formatoInvalido(`veredito fora do formato VEREDITO/NARRAÇÃO: ${resposta.slice(0, 80)}`);
  }
  return ok([encontrado[1] as Veredito, narracao]);
}

function formatoInvalido(detalhe: string): Resultado<never, ErroDeConversa> {
  return falha({ codigo: "formato_invalido", detalhe });
}

/** Leitura durante o streaming: corta pedaço de tag incompleto no fim e informa a etapa (D3). */
export function lerParcial(textoRecebido: string): LeituraParcial {
  const texto = semTagIncompleta(textoRecebido);
  if (!texto.includes("</pensamento>")) {
    return { etapa: "pensando", pensamento: apararInicio(depoisDe(texto, "<pensamento>")), resposta: "" };
  }
  const pensamento = aparar(depoisDe(texto, "<pensamento>").split("</pensamento>")[0] ?? "");
  const resto = texto.slice(texto.indexOf("</pensamento>") + "</pensamento>".length);
  if (!resto.includes("</resposta>")) {
    return { etapa: "respondendo", pensamento, resposta: apararInicio(depoisDe(resto, "<resposta>")) };
  }
  const resposta = aparar(depoisDe(resto, "<resposta>").split("</resposta>")[0] ?? "");
  return { etapa: "completa", pensamento, resposta };
}

function depoisDe(texto: string, tag: string): string {
  const posicao = texto.indexOf(tag);
  return posicao === -1 ? "" : texto.slice(posicao + tag.length);
}

function semTagIncompleta(texto: string): string {
  const inicio = texto.lastIndexOf("<");
  if (inicio === -1) return texto;
  const final = texto.slice(inicio);
  const ehPedacoDeTag = TAGS.some((tag) => tag.startsWith(final) && tag !== final);
  return ehPedacoDeTag ? texto.slice(0, inicio) : texto;
}
