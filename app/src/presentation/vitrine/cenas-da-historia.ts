import type { PalpitesNaFracao } from "../../application/palpites-da-vitrine";
import type { DesenhoDaVitrine } from "../../application/desenhos-da-vitrine";
import type { ResumoDaVitrine } from "../../application/resumo-da-vitrine";
import type { Desenho } from "../../domain/desenho/desenho";
import { LADO_DA_IMAGEM, rasterizar } from "../../domain/desenho/rasterizacao";
import type { IdDoCapitulo } from "../../domain/vitrine/capitulos";
import { criar } from "../dom";
import { PersonagemDoZe, type OpcoesDoPersonagem } from "../ze/personagem";
import { cartaoDoCapitulo, type CartaoDoCapitulo } from "./textos-da-vitrine";

/** Vídeo toon da roça (Google Flow/Veo 3.1, 1280×720) e a janela da casa medida nos pixels dele. */
export const VIDEO_DA_ROCA = "vitrine/fundo-roca-toon.mp4";
export const QUADRO_DO_VIDEO = { largura: 1280, altura: 720 };
export const JANELA_DA_CASA = { x: 225, y: 374, largura: 22.5, altura: 30 };
const LIMITE_DO_DESENHO = 255; // desenhos do Quick, Draw! simplified ficam em 0..255
const FILTROS_3X3 = [
  [-1, -1, -1, 2, 2, 2, -1, -1, -1],
  [-1, 2, -1, -1, 2, -1, -1, 2, -1],
  [2, -1, -1, -1, 2, -1, -1, -1, 2],
  [-1, -1, -1, -1, 8, -1, -1, -1, -1],
];

export interface DadosDasCenas {
  readonly desenho: DesenhoDaVitrine | undefined;
  readonly fonteDosDesenhos: string | undefined;
  readonly palpites: readonly PalpitesNaFracao[] | undefined;
  readonly resumo: ResumoDaVitrine;
  readonly nomesDasCategorias: readonly string[];
}

/**
 * Rabiscos à mão no fundo de cada capítulo (espiral, zigue-zague, laço, estrela, onda, setas e "x"), na mesma
 * família de cor do fundo: o corte do portal continua sem troca de cor e a tela não fica chapada.
 */
const RABISCOS = [
  "M120 150 m-30 0 a30 30 0 1 1 60 0 a24 24 0 1 1 -48 0 a18 18 0 1 1 36 0",
  "M1250 90 l30 -25 l30 25 l30 -25 l30 25 l30 -25",
  "M80 780 c60 -60 120 40 180 -20 s120 40 180 -20",
  "M1450 700 l12 30 l32 2 l-25 20 l9 31 l-28 -18 l-28 18 l9 -31 l-25 -20 l32 -2 z",
  "M700 840 a40 25 0 1 0 1 0",
  "M1480 380 q20 -30 40 0 t40 0 t40 0",
  "M400 110 l20 20 m0 -20 l-20 20 M1100 830 l20 20 m0 -20 l-20 20",
  "M260 470 q60 -80 140 -20 m-24 -26 l24 26 l-32 4",
];

function criarDetalhesDoFundo(id: IdDoCapitulo): HTMLElement {
  const caminhos = RABISCOS.map((d) => `<path d="${d}"/>`).join("");
  const desenho = svgDeTexto(
    `<svg class="rabiscos-do-fundo" viewBox="0 0 1600 900" preserveAspectRatio="xMidYMid slice" aria-hidden="true">${caminhos}</svg>`,
  );
  return criar("div", { classe: `detalhes-do-fundo detalhes-${id}`, dados: { parte: "detalhes" } }, [
    desenho,
  ]);
}

export function criarCena(id: IdDoCapitulo, filhos: readonly Node[]): HTMLElement {
  const detalhes = id === "abertura" ? [] : [criarDetalhesDoFundo(id)];
  const cena = criar("section", { classe: `cena-vitrine cena-${id}`, dados: { cena: id } }, [
    ...detalhes,
    ...filhos,
  ]);
  cena.setAttribute("aria-hidden", "true");
  return cena;
}

