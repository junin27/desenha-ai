import type { ReservaDoZe, Sorteador } from "../../application/portas";
import { falha, ok, type Resultado } from "../../domain/resultado";
import type { Veredito } from "../../domain/rodada/veredito";
import { NARRACOES_MODELO } from "./narracoes";

/** Conteúdo de `charadas_reserva.json` (change dataset-do-ze): categoria em português → charadas. */
export type CharadasDeReserva = Readonly<Record<string, readonly string[]>>;

export interface ErroDeReserva {
  readonly codigo: "reserva_invalida";
  readonly detalhe: string;
}

// Último recurso, se o arquivo não tiver a categoria: entrega a palavra, mas a rodada não para.
const CHARADA_SEM_RESERVA = "O Zé ficou sem charada! Desenhe: {categoria}.";

/**
 * Reserva do Zé lida do arquivo de charadas do dataset e das narrações-modelo (D6).
 *
 * @example
 * new ReservaDeArquivo({ vaca: ["Malhada e mansa, quem é?"] }, sorteador).charada("vaca");
 */
export class ReservaDeArquivo implements ReservaDoZe {
  constructor(
    private readonly charadas: CharadasDeReserva,
    private readonly sorteador: Sorteador,
  ) {}

  charada(categoria: string): string {
    const sorteada = this.sorteador.embaralhar(this.charadas[categoria] ?? [])[0];
    return sorteada ?? CHARADA_SEM_RESERVA.replace("{categoria}", categoria);
  }

  narracao(veredito: Veredito, desafio: string, primeiroPalpite: string): string {
    const modelo = this.sorteador.embaralhar(NARRACOES_MODELO[veredito])[0] ?? "{desafio}";
    return modelo.replaceAll("{desafio}", desafio).replaceAll("{palpite}", primeiroPalpite);
  }
}

/** Confere o formato do JSON antes de usá-lo; erro traz o que veio e o que se esperava. */
export function lerCharadasDeReserva(conteudo: unknown): Resultado<CharadasDeReserva, ErroDeReserva> {
  const esperado = 'esperado {"categoria": ["charada", ...]}';
  if (typeof conteudo !== "object" || conteudo === null || Array.isArray(conteudo)) {
    return falha({ codigo: "reserva_invalida", detalhe: `recebido ${tipoDe(conteudo)}; ${esperado}` });
  }
  for (const [categoria, lista] of Object.entries(conteudo)) {
    if (!Array.isArray(lista) || !lista.every((item) => typeof item === "string")) {
      const detalhe = `categoria "${categoria}" com ${tipoDe(lista)}; ${esperado}`;
      return falha({ codigo: "reserva_invalida", detalhe });
    }
  }
  return ok(conteudo as CharadasDeReserva);
}

function tipoDe(valor: unknown): string {
  if (Array.isArray(valor)) return "lista";
  return valor === null ? "null" : typeof valor;
}
