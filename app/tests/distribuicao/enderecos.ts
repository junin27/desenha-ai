/** Varredura de endereços no build (spec `interface-do-jogo`, requisito "Funcionamento offline"). */
const ENDERECO = /https?:\/\/[^\s"'`<>()\\]+/g;
const PONTUACAO_NO_FIM = /[.,;:]+$/;
const HOST_LOCAL = /^https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?(\/|$)/;
const CARREGAMENTO =
  /(?:src|href)\s*=\s*["']?(https?:\/\/[^"'\s>]+)|url\(\s*["']?(https?:\/\/[^"')\s]+)|(?:import\(|from)\s*["'](https?:\/\/[^"']+)/g;

/** Endereços http(s) fora de localhost/127.0.0.1, sem a pontuação que fecha a frase. */
export function enderecosExternos(texto: string): string[] {
  const encontrados = (texto.match(ENDERECO) ?? []).map((url) => url.replace(PONTUACAO_NO_FIM, ""));
  return encontrados.filter((url) => !HOST_LOCAL.test(url));
}

/** Endereços externos usados para carregar algo (src, href, url(), import), não só citados em texto. */
export function carregamentosExternos(texto: string): string[] {
  return [...texto.matchAll(CARREGAMENTO)]
    .map((encontrado) => encontrado[1] ?? encontrado[2] ?? encontrado[3] ?? "")
    .filter((url) => !HOST_LOCAL.test(url));
}

/**
 * Textos de bibliotecas de terceiros que citam endereços sem carregá-los: links de documentação dentro
 * do `.wasm` do onnxruntime e mensagens de erro do bundler. Lista fechada: um endereço novo reprova o
 * teste e precisa ser analisado antes de entrar aqui.
 */
export const TEXTOS_DE_TERCEIROS_PERMITIDOS: ReadonlySet<string> = new Set([
  "https://rolldown.rs/in-depth/bundling-cjs#require-external-modules",
  "https://web.dev/cross-origin-isolation-guide/",
  "https://arxiv.org/abs/1502.03167",
  "https://docs.nvidia.com/cuda/cublas/index.html#cublasLtOrder_t",
  "https://github.com/google/re2/wiki/Syntax",
  "https://ieeexplore.ieee.org/document/1163711",
  "https://tinyurl.com/sudb9s96",
]);
