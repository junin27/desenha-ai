import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import { lerDesenhosDaVitrine } from "../../src/infrastructure/arquivos/desenhos-da-vitrine";

const VERSIONADO = resolve(
  import.meta.dirname,
  "..",
  "..",
  "..",
  "notebooks",
  "resultados",
  "modelos_redes",
  "vitrine_tracos.json",
);

describe("leitura do vitrine_tracos.json (change vitrine-viva)", () => {
  it("lê o arquivo versionado: 8 desenhos reais com crédito CC BY 4.0", () => {
    const lido = lerDesenhosDaVitrine(JSON.parse(readFileSync(VERSIONADO, "utf8")));
    expect(lido.ok).toBe(true);
    if (!lido.ok) return;
    expect(lido.valor.fonte).toContain("CC BY 4.0");
    expect(lido.valor.desenhos.map((d) => d.categoria)).toContain("sol");
    expect(lido.valor.desenhos.every((d) => d.desenho.tracos.length >= 2)).toBe(true);
  });

  it("arquivo malformado vira erro com o formato esperado", () => {
    const lido = lerDesenhosDaVitrine({
      fonte: "x",
      desenhos: [{ categoria: "sol", indice: "15", tracos: [] }],
    });
    expect(lido.ok).toBe(false);
    if (lido.ok) return;
    expect(lido.erro.codigo).toBe("arquivo_invalido");
    expect(lido.erro.detalhe).toContain("desenho 0");
  });

  it("conteúdo que não é objeto vira erro", () => {
    expect(lerDesenhosDaVitrine(null).ok).toBe(false);
    expect(lerDesenhosDaVitrine({ fonte: "x", desenhos: [] }).ok).toBe(false);
  });
});
