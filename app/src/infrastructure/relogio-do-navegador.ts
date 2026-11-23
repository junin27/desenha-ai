import type { Cancelamento, Relogio } from "../application/portas";

/**
 * Relógio real: `Date.now()` (o placar grava o horário de término), `performance.now()` para medir
 * durações (não volta no tempo se o relógio do sistema for ajustado) e `setInterval`.
 */
export class RelogioDoNavegador implements Relogio {
  agora(): number {
    return Date.now();
  }

  instante(): number {
    return performance.now();
  }

  aCada(milissegundos: number, tarefa: () => void): Cancelamento {
    const identificador = setInterval(tarefa, milissegundos);
    return () => {
      clearInterval(identificador);
    };
  }
}
