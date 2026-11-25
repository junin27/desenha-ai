import { existsSync, readFileSync, statSync } from "node:fs";
import { join, resolve } from "node:path";
import { describe, expect, it } from "vitest";

// Spec `desenho-com-a-mao`, "Rastreamento offline e fluido": o modelo da mão e o wasm do MediaPipe têm de
// ir dentro do build (servidos pelo próprio jogo), senão o modo Mão cai para o mouse no estande offline.
// Sem `dist/`, o teste é pulado; o `scripts/verificar.sh` faz o build antes dos testes.
const PASTA_DA_MAO = resolve(import.meta.dirname, "..", "..", "dist", "mao");
const TEM_BUILD = existsSync(PASTA_DA_MAO);
const TAMANHO_MINIMO_DO_MODELO = 5_000_000; // o hand_landmarker.task tem ~7,8 MB
const TAMANHO_MINIMO_DO_WASM = 5_000_000; // o vision_wasm_internal.wasm tem ~14 MB

describe.skipIf(!TEM_BUILD)("Requisito: Rastreamento offline e fluido — arquivos da mão no build", () => {
  it("test_build_traz_o_modelo_da_mao", () => {
    const modelo = join(PASTA_DA_MAO, "hand_landmarker.task");
    expect(existsSync(modelo)).toBe(true);
    expect(statSync(modelo).size).toBeGreaterThan(TAMANHO_MINIMO_DO_MODELO);
  });

  it("test_build_traz_o_wasm_e_o_carregador_do_mediapipe", () => {
    const wasm = join(PASTA_DA_MAO, "vision_wasm_internal.wasm");
    expect(existsSync(wasm)).toBe(true);
    expect(statSync(wasm).size).toBeGreaterThan(TAMANHO_MINIMO_DO_WASM);
    expect(existsSync(join(PASTA_DA_MAO, "vision_wasm_internal.js"))).toBe(true);
  });

  it("test_wasm_comeca_com_a_assinatura_de_webassembly", () => {
    // Um wasm truncado ou trocado por uma página de erro (404) quebraria o modo Mão sem aviso claro.
    const assinatura = readFileSync(join(PASTA_DA_MAO, "vision_wasm_internal.wasm")).subarray(0, 4);
    expect([...assinatura]).toEqual([0x00, 0x61, 0x73, 0x6d]);
  });
});
