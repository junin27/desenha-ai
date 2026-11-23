/**
 * Métricas do treino mostradas no painel técnico (spec `painel-tecnico`). Vêm de `metricas_redes.json`
 * (notebook 1) e `metricas_slm.json` (notebook 3); a infraestrutura lê os arquivos, a tela só exibe.
 */

export interface MetricaDeRede {
  readonly nome: string;
  readonly acuracia: number;
  readonly top3: number;
}

export interface MetricasDasRedes {
  readonly redes: readonly MetricaDeRede[];
  readonly pesoDaCnn: number;
}

export interface ResumoDoSlm {
  /** Fração das saídas no formato `<pensamento>`/`<resposta>`. */
  readonly formato: number;
  /** Acerto por tarefa (CHARADA, VEREDITO, PERGUNTA). */
  readonly porTarefa: Readonly<Record<string, number>>;
}

export interface LinhaDeQuantizacao {
  readonly formato: string;
  readonly teoricoGb: number;
  /** Tamanho do GGUF gerado, quando existe para aquele formato. */
  readonly realGb: number | undefined;
}

export interface MetricasDoSlm {
  /** Verdadeiro quando o notebook 3 rodou no modo ensaio (números sem valor estatístico). */
  readonly ensaio: boolean;
  readonly modelos: { readonly base: ResumoDoSlm; readonly destilado: ResumoDoSlm };
  readonly quantizacao: readonly LinhaDeQuantizacao[];
}
