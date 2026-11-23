import type { ConversaComOZe, EstadoDaConversa } from "./conversa-com-o-ze";
import type { EstadoDaPartida } from "./estado-da-partida";
import type { Partida } from "./partida";
import type { Cancelamento, PreferenciasDoEstande, VozDoZe } from "./portas";

/**
 * Decide o que o Zé fala em voz alta (D3 do design da bancada-do-ze): só textos finais (charada,
 * narração, resposta), uma vez cada, comparando o retrato anterior com o novo. Mudou a tela, cala
 * antes de qualquer fala nova; por isso deve assinar a partida antes da tela.
 *
 * @example
 * const leitor = new LeitorEmVoz(voz, preferencias);
 * leitor.acompanharPartida(partida); // antes de ligar a tela
 */
export class LeitorEmVoz {
  private estaLigada: boolean;
  private readonly ouvintes = new Set<() => void>();

  constructor(
    private readonly voz: VozDoZe,
    private readonly preferencias: PreferenciasDoEstande,
  ) {
    this.estaLigada = preferencias.vozLigada() ?? true;
    voz.aoMudarDisponibilidade(() => {
      this.avisar();
    });
  }

  get ligada(): boolean {
    return this.estaLigada;
  }

  get disponivel(): boolean {
    return this.voz.disponivel();
  }

  aoMudar(ouvinte: () => void): Cancelamento {
    this.ouvintes.add(ouvinte);
    return () => this.ouvintes.delete(ouvinte);
  }

  /** Botão liga/desliga: desligar cala na hora; a escolha fica gravada no navegador. */
  alternar(): void {
    this.estaLigada = !this.estaLigada;
    this.preferencias.gravarVozLigada(this.estaLigada);
    if (!this.estaLigada) this.voz.calar();
    this.avisar();
  }

  acompanharPartida(partida: Partida): Cancelamento {
    let anterior = partida.estado;
    return partida.aoMudar((atual) => {
      this.lerPartida(anterior, atual);
      anterior = atual;
    });
  }

  acompanharConversa(conversa: ConversaComOZe): Cancelamento {
    let anterior = conversa.estado;
    return conversa.aoMudar((atual) => {
      this.lerConversa(anterior, atual);
      anterior = atual;
    });
  }

  private lerPartida(anterior: EstadoDaPartida, atual: EstadoDaPartida): void {
    if (anterior.etapa !== atual.etapa) this.voz.calar();
    if (anterior.charada === undefined && atual.charada !== undefined) this.falar(atual.charada.texto);
    if (atual.resultados.length > anterior.resultados.length) this.falar(atual.resultados.at(-1)?.narracao);
  }

  private lerConversa(anterior: EstadoDaConversa, atual: EstadoDaConversa): void {
    if (anterior.aberta !== atual.aberta) this.voz.calar();
    if (anterior.resposta === undefined && atual.resposta !== undefined) this.falar(atual.resposta.texto);
  }

  private falar(texto: string | undefined): void {
    if (this.estaLigada && this.voz.disponivel() && texto !== undefined) this.voz.falar(texto);
  }

  private avisar(): void {
    for (const ouvinte of this.ouvintes) ouvinte();
  }
}