export function criarCartao(cartao: CartaoDoCapitulo): HTMLElement {
  const titulo = criar("h2", { texto: `${cartao.titulo} ` }, [
    criar("span", { classe: "destaque", texto: cartao.destaque }),
  ]);
  return criar("article", { classe: "cartao-vitrine" }, [
    criar("p", { classe: "sobre", texto: cartao.sobre }),
    titulo,
    criar("p", { classe: "texto", texto: cartao.texto }),
  ]);
}

export function criarVideoDaRoca(): HTMLVideoElement {
  const video = criar("video", { classe: "fundo-video" });
  Object.assign(video, { src: VIDEO_DA_ROCA, muted: true, loop: true, playsInline: true, preload: "auto" });
  video.setAttribute("aria-hidden", "true");
  return video;
}

/** Marca invisível na janela da casa (objeto dos portais da roça), posicionada em % do quadro do vídeo. */
export function criarMarcaDaJanela(): HTMLElement {
  const marca = criar("i", { classe: "objeto-do-portal", dados: { objeto: "janela" } });
  Object.assign(marca.style, {
    left: `${(JANELA_DA_CASA.x / QUADRO_DO_VIDEO.largura) * 100}%`,
    top: `${(JANELA_DA_CASA.y / QUADRO_DO_VIDEO.altura) * 100}%`,
    width: `${(JANELA_DA_CASA.largura / QUADRO_DO_VIDEO.largura) * 100}%`,
    height: `${(JANELA_DA_CASA.altura / QUADRO_DO_VIDEO.altura) * 100}%`,
  });
  return marca;
}

export function cenaAbertura(): HTMLElement {
  const tinta = svgDeTexto(
    '<svg class="tinta-abertura" viewBox="0 0 1600 900" preserveAspectRatio="xMidYMid slice" aria-hidden="true">' +
      '<g data-parte="mancha" transform="translate(800 450)"><path data-parte="gota" d="M0 -60 C12 -40 20 -28 20 -16 C20 -2 11 8 0 8 C-11 8 -20 -2 -20 -16 C-20 -28 -12 -40 0 -60 Z"/></g>' +
      '<path data-parte="forma-da-mancha" visibility="hidden" d="M0 -300 C90 -290 110 -190 200 -210 C310 -230 350 -130 300 -50 C260 20 380 50 360 140 C340 240 230 230 180 290 C120 360 40 340 -10 300 C-80 250 -170 330 -240 260 C-310 190 -250 110 -300 50 C-360 -20 -330 -120 -240 -140 C-160 -160 -140 -250 -70 -280 C-50 -290 -25 -300 0 -300 Z"/>' +
      "</svg>",
  );
  const titulo = criar("h1", { classe: "titulo-vitrine", texto: "Desenha aí, " }, [
    criar("span", { classe: "destaque", texto: "sô!", dados: { objeto: "so" } }),
    criar("small", { texto: "um jogo de desenho que conversa com a IA" }),
  ]);
  return criarCena("abertura", [tinta, titulo]);
}

/** Escala final da mancha de tinta na abertura (a mesma do fim da entrada animada). */
export const ESCALA_DA_MANCHA = 1.75;

/**
 * A abertura em repouso, sem animação (movimento reduzido ou abaixo de 30 fps): a gota já virou mancha e está no
 * tamanho final, para o título creme ter o fundo escuro por trás.
 */
/** Contadores no número final (o "0 → 455" só existe na animação; sem ela, o número certo aparece direto). */
export function pousarContadores(raiz: ParentNode): void {
  for (const contador of raiz.querySelectorAll<HTMLElement>("[data-ate]")) {
    contador.textContent = Number(contador.dataset.ate).toLocaleString("pt-BR");
  }
}

export function pousarAbertura(cena: HTMLElement): void {
  const gota = cena.querySelector('[data-parte="gota"]');
  const forma = cena.querySelector('[data-parte="forma-da-mancha"]')?.getAttribute("d");
  if (gota && forma) gota.setAttribute("d", forma);
  cena
    .querySelector('[data-parte="mancha"]')
    ?.setAttribute("transform", `translate(800 450) scale(${ESCALA_DA_MANCHA})`);
}

