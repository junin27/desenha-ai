import { preencherArea, type Cor } from "../../domain/desenho/balde";
import type { Ponto, Traco } from "../../domain/desenho/desenho";
import {
  type AcaoNoQuadro,
  CapturaDoDesenho,
  type EstiloDoTraco,
  type Ferramenta,
  type OuvinteDoDesenho,
} from "../captura-do-desenho";
import { criar } from "../dom";
import { DesgasteDoLapis } from "./desgaste";
import { tom } from "./desenho-do-lapis";
import type { QuadroParaAMao } from "../mao/controle-da-mao";
import { LapisNoQuadro } from "./lapis-no-quadro";
import { opacidadeDa, type Particula, SistemaDeParticulas } from "./particulas";
import { type GeradorDeSom, GeradorWebAudio, SomDoDesenho } from "./som-do-desenho";

/** Resolução interna do quadro; o CSS ajusta o tamanho na tela e a captura converte as coordenadas. */
export const LADO_DO_QUADRO = 560;
const FUNDO = "#ffffff";
/** Os mesmos tons do desenho da borracha (spec `lapis-no-quadro`, "Partículas do traço"). */
const TONS_DA_BORRACHA = ["#f4a8a6", "#e58c8a", "#c8605e"];
const MS_POR_QUADRO = 1000 / 60;
const PASSO_MAXIMO = 2.5;

export interface OpcoesDoQuadro {
  readonly gerador?: GeradorDeSom;
  readonly somLigado?: boolean;
  /** Lê a cor visível num ponto (os testes passam uma função pronta; no navegador, os pixels). */
  readonly lerCor?: (ponto: Ponto) => string | undefined;
  /** O conta-gotas escolheu esta cor. */
  readonly aoEscolherCor?: (cor: string) => void;
}

/**
 * O quadro de desenho em camadas (D9 do design): pintura do balde embaixo, traços no meio (a captura) e
 * partículas em cima, com o lápis no lugar do cursor. Liga a captura ao lápis, às partículas e ao som.
 */
export class QuadroDeDesenho implements QuadroParaAMao {
  readonly raiz: HTMLElement;
  readonly captura: CapturaDoDesenho;
  readonly som: SomDoDesenho;
  private readonly pintura = criar("canvas", { classe: "camada-pintura" });
  private readonly tracos = criar("canvas", { classe: "quadro" });
  private readonly camadaDeParticulas = criar("canvas", { classe: "camada-particulas" });
  private readonly desgaste = new DesgasteDoLapis();
  private readonly lapis = new LapisNoQuadro(this.desgaste);
  private readonly particulas = new SistemaDeParticulas({
    chao: LADO_DO_QUADRO - 8,
    largura: LADO_DO_QUADRO,
  });
  private cor = "#2b1a0a";
  private instanteAnterior: number | undefined;
  private animando = false;
  private desgasteDesenhado: readonly [number, number, number] = [0, 0, 1];

  constructor(
    aoMudar: OuvinteDoDesenho,
    private readonly opcoes: OpcoesDoQuadro = {},
  ) {
    for (const canvas of [this.pintura, this.tracos, this.camadaDeParticulas]) {
      canvas.width = LADO_DO_QUADRO;
      canvas.height = LADO_DO_QUADRO;
    }
    this.limparPintura();
    this.som = new SomDoDesenho(opcoes.gerador ?? new GeradorWebAudio(), opcoes.somLigado ?? true);
    this.captura = new CapturaDoDesenho(this.tracos, aoMudar, (acao) => {
      this.reagir(acao);
    });
    this.raiz = criar("div", { classe: "moldura-do-quadro" }, [
      this.pintura,
      this.tracos,
      this.camadaDeParticulas,
      this.lapis.raiz,
    ]);
    this.seguirOPonteiro();
  }

  get tracosAtuais(): readonly Traco[] {
    return this.captura.tracos;
  }

  get estilos(): readonly EstiloDoTraco[] {
    return this.captura.estilos;
  }

  usar(ferramenta: Ferramenta): void {
    this.captura.usar(ferramenta);
    this.lapis.usar(ferramenta);
  }

  definirEstilo(estilo: EstiloDoTraco): void {
    this.cor = estilo.cor;
    this.captura.definirEstilo(estilo);
    this.lapis.pintar(estilo.cor);
  }

  /** "Limpar": traços, pintura e partículas somem e o lápis volta inteiro. */
  limpar(): void {
    this.captura.limpar();
    this.limparPintura();
    this.particulas.limpar();
    this.desgaste.renovar();
    this.desgasteDesenhado = [this.desgaste.corpo, this.desgaste.borracha, this.desgaste.ponta];
    this.lapis.redesenhar();
  }

