import { readFileSync, readdirSync, statSync } from "node:fs";
import { dirname, join, relative, resolve, sep } from "node:path";
import { describe, expect, it } from "vitest";

// Regra da arquitetura hexagonal (ver .claude/rules/typescript-app.md e docs/decisoes.md D-04):
// as dependências só apontam para dentro. `main.ts` é a raiz de composição e pode tudo.
type Camada = "domain" | "application" | "infrastructure" | "presentation";

const PODE_IMPORTAR: Record<Camada, readonly Camada[]> = {
  domain: ["domain"],
  application: ["domain", "application"],
  infrastructure: ["domain", "application", "infrastructure"],
  presentation: ["domain", "application", "presentation"],
};
const PODE_USAR_PACOTES_EXTERNOS: Record<Camada, boolean> = {
  domain: false,
  application: false,
  infrastructure: true,
  presentation: true,
};

const RAIZ_SRC = resolve(import.meta.dirname, "..", "src");
const IMPORT_REGEX = /(?:import|export)\s[^"']*?from\s+["']([^"']+)["']|import\(\s*["']([^"']+)["']\s*\)/g;

function listarArquivosTs(pasta: string): string[] {
  return readdirSync(pasta).flatMap((nome) => {
    const caminho = join(pasta, nome);
    if (statSync(caminho).isDirectory()) return listarArquivosTs(caminho);
    return caminho.endsWith(".ts") ? [caminho] : [];
  });
}

function camadaDe(caminhoAbsoluto: string): Camada | undefined {
  const primeiraPasta = relative(RAIZ_SRC, caminhoAbsoluto).split(sep)[0];
  return (["domain", "application", "infrastructure", "presentation"] as const).find(
    (c) => c === primeiraPasta,
  );
}

function importsDe(arquivo: string): string[] {
  const codigo = readFileSync(arquivo, "utf8");
  return [...codigo.matchAll(IMPORT_REGEX)].map((m) => m[1] ?? m[2] ?? "");
}

export function violacoesDeArquitetura(arquivos: readonly string[]): string[] {
  return arquivos.flatMap((arquivo) => {
    const origem = camadaDe(arquivo);
    if (origem === undefined) return [];
    return importsDe(arquivo).flatMap((alvo) => violacaoDoImport(arquivo, origem, alvo));
  });
}

function violacaoDoImport(arquivo: string, origem: Camada, alvo: string): string[] {
  const nome = relative(RAIZ_SRC, arquivo);
  if (!alvo.startsWith(".")) {
    if (alvo.startsWith("node:") || !PODE_USAR_PACOTES_EXTERNOS[origem]) {
      return [`${nome}: a camada ${origem} não pode importar o pacote externo "${alvo}"`];
    }
    return [];
  }
  const destino = camadaDe(resolve(dirname(arquivo), alvo));
  if (destino === undefined || PODE_IMPORTAR[origem].includes(destino)) return [];
  return [`${nome}: a camada ${origem} não pode importar a camada ${destino} ("${alvo}")`];
}

describe("arquitetura hexagonal", () => {
  it("nenhum arquivo de src/ importa uma camada ou pacote proibido", () => {
    expect(violacoesDeArquitetura(listarArquivosTs(RAIZ_SRC))).toEqual([]);
  });
});
