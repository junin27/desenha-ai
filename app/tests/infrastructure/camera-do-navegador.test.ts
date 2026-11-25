// @vitest-environment happy-dom
import { describe, expect, it } from "vitest";
import {
  CameraDoNavegador,
  type DispositivosDeMidia,
} from "../../src/infrastructure/mao/camera-do-navegador";

class TrilhaFalsa {
  parada = false;
  stop(): void {
    this.parada = true;
  }
}

function dispositivos(resposta: "ok" | "negada" | "sem"): {
  midia: DispositivosDeMidia;
  trilha: TrilhaFalsa;
} {
  const trilha = new TrilhaFalsa();
  const midia: DispositivosDeMidia = {
    getUserMedia: () => {
      if (resposta === "negada") return Promise.reject(new DOMException("negado", "NotAllowedError"));
      if (resposta === "sem") return Promise.reject(new DOMException("sem câmera", "NotFoundError"));
      // MediaStream real (o DOM de teste só aceita ele no srcObject), com a trilha falsa
      const fluxo = new MediaStream();
      fluxo.getTracks = () => [trilha as unknown as MediaStreamTrack];
      return Promise.resolve(fluxo);
    },
  };
  return { midia, trilha };
}

describe("Requisito: Sem câmera, o jogo segue no Mouse (spec desenho-com-a-mao)", () => {
  it("test_permissao_negada_vira_erro_esperado_e_nao_excecao", async () => {
    const camera = new CameraDoNavegador(dispositivos("negada").midia);
    const resultado = await camera.ligar();
    expect(resultado.ok).toBe(false);
    if (!resultado.ok) expect(resultado.erro.codigo).toBe("permissao_negada");
  });

  it("test_sem_camera_vira_erro_sem_camera", async () => {
    const resultado = await new CameraDoNavegador(dispositivos("sem").midia).ligar();
    expect(!resultado.ok && resultado.erro.codigo).toBe("sem_camera");
  });

  it("test_navegador_sem_api_de_camera", async () => {
    const resultado = await new CameraDoNavegador(undefined).ligar();
    expect(!resultado.ok && resultado.erro.codigo).toBe("sem_camera");
  });
});

describe("Requisito: Câmera só no modo Mão", () => {
  it("test_desligar_para_as_trilhas_da_camera", async () => {
    const { midia, trilha } = dispositivos("ok");
    const camera = new CameraDoNavegador(midia);
    expect((await camera.ligar()).ok).toBe(true);
    camera.desligar();
    expect(trilha.parada).toBe(true);
    expect(camera.video.srcObject).toBeNull();
  });
});
