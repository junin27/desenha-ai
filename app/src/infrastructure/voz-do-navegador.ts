import type { Cancelamento, VozDoZe } from "../application/portas";

/** O que o jogo lê de uma voz do sistema (`SpeechSynthesisVoice` satisfaz). */
export interface VozDoSistema {
  readonly name: string;
  readonly lang: string;
  readonly localService: boolean;
}

/** Parte do `speechSynthesis` que o jogo usa; genérica para o teste usar um sintetizador falso. */
export interface SintetizadorDeVoz<Enunciado, Voz extends VozDoSistema> {
  getVoices(): readonly Voz[];
  speak(enunciado: Enunciado): void;
  cancel(): void;
  addEventListener(tipo: "voiceschanged", ouvinte: () => void): void;
}

const IDIOMA_PREFERIDO = "pt-br";
const PREFIXO_DO_PORTUGUES = "pt";

/**
 * Voz do Zé pela síntese do navegador (D3 do design da bancada-do-ze): só vozes locais em português,
 * preferindo pt-BR; voz de rede nunca, porque o estande fica offline. As vozes chegam de forma
 * assíncrona, então a escolha é refeita em `voiceschanged`.
 *
 * @example
 * new VozDoNavegador(speechSynthesis, (texto, voz) => Object.assign(new SpeechSynthesisUtterance(texto), { voice: voz }));
 */
export class VozDoNavegador<Enunciado, Voz extends VozDoSistema> implements VozDoZe {
  private voz: Voz | undefined;
  private readonly ouvintes = new Set<(disponivel: boolean) => void>();

  constructor(
    private readonly sintetizador: SintetizadorDeVoz<Enunciado, Voz>,
    private readonly criarEnunciado: (texto: string, voz: Voz) => Enunciado,
  ) {
    this.voz = escolherVoz(sintetizador.getVoices());
    sintetizador.addEventListener("voiceschanged", () => {
      this.voz = escolherVoz(sintetizador.getVoices());
      for (const ouvinte of this.ouvintes) ouvinte(this.disponivel());
    });
  }

  disponivel(): boolean {
    return this.voz !== undefined;
  }

  aoMudarDisponibilidade(ouvinte: (disponivel: boolean) => void): Cancelamento {
    this.ouvintes.add(ouvinte);
    return () => this.ouvintes.delete(ouvinte);
  }

  falar(texto: string): void {
    if (this.voz === undefined) return;
    this.sintetizador.cancel(); // fala nova não entra na fila atrás da anterior
    this.sintetizador.speak(this.criarEnunciado(texto, this.voz));
  }

  calar(): void {
    this.sintetizador.cancel();
  }
}

function escolherVoz<Voz extends VozDoSistema>(vozes: readonly Voz[]): Voz | undefined {
  const locais = vozes.filter((voz) => voz.localService && idioma(voz).startsWith(PREFIXO_DO_PORTUGUES));
  return locais.find((voz) => idioma(voz) === IDIOMA_PREFERIDO) ?? locais[0];
}

function idioma(voz: VozDoSistema): string {
  return voz.lang.toLowerCase().replace("_", "-");
}
