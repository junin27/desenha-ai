import { existsSync, readdirSync, readFileSync } from "node:fs";
import { join, resolve } from "node:path";
import { describe, expect, it } from "vitest";

// Spec identidade-visual, requisito "Fontes do jogo": as duas fontes dentro do build, nenhum @font-face
// apontando para fora. O `scripts/verificar.sh` faz o build antes; sem dist/, o teste é pulado.
const PASTA_DOS_ARQUIVOS = join(resolve(import.meta.dirname, "..", ".."), "dist", "assets");
const temBuild = existsSync(PASTA_DOS_ARQUIVOS);

describe.skipIf(!temBuild)("Requisito: Fontes do jogo — build offline", () => {
  const arquivos = temBuild ? readdirSync(PASTA_DOS_ARQUIVOS) : [];

  it("test_fontes_gochi_hand_e_patrick_hand_estao_no_build", () => {
    expect(arquivos.some((nome) => /^gochi-hand-latin-400-normal.*\.woff2$/u.test(nome))).toBe(true);
    expect(arquivos.some((nome) => /^patrick-hand-latin-400-normal.*\.woff2$/u.test(nome))).toBe(true);
  });

  it("test_nenhum_font_face_aponta_para_fora", () => {
    const estilos = arquivos
      .filter((nome) => nome.endsWith(".css"))
      .map((nome) => readFileSync(join(PASTA_DOS_ARQUIVOS, nome), "utf8"))
      .join("\n");
    const faces = [...estilos.matchAll(/@font-face\s*\{[^}]*\}/gu)].map((m) => m[0]);
    expect(faces.length).toBeGreaterThanOrEqual(2);
    for (const face of faces) expect(face).not.toMatch(/url\(\s*["']?(https?:)?\/\//u);
  });
});
