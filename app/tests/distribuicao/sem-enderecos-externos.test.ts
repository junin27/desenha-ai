import { existsSync, readdirSync, readFileSync, statSync } from "node:fs";
import { join, relative, resolve } from "node:path";
import { describe, expect, it } from "vitest";
import { carregamentosExternos, citacaoPermitida, enderecosExternos } from "./enderecos";

// Spec `interface-do-jogo`, requisito "Funcionamento offline". O `scripts/verificar.sh` faz o build antes
// dos testes, então lá o `dist/` sempre existe; sem build, só a parte do dist é pulada.
const RAIZ_DO_APP = resolve(import.meta.dirname, "..", "..");
const PASTA_DO_BUILD = join(RAIZ_DO_APP, "dist");
const EXTENSOES_DO_JOGO = [".ts", ".css", ".html"];

function arquivos(pasta: string): string[] {
  return readdirSync(pasta).flatMap((nome) => {
    const caminho = join(pasta, nome);
    return statSync(caminho).isDirectory() ? arquivos(caminho) : [caminho];
  });
}

/** Binários (wasm, onnx) lidos como latin1: cada byte vira um caractere, sem erro de decodificação. */
function conteudo(caminho: string): string {
  return readFileSync(caminho, "latin1");
}

function porArquivo(lista: string[], extrair: (texto: string) => string[]): string[] {
  return lista.flatMap((caminho) =>
    extrair(conteudo(caminho)).map((url) => `${relative(RAIZ_DO_APP, caminho)}: ${url}`),
  );
}

describe("varredura de endereços", () => {
  it("acha endereços externos e ignora localhost e 127.0.0.1", () => {
    const texto =
      'fetch("http://127.0.0.1:8080/completion"); ver https://exemplo.com/doc. e http://localhost:4173/';
    expect(enderecosExternos(texto)).toEqual(["https://exemplo.com/doc"]);
  });

  it("separa carregamento (src, href, url(), import) de endereço só citado em texto", () => {
    const html = '<script src="https://cdn.exemplo.com/a.js"></script><p>veja https://docs.exemplo.com</p>';
    const css = "@font-face { src: url(https://fontes.exemplo.com/f.woff2) }";
    const js = 'import x from "https://esm.exemplo.com/x.js"; await import("https://esm.exemplo.com/y.js")';
    expect(carregamentosExternos(html)).toEqual(["https://cdn.exemplo.com/a.js"]);
    expect(carregamentosExternos(css)).toEqual(["https://fontes.exemplo.com/f.woff2"]);
    expect(carregamentosExternos(js)).toEqual([
      "https://esm.exemplo.com/x.js",
      "https://esm.exemplo.com/y.js",
    ]);
  });
});

describe("procedência de vídeo gerado por IA", () => {
  it("prefixos C2PA só valem em vídeo; em outro arquivo, o mesmo endereço reprova", () => {
    expect(citacaoPermitida("dist/vitrine/fundo.mp4", "http://pki.goog/c2pa/root-g3.crt0")).toBe(true);
    expect(citacaoPermitida("dist/assets/index.js", "http://pki.goog/c2pa/root-g3.crt0")).toBe(false);
    expect(citacaoPermitida("dist/vitrine/fundo.mp4", "https://cdn.exemplo.com/a.js")).toBe(false);
  });
});

describe("funcionamento offline", () => {
  it("o código do jogo (src/ e index.html) não contém endereços externos", () => {
    const doJogo = [...arquivos(join(RAIZ_DO_APP, "src")), join(RAIZ_DO_APP, "index.html")].filter(
      (caminho) => EXTENSOES_DO_JOGO.some((extensao) => caminho.endsWith(extensao)),
    );
    expect(porArquivo(doJogo, enderecosExternos)).toEqual([]);
  });

  it.skipIf(!existsSync(PASTA_DO_BUILD))("build sem endereços externos: nada é carregado de fora", () => {
    expect(porArquivo(arquivos(PASTA_DO_BUILD), carregamentosExternos)).toEqual([]);
  });

  it.skipIf(!existsSync(PASTA_DO_BUILD))(
    "endereço externo novo no build reprova: só a lista fechada de textos de terceiros é aceita",
    () => {
      const novos = arquivos(PASTA_DO_BUILD).flatMap((caminho) =>
        enderecosExternos(conteudo(caminho))
          .filter((url) => !citacaoPermitida(caminho, url))
          .map((url) => `${relative(RAIZ_DO_APP, caminho)}: ${url}`),
      );
      expect(novos).toEqual([]);
    },
  );
});