  comecarEm(ponto: Ponto): void {
    this.captura.comecarEm(ponto);
  }

  continuarEm(ponto: Ponto): void {
    this.captura.continuarEm(ponto);
  }

  terminar(): void {
    this.captura.terminar();
  }

  /** Posição do ponteiro (mouse ou dedo) sem encostar: o lápis acompanha. */
  apontar(ponto: Ponto | undefined): void {
    if (ponto === undefined) this.lapis.esconder();
    else this.lapis.mover(this.naTela(ponto));
  }

  private reagir(acao: AcaoNoQuadro): void {
    const { tipo, ferramenta, ponto, distancia, dx } = acao;
    if (tipo === "tocar") {
      this.lapis.encostar();
      if (ferramenta === "balde") this.encher(ponto);
      else this.pegarCor(ponto);
      return;
    }
    if (ferramenta !== "lapis" && ferramenta !== "borracha") return;
    const tons =
      ferramenta === "lapis" ? [this.cor, tom(this.cor, 0.25), tom(this.cor, -0.25)] : TONS_DA_BORRACHA;
    if (tipo === "encostar") {
      this.lapis.encostar();
      this.som.encostar(ferramenta);
      if (!movimentoReduzido()) this.particulas.encostar(ferramenta, ponto, tons);
    } else if (tipo === "arrastar") {
      this.desgaste.gastar(ferramenta, distancia);
      this.redesenharSeGastou();
      this.som.arrastar(ferramenta, distancia);
      if (!movimentoReduzido()) this.particulas.soltar(ferramenta, ponto, distancia, tons);
    } else {
      this.som.parar();
    }
    this.lapis.mover(this.naTela(ponto), tipo !== "soltar", dx, distancia);
    this.animar();
  }

  /**
   * O quadro trabalha em 560 × 560 por dentro, mas aparece menor na tela: o lápis (um elemento da página)
   * precisa da posição em pixels da tela.
   */
  private naTela([x, y]: Ponto): Ponto {
    const largura = this.raiz.clientWidth;
    const escala = largura > 0 ? largura / LADO_DO_QUADRO : 1;
    return [x * escala, y * escala];
  }

  /** Redesenhar o SVG a cada movimento pesa: só quando o desgaste mudou o bastante para aparecer. */
  private redesenharSeGastou(): void {
    const { corpo, borracha, ponta } = this.desgaste;
    const [corpoAntes, borrachaAntes, pontaAntes] = this.desgasteDesenhado;
    if (
      Math.abs(corpo - corpoAntes) < 1 &&
      Math.abs(borracha - borrachaAntes) < 0.5 &&
      Math.abs(ponta - pontaAntes) < 0.05
    )
      return;
    this.desgasteDesenhado = [corpo, borracha, ponta];
    this.lapis.redesenhar();
  }

  /** Balde: pinta a área sobre a imagem visível (pintura + traços) e guarda o resultado só na pintura. */
  private encher([x, y]: Ponto): void {
    const pintura = this.pintura.getContext("2d", { willReadFrequently: true });
    const tracos = this.tracos.getContext("2d");
    if (pintura === null || tracos === null) return;
    const visivel = this.imagemVisivel(pintura);
    if (visivel === undefined) return;
    const antes = visivel.data.slice();
    const pintados = preencherArea(
      visivel.data,
      LADO_DO_QUADRO,
      LADO_DO_QUADRO,
      Math.round(x),
      Math.round(y),
      corRgb(this.cor),
    );
    if (pintados === 0) return;
    const camada = pintura.getImageData(0, 0, LADO_DO_QUADRO, LADO_DO_QUADRO);
    for (let i = 0; i < antes.length; i += 4) {
      if (
        antes[i] !== visivel.data[i] ||
        antes[i + 1] !== visivel.data[i + 1] ||
        antes[i + 2] !== visivel.data[i + 2]
      ) {
        camada.data.set(visivel.data.subarray(i, i + 4), i);
      }
    }
    pintura.putImageData(camada, 0, 0);
    this.som.balde();
  }

  private imagemVisivel(pintura: CanvasRenderingContext2D): ImageData | undefined {
    const junto = document.createElement("canvas");
    junto.width = LADO_DO_QUADRO;
    junto.height = LADO_DO_QUADRO;
    const contexto = junto.getContext("2d", { willReadFrequently: true });
    if (contexto === null) return undefined;
    contexto.drawImage(pintura.canvas, 0, 0);
    contexto.drawImage(this.tracos, 0, 0);
    return contexto.getImageData(0, 0, LADO_DO_QUADRO, LADO_DO_QUADRO);
  }

