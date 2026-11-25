import { distanciaEntre, PUNHO, TOTAL_DE_PONTOS_DA_MAO, type PontosDaMao } from "./pontos";

/** Gesto reconhecido (spec `desenho-com-a-mao`, "Gestos da mão"). */
export type Gesto = "lapis" | "borracha" | "mao_aberta" | "nenhum";

/** Um gesto novo só vale depois de aparecer neste tanto de quadros seguidos. */
export const QUADROS_PARA_TROCAR = 3;
/** Folga para dizer que um dedo está esticado: a ponta 10% mais longe do punho que a articulação do meio. */
const FOLGA_DO_DEDO_ESTICADO = 1.1;

/** Ponta e articulação do meio de cada dedo, na ordem polegar, indicador, médio, anelar, mínimo. */
const DEDOS = [
  { ponta: 4, meio: 2 },
  { ponta: 8, meio: 6 },
  { ponta: 12, meio: 10 },
  { ponta: 16, meio: 14 },
  { ponta: 20, meio: 18 },
] as const;

/**
 * Classifica o gesto por geometria (D3 do design): dedo esticado = ponta mais longe do punho que a
 * articulação do meio. O polegar não conta para o lápis nem para a borracha, porque muita gente aponta
 * ou fecha a mão com ele solto.
 *
 * @example
 * classificarGesto(pontosDoMediaPipe); // "lapis"
 */
export function classificarGesto(pontos: PontosDaMao | undefined): Gesto {
  if (pontos === undefined || pontos.length < TOTAL_DE_PONTOS_DA_MAO) return "nenhum";
  const [polegar, indicador, medio, anelar, minimo] = DEDOS.map(({ ponta, meio }) =>
    dedoEsticado(pontos, ponta, meio),
  );
  if (polegar === true && indicador === true && medio === true && anelar === true && minimo === true)
    return "mao_aberta";
  if (medio === true || anelar === true || minimo === true) return "nenhum";
  return indicador === true ? "lapis" : "borracha";
}

function dedoEsticado(pontos: PontosDaMao, ponta: number, meio: number): boolean {
  const punho = pontos[PUNHO];
  const p = pontos[ponta];
  const m = pontos[meio];
  if (punho === undefined || p === undefined || m === undefined) return false;
  return distanciaEntre(p, punho) > distanciaEntre(m, punho) * FOLGA_DO_DEDO_ESTICADO;
}

/**
 * Filtro contra quadro ruidoso: o gesto em vigor só muda quando o novo aparece `QUADROS_PARA_TROCAR`
 * vezes seguidas.
 */
export class EstabilizadorDeGesto {
  private vigente: Gesto = "nenhum";
  private candidato: Gesto = "nenhum";
  private repeticoes = 0;

  registrar(gesto: Gesto): Gesto {
    if (gesto === this.vigente) {
      this.repeticoes = 0;
      return this.vigente;
    }
    this.repeticoes = gesto === this.candidato ? this.repeticoes + 1 : 1;
    this.candidato = gesto;
    if (this.repeticoes >= QUADROS_PARA_TROCAR) {
      this.vigente = gesto;
      this.repeticoes = 0;
    }
    return this.vigente;
  }

  reiniciar(): void {
    this.vigente = "nenhum";
    this.candidato = "nenhum";
    this.repeticoes = 0;
  }
}
