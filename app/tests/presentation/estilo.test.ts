import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

// Spec identidade-visual: paleta, contraste do texto e legibilidade (>= 24 px fora dos bastidores).
const CSS = readFileSync(new URL("../../src/estilo.css", import.meta.url), "utf8");

const PALETA: Readonly<Record<string, string>> = {
  papel: "#f7ecd4",
  "papel-escuro": "#ead7ad",
  quadro: "#fffdf6",
  tinta: "#2b1a0a",
  "tinta-suave": "#6b4f2e",
  terracota: "#b5401f",
  mostarda: "#c98a00",
  "mostarda-texto": "#8a5c00",
  verde: "#2f7d32",
  vermelho: "#b3261e",
  creme: "#fff6df",
  pessego: "#f9e3c9",
  "verde-claro": "#eef6e6",
  rosado: "#f9dcd6",
};
/** Cores que podem ser de texto no jogo. */
const CORES_DE_TEXTO = [
  "tinta",
  "tinta-suave",
  "terracota",
  "mostarda-texto",
  "verde",
  "vermelho",
  "quadro",
  "papel",
];
/** Pares texto/fundo que as telas usam (o primeiro é o texto). */
const PARES_USADOS: readonly (readonly [string, string])[] = [
  ["tinta", "papel"],
  ["tinta", "quadro"],
  ["tinta", "creme"],
  ["tinta", "pessego"],
  ["tinta", "verde-claro"],
  ["tinta", "rosado"],
  ["tinta", "mostarda"],
  ["tinta-suave", "papel"],
  ["tinta-suave", "quadro"],
  ["tinta-suave", "creme"],
  ["tinta-suave", "papel-escuro"],
  ["terracota", "papel"],
  ["terracota", "quadro"],
  ["quadro", "terracota"],
  ["quadro", "verde"],
  ["quadro", "tinta-suave"],
  ["quadro", "tinta"],
  ["verde", "quadro"],
  ["verde", "verde-claro"],
  ["vermelho", "quadro"],
  ["vermelho", "rosado"],
  ["vermelho", "papel"],
  ["mostarda-texto", "quadro"],
  ["mostarda-texto", "papel"],
];
/** Bastidores (painel técnico e barra do estande) podem ter letra menor: não são o texto do jogo. */
const BLOCOS_DE_BASTIDORES = /\.(painel|barra-do-estande|contadores)\b/u;

function luminancia(hex: string): number {
  const canais = [1, 3, 5].map((inicio) => Number.parseInt(hex.slice(inicio, inicio + 2), 16) / 255);
  const [r = 0, g = 0, b = 0] = canais.map((c) => (c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4));
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

function contraste(a: string, b: string): number {
  const [clara, escura] = [luminancia(a), luminancia(b)].sort((x, y) => y - x);
  return ((clara ?? 0) + 0.05) / ((escura ?? 0) + 0.05);
}

/** Regras do CSS como [seletor, corpo], fora de @keyframes. */
function regras(): [string, string][] {
  const semComentarios = CSS.replace(/\/\*[\s\S]*?\*\//gu, "");
  return [...semComentarios.matchAll(/([^{}]+)\{([^{}]*)\}/gu)].map((m) => [(m[1] ?? "").trim(), m[2] ?? ""]);
}

describe("Requisito: Paleta do jogo", () => {
  it("test_tokens_da_paleta_tem_os_valores_da_spec", () => {
    for (const [nome, valor] of Object.entries(PALETA)) expect(CSS).toContain(`--${nome}: ${valor};`);
  });

  it("test_cor_de_texto_so_vem_da_paleta", () => {
    const fora = regras()
      .filter(([seletor]) => !BLOCOS_DE_BASTIDORES.test(seletor))
      .flatMap(([seletor, corpo]) =>
        [...corpo.matchAll(/(?:^|;)\s*color:\s*([^;]+);/gu)].map(
          (m) => [seletor, (m[1] ?? "").trim()] as const,
        ),
      )
      .filter(([, valor]) => {
        const token = /^var\(--([\w-]+)\)$/u.exec(valor)?.[1];
        return !(
          valor === "currentColor" ||
          valor === "inherit" ||
          (token !== undefined && CORES_DE_TEXTO.includes(token))
        );
      });
    expect(fora).toEqual([]);
  });
});

describe("Requisito: Contraste do texto", () => {
  it.each(PARES_USADOS)("test_contraste_de_%s_sobre_%s_e_ao_menos_4_5", (texto, fundo) => {
    expect(contraste(PALETA[texto] ?? "", PALETA[fundo] ?? "")).toBeGreaterThanOrEqual(4.5);
  });

  it("test_mostarda_pura_nao_serve_para_texto", () => {
    expect(contraste(PALETA["mostarda"] ?? "", PALETA["quadro"] ?? "")).toBeLessThan(4.5);
    expect(CORES_DE_TEXTO).not.toContain("mostarda");
  });
});

describe("Requisito: Legibilidade e offline mantidos", () => {
  it("test_fonte_do_jogo_tem_ao_menos_24px", () => {
    const pequenas = regras()
      .filter(([seletor]) => !BLOCOS_DE_BASTIDORES.test(seletor))
      .flatMap(([seletor, corpo]) =>
        [...corpo.matchAll(/font-size:\s*(\d+)px/gu)].map((m) => [seletor, Number(m[1])] as const),
      )
      .filter(([, tamanho]) => tamanho < 24);
    expect(pequenas).toEqual([]);
    const minimo = Number(/--texto-base: clamp\((\d+)px,/u.exec(CSS)?.[1]);
    expect(minimo).toBeGreaterThanOrEqual(24);
  });

  it("test_sem_fonte_nem_recurso_externo", () => {
    expect(CSS).not.toMatch(/@import|url\(\s*["']?https?:/u);
  });
});

describe("Requisito: Fontes do jogo", () => {
  it("test_titulos_usam_gochi_hand_e_o_texto_patrick_hand", () => {
    expect(CSS).toMatch(/--fonte-titulo: "Gochi Hand",/u);
    expect(CSS).toMatch(/--fonte-texto: "Patrick Hand",/u);
    expect(CSS).toMatch(/h1,\s*h2[^{]*\{[^}]*font-family: var\(--fonte-titulo\)/u);
    expect(CSS).toMatch(/:root \{[^}]*font-family: var\(--fonte-texto\)/u);
  });
});

describe("Requisito: Títulos e botões em maiúsculas", () => {
  it("test_titulos_e_botoes_em_maiusculas_e_campos_nao", () => {
    expect(CSS).toMatch(/h1,\s*h2[^{]*\{[^}]*text-transform: uppercase/u);
    expect(CSS).toMatch(/\nbutton \{[^}]*text-transform: uppercase/u);
    expect(CSS).toMatch(/\ninput,\s*textarea,\s*\.campo \{[^}]*text-transform: none/u);
  });
});
