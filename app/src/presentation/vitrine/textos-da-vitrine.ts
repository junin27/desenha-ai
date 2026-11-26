import { formatarPorcentagem, type ResumoDaVitrine } from "../../application/resumo-da-vitrine";
import { SEGUNDOS_DA_RODADA } from "../../domain/rodada/pontuacao";
import type { IdDoCapitulo } from "../../domain/vitrine/capitulos";

/** Cartão explicativo de um capítulo (spec `vitrine-da-abertura`: até 320 caracteres de texto, sem o título). */
export interface CartaoDoCapitulo {
  readonly sobre: string;
  readonly titulo: string;
  /** Pedaço do título pintado em terracota. */
  readonly destaque: string;
  readonly texto: string;
}

export const TEXTO_MAXIMO_DO_CARTAO = 320;
type CapituloComCartao = Exclude<IdDoCapitulo, "abertura" | "convite">;

const gb = (valor: number): string => `${valor.toFixed(2).replace(".", ",")} GB`;
const inteiro = (valor: number): string => valor.toLocaleString("pt-BR");
/** Texto só quando o número existe: métrica ausente some da frase (nada inventado). */
const se = <T>(valor: T | undefined, frase: (v: T) => string): string =>
  valor === undefined ? "" : frase(valor);

/** Os números vêm de `ResumoDaVitrine` (arquivos de métricas). */
export function cartaoDoCapitulo(id: CapituloComCartao, resumo: ResumoDaVitrine): CartaoDoCapitulo {
  return MONTADORES[id](resumo);
}

const MONTADORES: Readonly<Record<CapituloComCartao, (r: ResumoDaVitrine) => CartaoDoCapitulo>> = {
  jogo: () => ({
    sobre: "01 · o jogo",
    titulo: "Ô de casa,",
    destaque: "sô!",
    texto: `O Zé do Rabisco te dá uma charada. Você desenha a resposta em ${SEGUNDOS_DA_RODADA} segundos. Duas redes neurais tentam adivinhar ao vivo — e o Zé dá o veredito.`,
  }),
  desenho: () => ({
    sobre: "02 · o desenho",
    titulo: "Desenha com",
    destaque: "o que tiver",
    texto:
      "Mouse, dedo ou a mão no ar: o MediaPipe acha 21 pontos da sua mão na câmera e a ponta do indicador vira lápis. A imagem da câmera não sai do computador.",
  }),
  cnn: (r) => ({
    sobre: "03 · a CNN vê a imagem",
    titulo: "Filtros que",
    destaque: "enxergam",
    texto:
      "O traço vira uma imagem de 28×28. Filtros 3×3 deslizam procurando curvas e cantos, camada após camada." +
      se(
        r.cnn,
        (c) =>
          ` Acerta ${formatarPorcentagem(c.acuracia)} — e a resposta certa está no top-3 em ${formatarPorcentagem(c.top3)}.`,
      ),
  }),
  lstm: (r) => ({
    sobre: "04 · a LSTM lê o movimento",
    titulo: "A ordem dos",
    destaque: "traços",
    texto:
      "O mesmo rabisco, agora como sequência de pontos (Δx, Δy, levantou o lápis). A LSTM lembra o caminho — por isso chuta antes de você terminar." +
      se(r.ensemble, (e) => ` Juntas, as duas redes acertam ${formatarPorcentagem(e.acuracia)}`) +
      se(r.ensemble && r.ensembleComMetade, (m) => `; com metade do desenho, já ${formatarPorcentagem(m)}`) +
      (r.ensemble === undefined ? "" : "."),
  }),
  ze: () => ({
    sobre: "05 · o Zé é um SLM",
    titulo: "Um modelo de",
    destaque: "linguagem pequeno",
    texto:
      "O Zé é o Qwen3 de 1,7 bilhão de parâmetros: cria a charada, julga e narra como locutor de rodeio. Roda aqui, no notebook, sem internet.",
  }),
  destilacao: (r) => ({
    sobre: "06 · destilação",
    titulo: "O grande ensina",
    destaque: "o pequeno",
    texto:
      "Um modelo grande (o professor) escreveu charadas e vereditos com o raciocínio junto. Um filtro reprovou os ruins" +
      se(r.exemplosDoZe, (n) => ` e sobraram ${inteiro(n)} exemplos`) +
      ". O Qwen3 (o aluno) aprendeu imitando o professor.",
  }),
  qlora: (r) => ({
    sobre: "07 · fine-tuning com QLoRA",
    titulo: "Ajuste fino",
    destaque: "leve",
    texto:
      "O Qwen3 fica congelado em 4 bits; só treinamos adaptadores pequenos (LoRA" +
      se(
        r.lora,
        (l) => `, rank ${l.rank}: ${l.percentualTreinavel.toFixed(1).replace(".", ",")}% do modelo`,
      ) +
      "), numa GPU do Colab." +
      se(
        r.formato,
        (f) =>
          ` Respostas no formato certo: de ${formatarPorcentagem(f.base)} para ${formatarPorcentagem(f.destilado)}.`,
      ),
  }),
  quantizacao: (r) => ({
    sobre: "08 · quantização GGUF",
    titulo: "Cabe no",
    destaque: "notebook",
    texto:
      "Cada peso vai de 16 para 8 bits (Q8_0)" +
      se(r.quantizacao, (q) => `: de ${gb(q.gb16Bits)} para ${gb(q.gb8Bits)}`) +
      ". Assim o Zé cabe num notebook comum, sem placa de vídeo, rodando no llama.cpp só na CPU.",
  }),
  engenharia: (r) => ({
    sobre: "09 · engenharia",
    titulo: "Feito com",
    destaque: "capricho",
    texto:
      "Arquitetura hexagonal: as regras do jogo no centro; redes, Zé e câmera nas bordas. Cada comportamento nasceu de uma spec e de um teste antes do código" +
      se(
        r.testes,
        (t) => ` (${inteiro(t.python)} testes em Python e ${inteiro(t.typescript)} em TypeScript)`,
      ) +
      ". Tudo roda offline.",
  }),
};
