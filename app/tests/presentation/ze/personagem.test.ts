// @vitest-environment happy-dom
import { describe, expect, it } from "vitest";
import { PersonagemDoZe } from "../../../src/presentation/ze/personagem";

const semEspera = (): Promise<void> => Promise.resolve();

function classesDeHumor(ze: PersonagemDoZe): string[] {
  const svg = ze.raiz.querySelector("svg");
  return [...(svg?.classList ?? [])].filter((classe) => classe.startsWith("humor-"));
}

describe("Requisito: Humores do Zé (spec personagem-do-ze)", () => {
  it("test_um_humor_por_vez", () => {
    const ze = new PersonagemDoZe({ esperar: semEspera });
    ze.mudarHumor("torcendo");
    ze.mudarHumor("assustado");
    expect(classesDeHumor(ze)).toEqual(["humor-assustado"]);
    expect(ze.humor).toBe("assustado");
  });

  it("test_fala_mostra_o_texto_e_volta_ao_humor_anterior", async () => {
    const ze = new PersonagemDoZe({ esperar: semEspera });
    ze.mudarHumor("comemorando");
    const falando = ze.falar("Ô trem bão!");
    expect(ze.humor).toBe("falando");
    await falando;
    expect(ze.raiz.querySelector("[data-texto='fala-do-ze']")?.textContent).toBe("Ô trem bão!");
    expect(ze.humor).toBe("comemorando");
  });

  it("test_humor_novo_durante_a_fala_vale_depois_dela", async () => {
    const ze = new PersonagemDoZe({ esperar: semEspera });
    const falando = ze.falar("Bora!");
    ze.mudarHumor("assustado");
    await falando;
    expect(ze.humor).toBe("assustado");
  });

  it("test_pensando_mostra_so_pensando_no_balao", () => {
    const ze = new PersonagemDoZe({ esperar: semEspera });
    ze.pensar();
    expect(ze.humor).toBe("pensando");
    expect(ze.raiz.querySelector("[data-texto='fala-do-ze']")?.textContent).toBe("Pensando…");
  });

  it("test_tedio_sobrepoe_e_acordar_volta_ao_humor", () => {
    const ze = new PersonagemDoZe({ esperar: semEspera });
    ze.mudarHumor("neutro");
    ze.entediar();
    expect(ze.humor).toBe("entediado");
    ze.acordar();
    expect(ze.humor).toBe("neutro");
  });

  it("test_desenho_do_ze_nao_carrega_nada_de_fora", () => {
    const ze = new PersonagemDoZe({ esperar: semEspera });
    const html = ze.raiz.innerHTML;
    expect(html).not.toMatch(/https?:\/\//u);
    expect(ze.raiz.querySelector("svg .chapeu")).not.toBeNull();
  });
});
