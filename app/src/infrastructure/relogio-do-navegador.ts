import type { Cancelamento, Relogio } from "../application/portas";

/** Relógio real: `Date.now()` (o placar grava o horário de término) e `setInterval`. */
export class RelogioDoNavegador implements Relogio {
  agora(): number {
    return Date.now();
  }

  aCada(milissegundos: number, tarefa: () => void): Cancelamento {
    const identificador = setInterval(tarefa, milissegundos);
    return () => {
      clearInterval(identificador);
    };
  }
}
