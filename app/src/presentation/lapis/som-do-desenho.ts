import type { PonteiroQueGasta } from "./desgaste";

/** Quem produz o som de fato (Web Audio no navegador; um espião nos testes). */
export interface GeradorDeSom {
  /** Ruído contínuo filtrado: frequência central, "estreiteza" (Q) e volume de 0 a 1. */
  ajustarRuido(frequencia: number, q: number, volume: number): void;
  /** Som curto que desliza de uma frequência a outra. */
  tocarBip(inicio: number, fim: number, duracao: number, volume: number): void;
}

/** Distância percorrida (px) em que o traço soa no volume máximo. */
const VELOCIDADE_MAXIMA = 18;
const RUIDO = {
  lapis: { frequencia: 3200, extra: 1800, q: 1.4, volume: 0.25 },
  borracha: { frequencia: 650, extra: 400, q: 0.8, volume: 0.4 },
} as const;
const TOQUE = { lapis: [900, 300], borracha: [300, 120] } as const;

/**
 * Som do desenho (spec `lapis-no-quadro`, "Som do desenho"), gerado na hora: "toc" ao encostar, arranhado
 * agudo do lápis e esfregado grave da borracha com volume pela velocidade, silêncio ao parar.
 *
 * @example
 * const som = new SomDoDesenho(new GeradorWebAudio(), preferencias.somLigado());
 * som.arrastar("lapis", 12);
 */
export class SomDoDesenho {
  constructor(
    private readonly gerador: GeradorDeSom,
    private ligadoAgora: boolean,
  ) {}

  get ligado(): boolean {
    return this.ligadoAgora;
  }

  ligar(ligado: boolean): void {
    this.ligadoAgora = ligado;
    if (!ligado) this.parar();
  }

  encostar(ponteiro: PonteiroQueGasta): void {
    if (!this.ligadoAgora) return;
    const [inicio, fim] = TOQUE[ponteiro];
    this.gerador.tocarBip(inicio, fim, 0.08, 0.25);
  }

  arrastar(ponteiro: PonteiroQueGasta, distancia: number): void {
    if (!this.ligadoAgora) return;
    const forca = Math.min(1, distancia / VELOCIDADE_MAXIMA);
    const ruido = RUIDO[ponteiro];
    this.gerador.ajustarRuido(ruido.frequencia + forca * ruido.extra, ruido.q, ruido.volume * forca);
  }

  parar(): void {
    this.gerador.ajustarRuido(RUIDO.lapis.frequencia, RUIDO.lapis.q, 0);
  }

  balde(): void {
    if (this.ligadoAgora) this.gerador.tocarBip(500, 180, 0.18, 0.3);
  }

  contaGotas(): void {
    if (this.ligadoAgora) this.gerador.tocarBip(1200, 1600, 0.08, 0.2);
  }
}

/**
 * Gerador no navegador: ruído branco num filtro passa-banda e osciladores curtos. O `AudioContext` só é
 * criado no primeiro som, depois de um toque do visitante (regra dos navegadores para áudio).
 */
export class GeradorWebAudio implements GeradorDeSom {
  private audio: AudioContext | undefined;
  private filtro: BiquadFilterNode | undefined;
  private ganho: GainNode | undefined;

  ajustarRuido(frequencia: number, q: number, volume: number): void {
    const audio = this.preparar();
    if (audio === undefined || this.filtro === undefined || this.ganho === undefined) return;
    const agora = audio.currentTime;
    this.filtro.frequency.setTargetAtTime(frequencia, agora, 0.02);
    this.filtro.Q.setTargetAtTime(q, agora, 0.02);
    this.ganho.gain.setTargetAtTime(volume, agora, volume === 0 ? 0.05 : 0.03);
  }

  tocarBip(inicio: number, fim: number, duracao: number, volume: number): void {
    const audio = this.preparar();
    if (audio === undefined) return;
    const oscilador = audio.createOscillator();
    const ganho = audio.createGain();
    const agora = audio.currentTime;
    oscilador.type = "triangle";
    oscilador.frequency.setValueAtTime(inicio, agora);
    oscilador.frequency.exponentialRampToValueAtTime(fim, agora + duracao);
    ganho.gain.setValueAtTime(volume, agora);
    ganho.gain.exponentialRampToValueAtTime(0.001, agora + duracao + 0.02);
    oscilador.connect(ganho).connect(audio.destination);
    oscilador.start();
    oscilador.stop(agora + duracao + 0.05);
  }

  private preparar(): AudioContext | undefined {
    if (this.audio !== undefined) {
      void this.audio.resume();
      return this.audio;
    }
    if (typeof AudioContext === "undefined") return undefined; // ambiente sem áudio: o jogo segue mudo
    const audio = new AudioContext();
    const buffer = audio.createBuffer(1, audio.sampleRate * 2, audio.sampleRate);
    const dados = buffer.getChannelData(0);
    for (let i = 0; i < dados.length; i++) dados[i] = Math.random() * 2 - 1;
    const fonte = audio.createBufferSource();
    fonte.buffer = buffer;
    fonte.loop = true;
    this.filtro = audio.createBiquadFilter();
    this.filtro.type = "bandpass";
    this.ganho = audio.createGain();
    this.ganho.gain.value = 0;
    fonte.connect(this.filtro).connect(this.ganho).connect(audio.destination);
    fonte.start();
    this.audio = audio;
    return audio;
  }
}
