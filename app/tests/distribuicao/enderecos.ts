/** Varredura de endereços no build (spec `interface-do-jogo`, requisito "Funcionamento offline"). */
const ENDERECO = /https?:\/\/[^\s"'`<>()\\]+/g;
const PONTUACAO_NO_FIM = /[.,;:]+$/;
const HOST_LOCAL = /^https?:\/\/(localhost|127\.0\.0\.1)(:(\d+|\*))?(\/|$)/; // ":*" = qualquer porta, na política de conteúdo
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
/** Separador nulo que aparece entre textos dentro do binário do wasm. */
const NUL = String.fromCharCode(0);

export const TEXTOS_DE_TERCEIROS_PERMITIDOS: ReadonlySet<string> = new Set([
  "https://rolldown.rs/in-depth/bundling-cjs#require-external-modules",
  "https://web.dev/cross-origin-isolation-guide/",
  "https://arxiv.org/abs/1502.03167",
  "https://docs.nvidia.com/cuda/cublas/index.html#cublasLtOrder_t",
  "https://github.com/google/re2/wiki/Syntax",
  "https://ieeexplore.ieee.org/document/1163711",
  "https://tinyurl.com/sudb9s96",
  // MediaPipe Tasks Vision (desenho-com-a-mao): links de documentação e mensagens dentro do wasm e do bundle.
  "http://en.wikipedia.org/wiki/UTF-8#Description",
  `http://go/lsc_proto3_utf8${NUL}[enforce_utf8=false]`,
  `http://go/lsc_proto3_utf8${NUL}blaze-out/wasm-opt-ST-a91c6c59790e/bin/third_party/mediapipe/framework/formats/rect_registration.cc:line8${NUL}powervr`,
  "http://goto/weakfields",
  "http://kripken.github.io/emscripten-site/docs/api_reference/preamble.js.html",
  "http://pubs.opengroup.org/onlinepubs/009695399/functions/tzset.html",
  "http://server.com:4324:12",
  "http://unicode.org/faq/utf_bom.html#utf16-3",
  "https://bugzil.la/1328882",
  "https://developer.mozilla.org/en-US/docs/Web/API/Element/requestFullscreen",
  "https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Date/getTimezoneOffset",
  "https://github.com/emscripten-core/emscripten/issues/13295",
  "https://github.com/emscripten-core/emscripten/issues/23697",
  "https://github.com/emscripten-core/emscripten/pull/8236",
  "https://github.com/github/fetch/pull/92#issuecomment-140665932",
  "https://github.com/google/closure-compiler/issues/3193",
  "https://github.com/google/closure-compiler/pull/3913",
  "https://github.com/libsdl-org/SDL/pull/6304",
  "https://github.com/nodejs/help/issues/2136#issuecomment-523649904",
  `https://github.com/opencv/opencv/issues/16739${NUL}829${NUL}apple`,
  "https://tools.ietf.org/html/rfc3629",
  "https://webkit.org/b/222758",
  "https://www.ietf.org/rfc/rfc2279.txt",
  "https://www.khronos.org/registry/webgl/specs/latest/2.0/#5.15",
  "https://www.tensorflow.org/lite/guide/ops_custom",
  `https://www.tensorflow.org/lite/guide/ops_select${NUL}multi-channel`,
  // Registro de uso do MediaPipe (POST a cada 60 s): bloqueado pela política de conteúdo do build
  // (connect-src só localhost), conferida em politica-de-conteudo.test.ts.
  "https://odml.pa.googleapis.com/v1/log",
]);
