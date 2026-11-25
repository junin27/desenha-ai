import type { ModoDeDesenho, PreferenciasDoDesenho } from "../application/portas";
import type { ArmazenamentoDoNavegador } from "./placar-local-storage";

/** Versão na chave, como no placar e na voz: formato novo não quebra a leitura do antigo. */
export const CHAVE_DO_DESENHO = "desenha-ai-so:desenho:v1";

interface Guardado {
  readonly som: boolean;
  readonly modo: ModoDeDesenho;
}

const PADRAO: Guardado = { som: true, modo: "mouse" };

/**
 * Som do lápis e modo de desenho no `localStorage`. Valor estranho vale o padrão (som ligado, Mouse); se o
 * navegador recusar gravar, a escolha vale em memória até a página fechar.
 *
 * @example
 * new PreferenciasDoDesenhoLocalStorage(window.localStorage).gravarModo("mao");
 */
export class PreferenciasDoDesenhoLocalStorage implements PreferenciasDoDesenho {
  private atual: Guardado;

  constructor(private readonly armazenamento: ArmazenamentoDoNavegador) {
    this.atual = lerGuardado(armazenamento.getItem(CHAVE_DO_DESENHO));
  }

  somLigado(): boolean {
    return this.atual.som;
  }

  gravarSomLigado(ligado: boolean): void {
    this.gravar({ ...this.atual, som: ligado });
  }

  modo(): ModoDeDesenho {
    return this.atual.modo;
  }

  gravarModo(modo: ModoDeDesenho): void {
    this.gravar({ ...this.atual, modo });
  }

  private gravar(novo: Guardado): void {
    this.atual = novo;
    try {
      this.armazenamento.setItem(CHAVE_DO_DESENHO, JSON.stringify(novo));
    } catch (erro) {
      console.warn("Preferência do desenho não gravada no navegador; segue só em memória.", erro);
    }
  }
}

function lerGuardado(texto: string | null): Guardado {
  if (texto === null) return PADRAO;
  try {
    const valor: unknown = JSON.parse(texto);
    if (typeof valor !== "object" || valor === null) return PADRAO;
    const { som, modo } = valor as Record<string, unknown>;
    return {
      som: typeof som === "boolean" ? som : PADRAO.som,
      modo: modo === "mao" || modo === "mouse" ? modo : PADRAO.modo,
    };
  } catch {
    return PADRAO; // JSON quebrado: vale o padrão, como no placar
  }
}
