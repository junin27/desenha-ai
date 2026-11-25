import type { Plugin } from "vite";
import { defineConfig } from "vitest/config";

/**
 * Política de segurança do conteúdo, só no build (o que roda no evento): o navegador não conecta a nada
 * fora de `localhost`/`127.0.0.1` (o jogo e o Zé). Bloqueia, por exemplo, o registro de uso que o
 * MediaPipe tenta mandar ao Google a cada 60 s (spec `desenho-com-a-mao`, "Rastreamento offline e fluido").
 * No `npm run dev` ela fica de fora porque o Vite injeta scripts inline para recarregar a página.
 */
export const POLITICA_DE_CONTEUDO = [
  "default-src 'self'",
  "script-src 'self' 'wasm-unsafe-eval'",
  "style-src 'self' 'unsafe-inline'",
  "img-src 'self' data: blob:",
  "media-src 'self' blob: mediastream:",
  "font-src 'self' data:",
  "worker-src 'self' blob:",
  "connect-src 'self' http://localhost:* http://127.0.0.1:*",
].join("; ");

function politicaNoBuild(): Plugin {
  return {
    name: "politica-de-conteudo",
    apply: "build",
    transformIndexHtml: () => [
      {
        tag: "meta",
        attrs: { "http-equiv": "Content-Security-Policy", content: POLITICA_DE_CONTEUDO },
        injectTo: "head-prepend",
      },
    ],
  };
}

// `base: "./"` permite abrir o build de qualquer pasta (a demo roda offline, sem servidor fixo).
export default defineConfig({
  base: "./",
  plugins: [politicaNoBuild()],
  test: {
    include: ["tests/**/*.test.ts"],
    environment: "node",
  },
});