export function cenaJogo(
  dados: DadosDasCenas,
  opcoesDoZe: OpcoesDoPersonagem,
): {
  cena: HTMLElement;
  ze: PersonagemDoZe;
  video: HTMLVideoElement;
} {
  const ze = new PersonagemDoZe(opcoesDoZe);
  ze.raiz.classList.add("ze-da-vitrine");
  const video = criarVideoDaRoca();
  const cena = criarCena("jogo", [
    video,
    criarMarcaDaJanela(),
    ze.raiz,
    criarCartao(cartaoDoCapitulo("jogo", dados.resumo)),
  ]);
  return { cena, ze, video };
}

/** Um `<path>` por traço, no espaço 0..255 do Quick, Draw!. */
export function svgDoDesenho(desenho: Desenho, classe: string): SVGSVGElement {
  const lado = LIMITE_DO_DESENHO + 24;
  const caminhos = desenho.tracos
    .map((traco) => traco.map(([x, y], i) => `${i === 0 ? "M" : "L"}${x} ${y}`).join(" "))
    .map((d) => `<path class="traco-vitrine" d="${d}"/>`)
    .join("");
  return svgDeTexto(
    `<svg class="${classe}" viewBox="-12 -12 ${lado} ${lado}" aria-hidden="true">${caminhos}</svg>`,
  );
}

/** Cria o SVG pelo parser do HTML (mesmo jeito dos ícones): o namespace vem sozinho, sem endereço no código. */
function svgDeTexto(texto: string): SVGSVGElement {
  const modelo = document.createElement("template");
  modelo.innerHTML = texto;
  const svg = modelo.content.firstElementChild;
  if (!(svg instanceof SVGSVGElement)) throw new Error(`SVG da vitrine inválido: ${texto.slice(0, 40)}…`);
  return svg;
}

export function cenaDesenho(dados: DadosDasCenas): HTMLElement {
  const folha = criar("div", { classe: "folha-vitrine", dados: { objeto: "desenho" } });
  if (dados.desenho !== undefined) folha.append(svgDoDesenho(dados.desenho.desenho, "desenho-real"));
  folha.append(criar("i", { classe: "lapis-vitrine", dados: { parte: "lapis" } }));
  const credito = dados.desenho === undefined ? [] : [criarCredito(dados)];
  return criarCena("desenho", [folha, ...credito, criarCartao(cartaoDoCapitulo("desenho", dados.resumo))]);
}

function criarCredito(dados: DadosDasCenas): HTMLElement {
  const categoria = dados.desenho?.categoria ?? "";
  return criar("p", {
    classe: "credito-vitrine",
    texto: `Desenho real de "${categoria}" · Quick, Draw! · CC BY 4.0`,
    dados: { parte: "credito" },
  });
}

/** A grade 28×28 da vitrine é exatamente a entrada da CNN (spec "Grade 28×28 é a entrada da CNN"). */
export function entradaDaGrade(desenho: Desenho): Float32Array {
  return rasterizar(desenho);
}

export function cenaCnn(dados: DadosDasCenas): HTMLElement {
  const grade = criar("canvas", { classe: "grade-vitrine" });
  const caixa = criar("div", { classe: "grade-caixa", dados: { objeto: "grade" } }, [
    grade,
    criar("div", { classe: "janela-conv", dados: { parte: "janela-conv" } }),
    criar("span", { classe: "rotulo", texto: `${LADO_DA_IMAGEM} × ${LADO_DA_IMAGEM} pixels` }),
  ]);
  const pilha = criar("div", { classe: "pilha-vitrine" });
  if (dados.desenho !== undefined) {
    const imagem = entradaDaGrade(dados.desenho.desenho);
    grade.dataset.entrada = "cnn";
    pintarMapa(grade, [...imagem], LADO_DA_IMAGEM, [43, 26, 10]);
    const cores: [number, number, number][] = [
      [181, 64, 31],
      [201, 138, 0],
      [47, 125, 50],
      [61, 108, 158],
    ];
    for (const [i, filtro] of FILTROS_3X3.entries()) {
      const mapa = criar("canvas");
      pintarMapa(mapa, convoluir(imagem, filtro), LADO_DA_IMAGEM - 2, cores[i] ?? [43, 26, 10]);
      pilha.append(criar("div", { classe: "plano" }, [mapa]));
    }
  }
  return criarCena("cnn", [
    caixa,
    pilha,
    barrasDaCnn(dados),
    criarCartao(cartaoDoCapitulo("cnn", dados.resumo)),
  ]);
}

