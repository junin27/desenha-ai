// @vitest-environment happy-dom
import { beforeEach, describe, expect, it } from "vitest";
import type { CameraDoEstande, DetectorDeMao, ErroDaCamera } from "../../../src/application/portas";
import { ESTADO_INICIAL, type EstadoDaPartida } from "../../../src/application/estado-da-partida";
import { falha, ok, type Resultado } from "../../../src/domain/resultado";
import type { GeradorDeSom } from "../../../src/presentation/lapis/som-do-desenho";
import { ModoDeDesenhoAtual, SeletorDeModo } from "../../../src/presentation/mao/seletor-de-modo";
import { TelaDesenho } from "../../../src/presentation/telas/tela-desenho";
import { CATEGORIAS } from "../../application/montagem";
import { ComandosEspioes } from "../comandos-espioes";

class CameraFalsa implements CameraDoEstande {
  ligada = false;
  ligacoes = 0;
  constructor(private readonly resposta: Resultado<void, ErroDaCamera> = ok(undefined)) {}
  ligar(): Promise<Resultado<void, ErroDaCamera>> {
    this.ligacoes += 1;
    this.ligada = this.resposta.ok;
    return Promise.resolve(this.resposta);
  }
  desligar(): void {
    this.ligada = false;
  }
}

const semMao: DetectorDeMao = { detectar: () => undefined };
const somMudo: GeradorDeSom = { ajustarRuido: () => undefined, tocarBip: () => undefined };
const esperarTudo = (): Promise<void> => new Promise((resolver) => setTimeout(resolver, 0));

let camera: CameraFalsa;
let modo: ModoDeDesenhoAtual;
let modosGravados: string[];
let tela: TelaDesenho;
let comandos: ComandosEspioes;

function estado(alteracao: Partial<EstadoDaPartida> = {}): EstadoDaPartida {
  return { ...ESTADO_INICIAL, nome: "Ana", categorias: [0, 1, 2], etapa: "desenhando", ...alteracao };
}

function montar(resposta?: Resultado<void, ErroDaCamera>): void {
  camera = new CameraFalsa(resposta);
  modosGravados = [];
  modo = new ModoDeDesenhoAtual("mouse", (novo) => modosGravados.push(novo));
  comandos = new ComandosEspioes();
  tela = new TelaDesenho(
    comandos,
    { nomesDasCategorias: CATEGORIAS, lerPlacar: () => [] },
    {
      esperar: () => Promise.resolve(),
      gerador: somMudo,
      modo,
      mao: {
        camera,
        video: document.createElement("video"),
        criarDetector: () => Promise.resolve(ok(semMao)),
      },
    },
  );
  document.body.replaceChildren(tela.raiz);
}

beforeEach(() => {
  montar();
});

describe("Requisito: Modo de desenho (spec desenho-com-a-mao)", () => {
  it("test_seletor_mostra_o_modo_e_troca", () => {
    const seletor = new SeletorDeModo(modo);
    expect(seletor.raiz.querySelector("[data-modo=mouse]")?.getAttribute("aria-pressed")).toBe("true");
    seletor.raiz.querySelector<HTMLButtonElement>("[data-modo=mao]")?.click();
    expect(modo.valor).toBe("mao");
    expect(modosGravados).toEqual(["mao"]);
    expect(seletor.raiz.querySelector("[data-modo=mao]")?.getAttribute("aria-pressed")).toBe("true");
  });

  it("test_tela_de_desenho_tem_o_seletor", () => {
    expect(tela.raiz.querySelector("[data-modo=mao]")).not.toBeNull();
  });
});

describe("Requisito: Câmera só no modo Mão", () => {
  it("test_modo_mouse_nao_liga_a_camera", async () => {
    tela.atualizar(estado());
    await esperarTudo();
    expect(camera.ligacoes).toBe(0);
  });

  it("test_mao_no_desenho_liga_e_ao_sair_desliga", async () => {
    modo.mudar("mao");
    tela.atualizar(estado());
    await esperarTudo();
    expect(camera.ligada).toBe(true);
    expect(tela.raiz.querySelector<HTMLElement>("[data-parte=miniatura]")?.hidden).toBe(false);
    tela.atualizar(estado({ etapa: "julgando" }));
    expect(camera.ligada).toBe(false);
  });

  it("test_voltar_para_mouse_desliga_a_camera", async () => {
    modo.mudar("mao");
    tela.atualizar(estado());
    await esperarTudo();
    modo.mudar("mouse");
    expect(camera.ligada).toBe(false);
    expect(tela.raiz.querySelector<HTMLElement>("[data-parte=miniatura]")?.hidden).toBe(true);
  });
});

describe("Requisito: Sem câmera, o jogo segue no Mouse", () => {
  it("test_permissao_negada_avisa_e_volta_ao_mouse", async () => {
    montar(falha({ codigo: "permissao_negada", detalhe: "negado" }));
    modo.mudar("mao");
    tela.atualizar(estado());
    await esperarTudo();
    expect(modo.valor).toBe("mouse");
    expect(tela.raiz.querySelector("[data-texto=aviso-camera]")?.textContent).toBe(
      "Câmera indisponível: desenhe com o mouse",
    );
  });
});

describe("Requisito: Troca de modo durante o desenho", () => {
  it("test_trocar_no_meio_nao_apaga_nem_reinicia", async () => {
    tela.atualizar(estado({ segundosRestantes: 12 }));
    const canvas = tela.raiz.querySelector("canvas.quadro");
    canvas?.dispatchEvent(new PointerEvent("pointerdown", { clientX: 10, clientY: 10, pointerId: 1 }));
    canvas?.dispatchEvent(new PointerEvent("pointerup", { clientX: 50, clientY: 50, pointerId: 1 }));
    modo.mudar("mao");
    await esperarTudo();
    expect(tela.tracos).toHaveLength(1);
    expect(comandos.chamadas).not.toContain("limpar");
  });
});
