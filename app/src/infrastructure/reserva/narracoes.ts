import type { Veredito } from "../../domain/rodada/veredito";

/**
 * Narrações-modelo no estilo do Zé (D6 do design), usadas quando o SLM falha ou discorda da regra.
 * `{desafio}` é a palavra pedida; `{palpite}` é o 1º palpite das redes ("nada" se não houve traço), por
 * isso as frases de ERROU usam formas como "viram {palpite}", que soam bem nos dois casos.
 */
export const NARRACOES_MODELO: Readonly<Record<Veredito, readonly string[]>> = {
  ACERTOU: [
    "Ô trem bão! Era {desafio} e as redes cravaram de primeira!",
    "Segura peão! Deu {desafio} na cabeça, desenho de campeão!",
    "Uai, sô! A máquina bateu o olho e falou {desafio}. Bonito demais!",
    "É {desafio} mesmo, minha gente! Esse rabisco merece fivela de ouro!",
    "Arre égua! Nem precisei apertar os olhos: {desafio} na ponta do lápis!",
    "Pode soltar o rojão: {desafio}, e as redes concordaram na hora!",
  ],
  QUASE: [
    "Por um fio, sô! Era {desafio}, mas as redes acharam mais cara de {palpite}.",
    "Quase, quase! {desafio} apareceu na lista, só que {palpite} passou na frente.",
    "Faltou um tiquinho: as redes viram {palpite} primeiro, mas {desafio} tava ali pertinho.",
    "Ô dó! Deu {palpite} na frente e {desafio} ficou no pódio, raspando.",
    "Passou raspando, uai! Era {desafio}; a máquina chutou {palpite}, mas desconfiou.",
    "Tá no caminho, peão! {desafio} ficou entre os três; na frente, deu {palpite}.",
  ],
  ERROU: [
    "Eita, sô! Era {desafio}, mas as redes viram {palpite}. Na próxima vai!",
    "Ih, o boi fugiu da porteira: as redes enxergaram {palpite} e o desafio era {desafio}.",
    "Num deu dessa vez! A máquina viu {palpite}, e {desafio} ficou escondido no rabisco.",
    "Calma, peão, que rodeio tem revanche! Era {desafio} e as redes viram {palpite}.",
    "Esse desenho deu nó na cabeça das redes: viram {palpite}, mas era {desafio}.",
    "Ô sorte madrasta! O desafio era {desafio}, e as redes só viram {palpite}.",
  ],
};

/** Respostas do "Pergunte ao Zé" quando o SLM falha, demora ou sai do formato (D4 da bancada-do-ze). */
export const RESPOSTAS_MODELO: readonly string[] = [
  "Ô sô, essa me pegou de calça curta! O Zé tá meio rouco agora; pergunta de novo daqui a pouquinho.",
  "Uai, deu um nó aqui no meu chapéu! Tenta perguntar de novo, que eu tô voltando do curral.",
  "Eita, a moda de viola travou no meio! Pergunta outra vez, que o Zé responde já já.",
  "Segura peão, que o Zé tá tomando um café! Faz a pergunta de novo daqui a pouco.",
  "Arre, sumiu a ideia da cabeça! Me pergunta outra vez, que dessa vez eu acerto a porteira.",
  "O Zé foi buscar a resposta lá na roça e ainda não voltou. Tenta de novo, sô!",
];

/** Resposta para pergunta bloqueada: o Zé nem é chamado. */
export const RESPOSTA_BLOQUEADA =
  "Opa, essa aí o Zé não responde não, sô! Pergunta de desenho, de rede neural ou da roça, que eu te conto tudo.";