function barrasDaCnn(dados: DadosDasCenas): HTMLElement {
  const lista = criar("ol", { classe: "barras-vitrine", dados: { parte: "barras-cnn" } });
  const completo = dados.palpites?.at(-1);
  for (const [indice, p] of completo?.cnn ?? []) {
    const porcentagem = Math.round(p * 100);
    const barra = criar("span", { classe: "barra" });
    barra.style.width = `${porcentagem}%`;
    lista.append(
      criar("li", { dados: { porcentagem: String(porcentagem) } }, [
        barra,
        criar("span", { texto: dados.nomesDasCategorias[indice] ?? "?" }),
        criar("span", { texto: `${porcentagem}%` }),
      ]),
    );
  }
  return lista;
}

export function cenaLstm(dados: DadosDasCenas): HTMLElement {
  const trilha =
    dados.desenho === undefined ? criar("div") : svgDoDesenho(dados.desenho.desenho, "trilha-vitrine");
  const corrente = criar("div", { classe: "corrente-vitrine" });
  const entradas = ["(Δx, Δy, ✎)", "(Δx, Δy, ✎)", "(Δx, Δy, ↑)", "(Δx, Δy, ✎)", "(Δx, Δy, ✎)", "…"];
  for (const entrada of entradas) {
    corrente.append(
      criar("div", { classe: "celula" }, [document.createTextNode("LSTM"), criar("em", { texto: entrada })]),
    );
  }
  const saida = criar("div", { classe: "saida-lstm", dados: { objeto: "saida" } });
  for (const p of dados.palpites ?? []) {
    const [indice, prob] = p.lstm[0] ?? [0, 0];
    const nome = dados.nomesDasCategorias[indice] ?? "?";
    saida.append(
      criar("span", {
        classe: "chute",
        texto: `${nome}${p.fracao < 1 ? "?" : "!"} ${Math.round(prob * 100)}%`,
        dados: { fracao: String(p.fracao) },
      }),
    );
  }
  return criarCena("lstm", [
    trilha,
    criar("div", { classe: "memoria-vitrine" }, [criar("i")]),
    corrente,
    saida,
    criarCartao(cartaoDoCapitulo("lstm", dados.resumo)),
  ]);
}

function convoluir(entrada: Float32Array, filtro: readonly number[]): number[] {
  const lado = LADO_DA_IMAGEM;
  const saida: number[] = [];
  for (let y = 1; y < lado - 1; y++) {
    for (let x = 1; x < lado - 1; x++) saida.push(somaNaJanela(entrada, filtro, x, y));
  }
  return saida;
}

/** Filtro 3×3 centrado em (x, y): o que cada "neurônio" da primeira camada da CNN calcula. */
function somaNaJanela(entrada: Float32Array, filtro: readonly number[], x: number, y: number): number {
  let soma = 0;
  for (let j = -1; j <= 1; j++) {
    for (let i = -1; i <= 1; i++) {
      soma += (entrada[(y + j) * LADO_DA_IMAGEM + x + i] ?? 0) * (filtro[(j + 1) * 3 + i + 1] ?? 0);
    }
  }
  return soma;
}

function pintarMapa(
  canvas: HTMLCanvasElement,
  valores: readonly number[],
  lado: number,
  cor: readonly number[],
): void {
  canvas.width = canvas.height = lado;
  const contexto = canvas.getContext("2d");
  if (contexto === null) return; // ambiente sem canvas (testes): a grade fica só com os dados
  const imagem = contexto.createImageData(lado, lado);
  const maximo = Math.max(...valores, 1e-6);
  const [r = 0, g = 0, b = 0] = cor;
  valores.forEach((v, i) => {
    const k = Math.max(0, v) / maximo;
    imagem.data.set([255 - (255 - r) * k, 253 - (253 - g) * k, 246 - (246 - b) * k, 255], i * 4);
  });
  contexto.putImageData(imagem, 0, 0);
}
