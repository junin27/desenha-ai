/**
 * Números técnicos da vitrine (spec `vitrine-da-abertura`, "Números lidos das métricas"; D6 do design).
 *
 * Vêm de `metricas_redes.json` (notebook 1), `metricas_slm.json` (notebook 3) e `ficha_da_vitrine.json` (gerada pela
 * verificação). Cada campo é opcional: arquivo ausente, malformado ou campo fora do formato vira `undefined`, e a
 * tela omite o número. Nada é inventado nem fica escrito à mão.
 */

export interface AcertoDaRede {
  readonly acuracia: number;
  readonly top3: number;
}

export interface ResumoDaVitrine {
  readonly cnn?: AcertoDaRede;
  readonly lstm?: AcertoDaRede;
  readonly ensemble?: AcertoDaRede;
  /** Acerto do ensemble com 50% dos pontos do desenho (curva antecipada). */
  readonly ensembleComMetade?: number;
  readonly lora?: { readonly rank: number; readonly percentualTreinavel: number };
  /** Exemplos aprovados do dataset do Zé (treino + validação + teste). */
  readonly exemplosDoZe?: number;
  /** Fração das falas no formato certo, antes e depois da destilação. */
  readonly formato?: { readonly base: number; readonly destilado: number };
  /** Tamanho do Zé: teórico em 16 bits e o GGUF real de 8 bits. */
  readonly quantizacao?: { readonly gb16Bits: number; readonly gb8Bits: number };
  readonly testes?: { readonly python: number; readonly typescript: number };
}

export interface FontesDoResumo {
  readonly redes: unknown;
  readonly slm: unknown;
  readonly ficha: unknown;
}

const CASAS_DECIMAIS = 1;

/** 0,9241 -> "92,4%" (uma casa decimal, vírgula). */
export function formatarPorcentagem(fracao: number): string {
  return `${(fracao * 100).toFixed(CASAS_DECIMAIS).replace(".", ",")}%`;
}

export function montarResumoDaVitrine(fontes: FontesDoResumo): ResumoDaVitrine {
  const resumo: Record<string, unknown> = {
    cnn: acertoDaRede(fontes.redes, "CNN"),
    lstm: acertoDaRede(fontes.redes, "LSTM"),
    ensemble: acertoDaRede(fontes.redes, "Ensemble"),
    ensembleComMetade: fracao(caminho(fontes.redes, ["curva_antecipada", "Ensemble", "0.5"])),
    lora: lora(fontes.slm),
    exemplosDoZe: exemplosDoZe(fontes.slm),
    formato: formato(fontes.slm),
    quantizacao: quantizacao(fontes.slm),
    testes: testes(fontes.ficha),
  };
  return Object.fromEntries(Object.entries(resumo).filter(([, v]) => v !== undefined));
}

function acertoDaRede(redes: unknown, nome: string): AcertoDaRede | undefined {
  const acuracia = fracao(caminho(redes, ["teste", nome, "acuracia"]));
  const top3 = fracao(caminho(redes, ["teste", nome, "top3"]));
  return acuracia === undefined || top3 === undefined ? undefined : { acuracia, top3 };
}

function lora(slm: unknown): ResumoDaVitrine["lora"] {
  const rank = inteiroPositivo(caminho(slm, ["lora", "r"]));
  const percentualTreinavel = positivo(caminho(slm, ["lora", "percentual"]));
  return rank === undefined || percentualTreinavel === undefined ? undefined : { rank, percentualTreinavel };
}

function exemplosDoZe(slm: unknown): number | undefined {
  const partes = ["treino", "validacao", "teste"].map((p) => inteiroPositivo(caminho(slm, ["dados", p])));
  return partes.some((p) => p === undefined) ? undefined : partes.reduce<number>((a, b) => a + (b ?? 0), 0);
}

function formato(slm: unknown): ResumoDaVitrine["formato"] {
  const base = fracao(caminho(slm, ["teste", "base", "formato"]));
  const destilado = fracao(caminho(slm, ["teste", "destilado", "formato"]));
  return base === undefined || destilado === undefined ? undefined : { base, destilado };
}

function quantizacao(slm: unknown): ResumoDaVitrine["quantizacao"] {
  const linhas = caminho(slm, ["quantizacao"]);
  if (!Array.isArray(linhas)) return undefined;
  const linha = (nome: string): unknown => linhas.find((l) => caminho(l, ["formato"]) === nome);
  const gb16Bits = positivo(caminho(linha("FP16/BF16"), ["teorico_gb"]));
  const gb8Bits = positivo(caminho(linha("INT8"), ["real_gb"]));
  return gb16Bits === undefined || gb8Bits === undefined ? undefined : { gb16Bits, gb8Bits };
}

function testes(ficha: unknown): ResumoDaVitrine["testes"] {
  const python = inteiroPositivo(caminho(ficha, ["testes", "python"]));
  const typescript = inteiroPositivo(caminho(ficha, ["testes", "typescript"]));
  return python === undefined || typescript === undefined ? undefined : { python, typescript };
}

function caminho(valor: unknown, chaves: readonly string[]): unknown {
  let atual = valor;
  for (const chave of chaves) {
    if (typeof atual !== "object" || atual === null) return undefined;
    atual = (atual as Record<string, unknown>)[chave];
  }
  return atual;
}

function fracao(valor: unknown): number | undefined {
  return typeof valor === "number" && valor >= 0 && valor <= 1 ? valor : undefined;
}

function positivo(valor: unknown): number | undefined {
  return typeof valor === "number" && Number.isFinite(valor) && valor > 0 ? valor : undefined;
}

function inteiroPositivo(valor: unknown): number | undefined {
  return typeof valor === "number" && Number.isInteger(valor) && valor > 0 ? valor : undefined;
}