  private pegarCor(ponto: Ponto): void {
    const cor = this.opcoes.lerCor?.(ponto) ?? this.corVisivel(ponto);
    if (cor === undefined) return;
    this.som.contaGotas();
    this.opcoes.aoEscolherCor?.(cor);
  }

  private corVisivel([x, y]: Ponto): string | undefined {
    const pintura = this.pintura.getContext("2d", { willReadFrequently: true });
    if (pintura === null) return undefined;
    const imagem = this.imagemVisivel(pintura);
    if (imagem === undefined) return undefined;
    const i = (Math.round(y) * LADO_DO_QUADRO + Math.round(x)) * 4;
    return `#${[imagem.data[i], imagem.data[i + 1], imagem.data[i + 2]].map((c) => (c ?? 0).toString(16).padStart(2, "0")).join("")}`;
  }

  private limparPintura(): void {
    const pintura = this.pintura.getContext("2d");
    if (pintura === null) return;
    pintura.fillStyle = FUNDO;
    pintura.fillRect(0, 0, LADO_DO_QUADRO, LADO_DO_QUADRO);
  }

  /** O lápis segue o mouse sem encostar e some fora do quadro. */
  private seguirOPonteiro(): void {
    this.tracos.addEventListener("pointermove", (evento) => {
      if (evento.buttons === 0) this.apontar(this.pontoDo(evento));
    });
    this.tracos.addEventListener("pointerleave", () => {
      this.apontar(undefined);
    });
  }

  private pontoDo(evento: PointerEvent): Ponto {
    const caixa = this.tracos.getBoundingClientRect();
    const escala = caixa.width > 0 ? LADO_DO_QUADRO / caixa.width : 1;
    return [(evento.clientX - caixa.left) * escala, (evento.clientY - caixa.top) * escala];
  }

  /** Laço das partículas: roda só enquanto há partícula viva. */
  private animar(): void {
    if (this.animando || typeof requestAnimationFrame === "undefined") return;
    this.animando = true;
    this.instanteAnterior = undefined;
    requestAnimationFrame(this.passo);
  }

  private readonly passo = (agora: number): void => {
    const dt = Math.min(
      PASSO_MAXIMO,
      (agora - (this.instanteAnterior ?? agora - MS_POR_QUADRO)) / MS_POR_QUADRO,
    );
    this.instanteAnterior = agora;
    this.particulas.passo(dt);
    desenharParticulas(this.camadaDeParticulas.getContext("2d"), this.particulas.ativas);
    if (this.particulas.ativas.length > 0) requestAnimationFrame(this.passo);
    else this.animando = false;
  };
}

function desenharParticulas(
  contexto: CanvasRenderingContext2D | null,
  particulas: readonly Particula[],
): void {
  if (contexto === null) return;
  contexto.clearRect(0, 0, LADO_DO_QUADRO, LADO_DO_QUADRO);
  for (const p of particulas) {
    contexto.save();
    contexto.translate(p.x, p.y);
    contexto.rotate(p.giro);
    contexto.globalAlpha = opacidadeDa(p.vida);
    contexto.fillStyle = p.cor;
    contexto.strokeStyle = p.cor;
    desenharForma(contexto, p);
    contexto.restore();
  }
}

function desenharForma(contexto: CanvasRenderingContext2D, p: Particula): void {
  if (p.tipo === "lasca") {
    contexto.lineWidth = 3;
    contexto.beginPath();
    contexto.arc(0, 0, p.tamanho / 2, 0, Math.PI * p.curva);
    contexto.stroke();
  } else if (p.tipo === "minhoca") {
    contexto.lineWidth = 4;
    contexto.lineCap = "round";
    contexto.beginPath();
    contexto.moveTo(-p.tamanho / 2, 0);
    contexto.quadraticCurveTo(0, -p.tamanho * 0.35 * p.curva, p.tamanho / 2, 0);
    contexto.stroke();
  } else if (p.tipo === "faisca") {
    contexto.beginPath();
    for (let i = 0; i < 8; i++) {
      const raio = i % 2 === 1 ? p.tamanho * 0.4 : p.tamanho;
      contexto.lineTo(Math.cos((i * Math.PI) / 4) * raio, Math.sin((i * Math.PI) / 4) * raio);
    }
    contexto.fill();
  } else {
    contexto.fillRect(-p.tamanho / 2, -p.tamanho / 2, p.tamanho, p.tamanho);
  }
}

function corRgb(hex: string): Cor {
  const n = Number.parseInt(hex.slice(1), 16);
  return [n >> 16, (n >> 8) & 255, n & 255];
}

function movimentoReduzido(): boolean {
  return (
    typeof window.matchMedia === "function" && window.matchMedia("(prefers-reduced-motion: reduce)").matches
  );
}
