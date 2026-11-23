import type { Desenho } from "../../src/domain/desenho/desenho";
import type { ComandosDoJogo } from "../../src/presentation/interface-do-jogo";

/** Registra os comandos que a tela chamou, na ordem. */
export class ComandosEspioes implements ComandosDoJogo {
  readonly chamadas: string[] = [];
  readonly desenhos: Desenho[] = [];

  comecar(nome: string): Promise<void> {
    this.chamadas.push(`comecar:${nome}`);
    return Promise.resolve();
  }
  desenhar(): void {
    this.chamadas.push("desenhar");
  }
  registrarTraco(desenho: Desenho, tracoTerminado: boolean): Promise<void> {
    this.desenhos.push(desenho);
    this.chamadas.push(`traco:${tracoTerminado}`);
    return Promise.resolve();
  }
  limparDesenho(): void {
    this.chamadas.push("limpar");
  }
  pronto(): Promise<void> {
    this.chamadas.push("pronto");
    return Promise.resolve();
  }
  proximaRodada(): Promise<void> {
    this.chamadas.push("proxima");
    return Promise.resolve();
  }
  novaPartida(): void {
    this.chamadas.push("nova");
  }
}
