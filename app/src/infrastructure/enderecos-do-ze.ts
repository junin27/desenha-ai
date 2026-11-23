import type { ModeloDoZe } from "../application/portas";

/** Portas que a `demo-offline` usa para subir os dois `llama-server` (D6 do design da bancada-do-ze). */
const ENDERECOS_PADRAO: Readonly<Record<ModeloDoZe, string>> = {
  destilado: "http://127.0.0.1:8080",
  base: "http://127.0.0.1:8081",
};
const PARAMETRO_DO_MODELO: Readonly<Record<ModeloDoZe, string>> = { destilado: "ze", base: "zebase" };

/**
 * Endereços dos dois Zés, trocáveis pela URL do jogo sem rebuild (`?ze=` e `?zebase=`).
 *
 * @example
 * enderecosDoZe("?zebase=http://127.0.0.1:9090").base; // "http://127.0.0.1:9090"
 */
export function enderecosDoZe(busca: string): Readonly<Record<ModeloDoZe, string>> {
  const parametros = new URLSearchParams(busca);
  const endereco = (modelo: ModeloDoZe): string =>
    (parametros.get(PARAMETRO_DO_MODELO[modelo]) ?? ENDERECOS_PADRAO[modelo]).replace(/\/+$/, "");
  return { destilado: endereco("destilado"), base: endereco("base") };
}
