import { describe, expect, it } from "vitest";
import {
  VozDoNavegador,
  type SintetizadorDeVoz,
  type VozDoSistema,
} from "../../src/infrastructure/voz-do-navegador";

// Spec `voz-do-ze`, requisito "Só voz local em português".
interface EnunciadoFalso {
  readonly texto: string;
  readonly voz: string;
}

class SintetizadorFalso implements SintetizadorDeVoz<EnunciadoFalso, VozDoSistema> {
  vozes: VozDoSistema[] = [];
  readonly falados: EnunciadoFalso[] = [];
  cancelamentos = 0;
  private aoMudarVozes: (() => void) | undefined;

  getVoices(): readonly VozDoSistema[] {
    return this.vozes;
  }
  speak(enunciado: EnunciadoFalso): void {
    this.falados.push(enunciado);
  }
  cancel(): void {
    this.cancelamentos += 1;
  }
  addEventListener(_tipo: "voiceschanged", ouvinte: () => void): void {
    this.aoMudarVozes = ouvinte;
  }
  chegaramVozes(vozes: VozDoSistema[]): void {
    this.vozes = vozes;
    this.aoMudarVozes?.();
  }
}

const GOOGLE_ONLINE = { name: "Google português do Brasil", lang: "pt-BR", localService: false };
const MARIA = { name: "Microsoft Maria", lang: "pt-BR", localService: true };
const HELIA = { name: "Microsoft Helia", lang: "pt-PT", localService: true };
const DAVID = { name: "Microsoft David", lang: "en-US", localService: true };

function voz(vozes: VozDoSistema[]) {
  const sintetizador = new SintetizadorFalso();
  sintetizador.vozes = vozes;
  const adaptador = new VozDoNavegador(sintetizador, (texto: string, escolhida: VozDoSistema) => ({
    texto,
    voz: escolhida.name,
  }));
  return { sintetizador, adaptador };
}

describe("só voz local em português", () => {
  it("só voz online disponível: indisponível e nada é falado", () => {
    const { sintetizador, adaptador } = voz([GOOGLE_ONLINE, DAVID]);
    adaptador.falar("Dá leite. Quem é?");
    expect(adaptador.disponivel()).toBe(false);
    expect(sintetizador.falados).toEqual([]);
  });

  it("preferência pelo português do Brasil entre vozes locais", () => {
    const { sintetizador, adaptador } = voz([HELIA, DAVID, GOOGLE_ONLINE, MARIA]);
    adaptador.falar("Dá leite. Quem é?");
    expect(sintetizador.falados).toEqual([{ texto: "Dá leite. Quem é?", voz: "Microsoft Maria" }]);
  });

  it("sem pt-BR local, usa outra variante local de português", () => {
    const { sintetizador, adaptador } = voz([HELIA]);
    adaptador.falar("Olá");
    expect(sintetizador.falados[0]?.voz).toBe("Microsoft Helia");
  });

  it("aceita o idioma escrito com sublinhado (pt_BR), como alguns sistemas informam", () => {
    const { adaptador } = voz([{ name: "Luciana", lang: "pt_BR", localService: true }]);
    expect(adaptador.disponivel()).toBe(true);
  });

  it("vozes que chegam depois (voiceschanged) tornam a voz disponível e avisam", () => {
    const { sintetizador, adaptador } = voz([]);
    const avisos: boolean[] = [];
    adaptador.aoMudarDisponibilidade((disponivel) => avisos.push(disponivel));
    expect(adaptador.disponivel()).toBe(false);
    sintetizador.chegaramVozes([MARIA]);
    expect(adaptador.disponivel()).toBe(true);
    expect(avisos).toEqual([true]);
  });
});

describe("falar e calar", () => {
  it("uma fala nova interrompe a anterior em vez de entrar na fila", () => {
    const { sintetizador, adaptador } = voz([MARIA]);
    adaptador.falar("primeira");
    adaptador.falar("segunda");
    expect(sintetizador.cancelamentos).toBe(2);
    expect(sintetizador.falados.map((f) => f.texto)).toEqual(["primeira", "segunda"]);
  });

  it("calar cancela a fala em andamento", () => {
    const { sintetizador, adaptador } = voz([MARIA]);
    adaptador.calar();
    expect(sintetizador.cancelamentos).toBe(1);
  });
});
