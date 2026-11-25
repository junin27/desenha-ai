import { existsSync, readFileSync } from "node:fs";
import { join, resolve } from "node:path";
import { describe, expect, it } from "vitest";

// Spec desenho-com-a-mao, "Rastreamento offline e fluido": o build traz uma política que só deixa o jogo
// conectar a localhost e 127.0.0.1 (o jogo e o Zé). O verificar.sh faz o build antes; sem dist/, pula.
const INDEX = join(resolve(import.meta.dirname, "..", ".."), "dist", "index.html");

describe.skipIf(!existsSync(INDEX))("Requisito: Rastreamento offline — política de conteúdo no build", () => {
  const html = existsSync(INDEX) ? readFileSync(INDEX, "utf8") : "";
  // O Vite escreve as aspas simples como &#39; dentro do atributo.
  const politica = (
    /http-equiv="Content-Security-Policy" content="([^"]+)"/u.exec(html)?.[1] ?? ""
  ).replaceAll("&#39;", "'");

  it("test_build_tem_a_politica_de_conteudo", () => {
    expect(politica).not.toBe("");
  });

  it("test_conexoes_so_para_o_proprio_jogo_e_o_ze", () => {
    const conexoes = /connect-src ([^;]+)/u.exec(politica)?.[1]?.trim().split(/\s+/u) ?? [];
    expect(conexoes).toEqual(["'self'", "http://localhost:*", "http://127.0.0.1:*"]);
  });

  it("test_scripts_so_do_proprio_jogo", () => {
    expect(politica).toMatch(/script-src 'self' 'wasm-unsafe-eval'(;|$)/u);
  });
});
