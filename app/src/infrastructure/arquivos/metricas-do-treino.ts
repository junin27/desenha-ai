import type {
  LinhaDeQuantizacao,
  MetricaDeRede,
  MetricasDasRedes,
  MetricasDoSlm,
  ResumoDoSlm,
} from "../../application/metricas-do-treino";

/*
 * Leitura tolerante das métricas do treino (D5 do design da bancada-do-ze): o painel é um extra, então
 * arquivo ausente ou fora do formato vira `undefined` (a tela mostra "—") em vez de erro.
 */
const REDES = ["CNN", "LSTM", "Ensemble"] as const;

type Objeto = Readonly<Record<string, unknown>>;

function objeto(valor: unknown): Objeto | undefined {
  return typeof valor === "object" && valor !== null && !Array.isArray(valor) ? (valor as Objeto) : undefined;
}

function numero(valor: unknown): number | undefined {
  return typeof valor === "number" && Number.isFinite(valor) ? valor : undefined;
}

/** `metricas_redes.json` do notebook 1. */
export function lerMetricasDasRedes(conteudo: unknown): MetricasDasRedes | undefined {
  const teste = objeto(objeto(conteudo)?.["teste"]);
  const pesoDaCnn = numero(objeto(conteudo)?.["w_cnn"]);
  if (teste === undefined || pesoDaCnn === undefined) return undefined;
  const redes = REDES.map((nome) => metricaDeRede(nome, objeto(teste[nome])));
  return redes.every((rede) => rede !== undefined) ? { redes, pesoDaCnn } : undefined;
}

function metricaDeRede(nome: string, dados: Objeto | undefined): MetricaDeRede | undefined {
  const acuracia = numero(dados?.["acuracia"]);
  const top3 = numero(dados?.["top3"]);
  return acuracia === undefined || top3 === undefined ? undefined : { nome, acuracia, top3 };
}

/** `metricas_slm.json` do notebook 3. */
export function lerMetricasDoSlm(conteudo: unknown): MetricasDoSlm | undefined {
  const dados = objeto(conteudo);
  const teste = objeto(dados?.["teste"]);
  const base = resumoDoSlm(objeto(teste?.["base"]));
  const destilado = resumoDoSlm(objeto(teste?.["destilado"]));
  const quantizacao = linhasDeQuantizacao(dados?.["quantizacao"]);
  if (base === undefined || destilado === undefined || quantizacao === undefined) return undefined;
  return { ensaio: dados?.["ensaio"] === true, modelos: { base, destilado }, quantizacao };
}

function resumoDoSlm(dados: Objeto | undefined): ResumoDoSlm | undefined {
  const formato = numero(dados?.["formato"]);
  const tarefas = objeto(dados?.["por_tarefa"]);
  if (formato === undefined || tarefas === undefined) return undefined;
  const porTarefa = Object.fromEntries(
    Object.entries(tarefas).flatMap(([tarefa, valor]) => {
      const acerto = numero(valor);
      return acerto === undefined ? [] : [[tarefa, acerto] as const];
    }),
  );
  return { formato, porTarefa };
}

function linhasDeQuantizacao(valor: unknown): LinhaDeQuantizacao[] | undefined {
  if (!Array.isArray(valor)) return undefined;
  const linhas = valor.map((item: unknown) => {
    const linha = objeto(item);
    const teoricoGb = numero(linha?.["teorico_gb"]);
    const formato = linha?.["formato"];
    if (teoricoGb === undefined || typeof formato !== "string") return undefined;
    return { formato, teoricoGb, realGb: numero(linha?.["real_gb"]) };
  });
  return linhas.every((linha) => linha !== undefined) ? linhas : undefined;
}
