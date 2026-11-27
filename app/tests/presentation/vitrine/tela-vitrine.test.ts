// @vitest-environment happy-dom
import { existsSync, statSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import type { PalpitesNaFracao } from "../../../src/application/palpites-da-vitrine";
import { criarDesenho } from "../../../src/domain/desenho/desenho";
import { ClassificadorOnnx } from "../../../src/infrastructure/onnx/classificador-onnx";
import { entradaDaGrade } from "../../../src/presentation/vitrine/cenas-da-historia";
import {
  TelaVitrine,
  type AnimacaoDaVitrine,
  type ConteudoDaVitrine,
} from "../../../src/presentation/vitrine/tela-vitrine";

const NOMES = Array.from({ length: 30 }, (_, i) => (i === 15 ? "sol" : i === 20 ? "flor" : `classe${i}`));
const SOL = criarDesenho([
  [
    [0, 0],
    [100, 0],
  ],
  [
    [0, 50],
    [100, 50],
  ],
]);
const PALPITES: PalpitesNaFracao[] = [0.25, 0.5, 0.75, 1].map((fracao) => ({
  fracao,
  cnn: [
    [15, 0.82],
    [20, 0.09],
    [3, 0.04],
  ],
  lstm: [
    [fracao < 0.5 ? 20 : 15, 0.6],
    [3, 0.2],
    [4, 0.1],
  ],
  ensemble: [
    [15, 0.7],
    [20, 0.1],
    [3, 0.05],
  ],
}));

function conteudo(extra: Partial<ConteudoDaVitrine> = {}): ConteudoDaVitrine & { pedidos: number } {
  const c = {
    pedidos: 0,
    desenhos: {
      fonte: "Quick, Draw! · CC BY 4.0",
      desenhos: [{ categoria: "sol", indice: 15, desenho: SOL }],
    },
    resumo: {},
    nomesDasCategorias: NOMES,
    palpitesDe() {
      c.pedidos++;
      return Promise.resolve(PALPITES);
    },
    sortear: () => 0,
    ...extra,
  };
  return c;
}

async function montada(c: ConteudoDaVitrine, opcoes = {}): Promise<TelaVitrine> {
  const tela = new TelaVitrine(c, () => undefined, {
    animar: false,
    pedirQuadro: () => undefined,
    ...opcoes,
  });
  document.body.replaceChildren(tela.raiz);
  tela.mostrar();
  await tela.pronta;
  return tela;
}
const cena = (tela: TelaVitrine, id: string): HTMLElement =>
  tela.raiz.querySelector<HTMLElement>(`[data-cena="${id}"]`) ?? document.createElement("section");

describe("Requisito: Desenho real do dataset (spec vitrine-da-abertura)", () => {
  it("test_mesmo_desenho_nos_capitulos_do_desenho_cnn_e_lstm", async () => {
    const tela = await montada(conteudo());
    expect(cena(tela, "desenho").querySelectorAll(".traco-vitrine")).toHaveLength(2);
    expect(cena(tela, "lstm").querySelectorAll(".traco-vitrine")).toHaveLength(2);
    expect(cena(tela, "cnn").querySelector("[data-entrada=cnn]")).not.toBeNull();
  });

  it("test_credito_no_capitulo_do_desenho", async () => {
    const tela = await montada(conteudo());
    const credito = cena(tela, "desenho").querySelector("[data-parte=credito]")?.textContent ?? "";
    expect(credito).toContain("Quick, Draw!");
    expect(credito).toContain("CC BY 4.0");
  });
});

describe("Requisito: Palpites reais das redes (spec vitrine-da-abertura)", () => {
  it("test_palpite_com_o_desenho_completo_mostra_o_top3_da_cnn", async () => {
    const tela = await montada(conteudo());
    const barras = [...cena(tela, "cnn").querySelectorAll("[data-parte=barras-cnn] li")].map(
      (li) => li.textContent,
    );
    expect(barras).toEqual(["sol82%", "flor9%", "classe34%"]);
    const chutes = [...cena(tela, "lstm").querySelectorAll(".chute")].map((c) => c.textContent);
    expect(chutes).toEqual(["flor? 60%", "sol? 60%", "sol? 60%", "sol! 60%"]);
  });

  it("test_redes_indisponiveis_sem_nenhum_percentual", async () => {
    const tela = await montada(conteudo({ palpitesDe: () => Promise.resolve(undefined) }));
    expect(cena(tela, "cnn").querySelector("[data-parte=barras-cnn]")?.textContent).toBe("");
    expect(cena(tela, "lstm").querySelector(".saida-lstm")?.textContent).toBe("");
  });
});

describe("Requisito: Números lidos das métricas (spec vitrine-da-abertura)", () => {
  it("test_metrica_ausente_sem_contador_de_exemplos", async () => {
    const tela = await montada(conteudo());
    expect(cena(tela, "destilacao").querySelector("[data-parte=contador-de-exemplos]")).toBeNull();
  });

  it("test_com_a_metrica_o_contador_vai_ate_o_numero_do_dataset", async () => {
    const tela = await montada(conteudo({ resumo: { exemplosDoZe: 455 } }));
    const contador = cena(tela, "destilacao").querySelector<HTMLElement>("[data-ate]");
    expect(contador?.dataset.ate).toBe("455");
  });
});

describe("Requisito: Vitrine parada fora da tela (spec vitrine-da-abertura)", () => {
  it("test_partida_em_andamento_video_pausado_e_sem_novas_classificacoes", async () => {
    const c = conteudo();
    const tela = await montada(c);
    const pedidosAntes = c.pedidos;
    tela.esconder();
    tela.passo();
    for (const video of tela.raiz.querySelectorAll("video")) expect(video.paused).toBe(true);
    expect(c.pedidos).toBe(pedidosAntes);
  });
});

describe("Requisito: Movimento reduzido (spec vitrine-da-abertura)", () => {
  it("test_reduzir_movimento_ligado_corte_direto_sem_escala_e_sem_andar_sozinha", async () => {
    let agora = 0;
    const tela = await montada(conteudo(), { movimentoReduzido: true, agoraMs: () => agora });
    for (let i = 0; i < 700; i++) {
      agora += 16;
      tela.passo();
    }
    expect(tela.capitulo).toBe("abertura"); // 11 s parado e a história não andou
    window.dispatchEvent(new KeyboardEvent("keydown", { key: "PageDown" })); // um gesto = um capítulo
    for (let i = 0; i < 300; i++) {
      agora += 16;
      tela.passo();
    }
    expect(tela.capitulo).toBe("jogo");
    const visiveis = [...tela.raiz.querySelectorAll<HTMLElement>("[data-cena]")].filter(
      (c) => c.style.visibility === "visible",
    );
    expect(visiveis.map((c) => c.dataset.cena)).toEqual(["jogo"]);
    expect(visiveis[0]?.style.transform).toBe("");
    for (const video of tela.raiz.querySelectorAll("video")) expect(video.paused).toBe(true);
  });
});

describe("fundo da roça no jogo (tarefa 4.2)", () => {
  it("o vídeo existe e tem menos de 3 MB", () => {
    const video = resolve(import.meta.dirname, "..", "..", "..", "public", "vitrine", "fundo-roca-toon.mp4");
    expect(existsSync(video)).toBe(true);
    expect(statSync(video).size).toBeLessThan(3 * 1024 * 1024);
  });
});

describe("Requisito: Grade 28×28 é a entrada da CNN (spec vitrine-da-abertura)", () => {
  it("test_mesma_entrada_os_784_valores_da_grade_sao_os_que_a_cnn_recebe", async () => {
    const recebido: Float32Array[] = [];
    const cnn = {
      executar(valores: Float32Array): Promise<Float32Array> {
        recebido.push(valores);
        return Promise.resolve(new Float32Array(30).fill(1 / 30));
      },
    };
    const lstm = { executar: () => Promise.resolve(new Float32Array(30).fill(1 / 30)) };
    await new ClassificadorOnnx(cnn, lstm).classificar(SOL);
    const grade = entradaDaGrade(SOL);
    expect(grade).toHaveLength(784);
    grade.forEach((v, i) => {
      expect(Math.abs(v - (recebido[0]?.[i] ?? Number.NaN))).toBeLessThanOrEqual(1e-6);
    });
  });
});

describe("Requisito: Degradação em notebook lento (spec vitrine-da-abertura)", () => {
  it("test_taxa_baixa_no_meio_da_abertura_desfaz_a_animacao_e_o_titulo_fica_visivel", async () => {
    let agora = 0;
    let revertida = false;
    // Animação de mentira que, como o GSAP no meio da abertura, deixa as letras do título invisíveis
    // até ser revertida.
    const criarAnimacao = (cenas: Record<string, HTMLElement>): Promise<AnimacaoDaVitrine> => {
      const titulo = cenas.abertura?.querySelector<HTMLElement>(".titulo-vitrine");
      if (titulo) titulo.style.opacity = "0";
      return Promise.resolve({
        time: () => undefined,
        kill: () => undefined,
        revert: () => {
          revertida = true;
          if (titulo) titulo.style.opacity = "";
        },
      });
    };
    const tela = await montada(conteudo(), { animar: true, agoraMs: () => agora, criarAnimacao });
    await new Promise((resolver) => setTimeout(resolver, 0)); // a animação "carrega"
    for (let i = 0; i < 200; i++) {
      agora += 45; // 22 quadros por segundo, depois do aquecimento de 2 s
      tela.passo();
    }
    expect(revertida).toBe(true);
    const titulo = tela.raiz.querySelector<HTMLElement>(".titulo-vitrine");
    expect(titulo?.style.opacity).toBe("");
    expect(tela.capitulo).toBe("abertura");
    // em repouso a abertura mostra a mancha de tinta pronta (o título creme precisa dela por trás)
    const abertura = tela.raiz.querySelector('[data-cena="abertura"]');
    const gota = abertura?.querySelector('[data-parte="gota"]')?.getAttribute("d");
    expect(gota).toBe(abertura?.querySelector('[data-parte="forma-da-mancha"]')?.getAttribute("d"));
  });

  it("test_movimento_reduzido_abertura_ja_com_a_mancha_pronta", async () => {
    const tela = await montada(conteudo(), { movimentoReduzido: true });
    const abertura = tela.raiz.querySelector('[data-cena="abertura"]');
    const gota = abertura?.querySelector('[data-parte="gota"]')?.getAttribute("d");
    expect(gota).toBe(abertura?.querySelector('[data-parte="forma-da-mancha"]')?.getAttribute("d"));
  });
});

describe("Requisito: Transição por portal — detalhes no fundo de cada capítulo (spec vitrine-da-abertura)", () => {
  it("test_capitulos_depois_da_abertura_tem_rabiscos_desenhados_no_fundo", async () => {
    const tela = await montada(conteudo());
    for (const id of [
      "jogo",
      "desenho",
      "cnn",
      "lstm",
      "ze",
      "destilacao",
      "qlora",
      "quantizacao",
      "engenharia",
    ]) {
      const detalhes = tela.raiz.querySelector(`[data-cena="${id}"] [data-parte="detalhes"]`);
      expect(detalhes, id).not.toBeNull();
      expect(detalhes?.querySelectorAll("path").length, id).toBeGreaterThanOrEqual(6);
    }
  });
});

describe("Requisito: Movimento reduzido — números no valor final (spec vitrine-da-abertura)", () => {
  it("test_sem_animacao_o_contador_mostra_os_455_exemplos_e_nao_zero", async () => {
    const tela = await montada(conteudo({ resumo: { exemplosDoZe: 455 } }), { movimentoReduzido: true });
    tela.passo();
    expect(tela.raiz.querySelector("[data-ate]")?.textContent).toBe("455");
  });
});
