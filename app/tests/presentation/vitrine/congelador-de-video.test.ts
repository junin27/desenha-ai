// @vitest-environment happy-dom
import { describe, expect, it } from "vitest";
import { CongeladorDeVideo } from "../../../src/presentation/vitrine/congelador-de-video";

function cenaComVideo(): { cena: HTMLElement; video: HTMLVideoElement } {
  const cena = document.createElement("section");
  const video = document.createElement("video");
  video.className = "fundo-video";
  cena.append(video);
  return { cena, video };
}

describe("Portal sem travar: vídeo vira imagem parada durante o zoom (D1b do design vitrine-viva)", () => {
  it("test_congelar_esconde_o_video_e_mostra_o_quadro_atual_como_imagem", () => {
    const { cena, video } = cenaComVideo();
    const congelador = new CongeladorDeVideo(cena, () => "data:image/jpeg;base64,AAAA");
    congelador.congelar();
    const imagem = cena.querySelector("img");
    expect(video.style.visibility).toBe("hidden");
    expect(imagem?.className).toBe("fundo-video");
    expect(imagem?.getAttribute("src")).toBe("data:image/jpeg;base64,AAAA");
  });

  it("test_soltar_volta_o_video_e_some_com_a_imagem", () => {
    const { cena, video } = cenaComVideo();
    const congelador = new CongeladorDeVideo(cena, () => "data:image/jpeg;base64,AAAA");
    congelador.congelar();
    congelador.soltar();
    expect(video.style.visibility).toBe("");
    expect(cena.querySelector("img")).toBeNull();
  });

  it("test_congelar_duas_vezes_nao_captura_de_novo", () => {
    const { cena } = cenaComVideo();
    let capturas = 0;
    const congelador = new CongeladorDeVideo(cena, () => {
      capturas++;
      return "data:,";
    });
    congelador.congelar();
    congelador.congelar();
    expect(capturas).toBe(1);
    expect(cena.querySelectorAll("img")).toHaveLength(1);
  });

  it("test_sem_quadro_disponivel_o_video_continua_como_esta", () => {
    const { cena, video } = cenaComVideo();
    new CongeladorDeVideo(cena, () => undefined).congelar();
    expect(video.style.visibility).toBe("");
    expect(cena.querySelector("img")).toBeNull();
  });
});
