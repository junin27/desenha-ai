import type { DetectorDeMao } from "../../application/portas";
import type { Ponto } from "../../domain/desenho/desenho";
import { centroDaPalma, noQuadro, Suavizador } from "../../domain/mao/coordenadas";
import { classificarGesto, EstabilizadorDeGesto, type Gesto } from "../../domain/mao/gestos";
import { ContagemDaLimpeza } from "../../domain/mao/limpeza";
import type { PontosDaMao } from "../../domain/mao/pontos";
import type { Ferramenta } from "../captura-do-desenho";

/** Ponta do indicador nos 21 pontos da mão. */
const PONTA_DO_INDICADOR = 8;
const LADO_PADRAO = 560;

/** O que o controle precisa do quadro: os mesmos passos do mouse (D5 do design). */
export interface QuadroParaAMao {
  usar(ferramenta: Ferramenta): void;
  comecarEm(ponto: Ponto): void;
  continuarEm(ponto: Ponto): void;
  terminar(): void;
  apontar(ponto: Ponto | undefined): void;
}

/** O que a miniatura mostra a cada quadro. */
export interface EstadoDaMao {
  readonly gesto: Gesto;
  readonly pontos: PontosDaMao | undefined;
  /** De 0 a 1: anel do "limpar tudo". */
  readonly fracaoDaLimpeza: number;
}

/**
 * Transforma cada quadro da câmera em passos no quadro de desenho (spec `desenho-com-a-mao`): indicador =
 * lápis pela ponta do dedo; mão fechada = borracha pela palma; mão aberta parada 3 s = limpar tudo.
 *
 * @example
 * const controle = new ControleDaMao(quadro, detector, () => tela.limpar());
 * requestAnimationFrame((agora) => miniatura.mostrar(controle.quadroNovo(agora)));
 */
export class ControleDaMao {
  private readonly estabilizador = new EstabilizadorDeGesto();
  private readonly suavizador = new Suavizador();
  private readonly contagem = new ContagemDaLimpeza();
  private gestoAnterior: Gesto = "nenhum";
  private emAndamento = false;

  constructor(
    private readonly quadro: QuadroParaAMao,
    private readonly detector: DetectorDeMao,
    private readonly aoLimpar: () => void,
    private readonly lado = LADO_PADRAO,
  ) {}

  quadroNovo(instanteMs: number): EstadoDaMao {
    const pontos = this.detector.detectar(instanteMs);
    const gesto = this.estabilizador.registrar(classificarGesto(pontos));
    if (gesto !== this.gestoAnterior) this.levantar();
    this.gestoAnterior = gesto;
    const palma = pontos === undefined ? undefined : centroDaPalma(pontos);
    const limpeza = this.contagem.registrar(gesto, palma, instanteMs);
    if (limpeza.limpar) this.aoLimpar();
    this.agir(gesto, pontos);
    return { gesto, pontos, fracaoDaLimpeza: limpeza.fracao };
  }

  /** Troca de modo ou fim do desenho: termina o traço em andamento e esconde o lápis. */
  parar(): void {
    this.levantar();
    this.estabilizador.reiniciar();
    this.gestoAnterior = "nenhum";
    this.quadro.apontar(undefined);
  }

  private agir(gesto: Gesto, pontos: PontosDaMao | undefined): void {
    const dedo = pontos?.[PONTA_DO_INDICADOR];
    const palma = pontos === undefined ? undefined : centroDaPalma(pontos);
    if (gesto === "lapis" && dedo !== undefined) {
      this.tocar("lapis", this.suavizador.suavizar(noQuadro(dedo, this.lado)));
    } else if (gesto === "borracha" && palma !== undefined) {
      this.tocar("borracha", noQuadro(palma, this.lado));
    } else {
      this.levantar();
      const referencia = gesto === "mao_aberta" ? palma : dedo;
      this.quadro.apontar(referencia === undefined ? undefined : noQuadro(referencia, this.lado));
    }
  }

  private tocar(ferramenta: "lapis" | "borracha", ponto: Ponto): void {
    if (this.emAndamento) {
      this.quadro.continuarEm(ponto);
      return;
    }
    this.quadro.usar(ferramenta);
    this.quadro.comecarEm(ponto);
    this.emAndamento = true;
  }

  private levantar(): void {
    if (this.emAndamento) this.quadro.terminar();
    this.emAndamento = false;
    this.suavizador.reiniciar();
  }
}
