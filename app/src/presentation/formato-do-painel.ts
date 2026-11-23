import type { ResultadoDaParidade } from "../application/autoteste-de-paridade";
import type { MedicaoDaFala, MedicaoDasRedes } from "../application/medicoes-da-sessao";
import type { MetricasDasRedes, MetricasDoSlm, ResumoDoSlm } from "../application/metricas-do-treino";
import type { ModeloDoZe } from "../application/portas";

/** Textos do painel técnico, com números no formato brasileiro (vírgula decimal). */
export const SEM_DADO = "—";
const MILISSEGUNDOS_POR_SEGUNDO = 1000;
const CEM = 100;

export const NOME_DO_MODELO: Readonly<Record<ModeloDoZe, string>> = {
  destilado: "Zé destilado",
  base: "Qwen3 base",
};

export function decimal(valor: number, casas: number): string {
  return Number.isFinite(valor) ? valor.toFixed(casas).replace(".", ",") : SEM_DADO;
}

export function porcento(fracao: number): string {
  return `${decimal(fracao * CEM, 1)}%`;
}

export function textoDasRedes(redes: MedicaoDasRedes | undefined): string {
  if (redes === undefined) return SEM_DADO;
  return `CNN ${decimal(redes.cnnMs, 1)} ms · LSTM ${decimal(redes.lstmMs, 1)} ms · palpite ${decimal(redes.totalMs, 1)} ms`;
}

export function textoDaFala(fala: MedicaoDaFala | undefined): string {
  if (fala === undefined) return SEM_DADO;
  const primeiro =
    fala.ateOPrimeiroTokenMs === undefined ? SEM_DADO : `${Math.round(fala.ateOPrimeiroTokenMs)} ms`;
  const segundos = decimal(fala.duracaoMs / MILISSEGUNDOS_POR_SEGUNDO, 1);
  return (
    `${NOME_DO_MODELO[fala.modelo]}: ${fala.tokens} tokens, ${decimal(fala.tokensPorSegundo, 1)} tokens/s, ` +
    `1º token em ${primeiro}, ${segundos} s no total`
  );
}

export function textoDaParidade(paridade: ResultadoDaParidade | undefined): string {
  if (paridade === undefined) return SEM_DADO;
  const diferenca = Number.isFinite(paridade.maiorDiferenca)
    ? paridade.maiorDiferenca.toExponential(1)
    : SEM_DADO;
  const situacao = paridade.passou ? "ok" : "DIVERGENTE";
  return `${situacao} em ${paridade.casos} desenhos (diferença máxima ${diferenca})`;
}

export function textoDasMetricasDasRedes(metricas: MetricasDasRedes | undefined): string {
  if (metricas === undefined) return SEM_DADO;
  const redes = metricas.redes.map(
    (rede) => `${rede.nome} ${porcento(rede.acuracia)} (top-3 ${porcento(rede.top3)})`,
  );
  return `${redes.join(" · ")} · w_cnn ${decimal(metricas.pesoDaCnn, 2)}`;
}

/** Uma linha por métrica: formato, cada tarefa e cada formato de quantização. */
export function linhasDasMetricasDoSlm(metricas: MetricasDoSlm | undefined): string[] {
  if (metricas === undefined) return [];
  const { base, destilado } = metricas.modelos;
  const comparar = (nome: string, valor: (resumo: ResumoDoSlm) => number | undefined): string =>
    `${nome}: base ${porcentoOuNada(valor(base))} × destilado ${porcentoOuNada(valor(destilado))}`;
  const tarefas = Object.keys(destilado.porTarefa).map((tarefa) =>
    comparar(tarefa, (r) => r.porTarefa[tarefa]),
  );
  const quantizacao = metricas.quantizacao.map(
    (linha) =>
      `${linha.formato}: teórico ${decimal(linha.teoricoGb, 2)} GB, real ${linha.realGb === undefined ? SEM_DADO : `${decimal(linha.realGb, 2)} GB`}`,
  );
  const aviso = metricas.ensaio ? ["(modo ensaio: números sem valor estatístico)"] : [];
  return [comparar("Formato", (r) => r.formato), ...tarefas, ...quantizacao, ...aviso];
}

function porcentoOuNada(valor: number | undefined): string {
  return valor === undefined ? SEM_DADO : porcento(valor);
}
