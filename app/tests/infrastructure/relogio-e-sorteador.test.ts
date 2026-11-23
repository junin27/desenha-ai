import { afterEach, describe, expect, it, vi } from "vitest";
import { RelogioDoNavegador } from "../../src/infrastructure/relogio-do-navegador";
import { SorteadorAleatorio } from "../../src/infrastructure/sorteador-aleatorio";

afterEach(() => {
  vi.useRealTimers();
});

describe("relógio do navegador", () => {
  it("agora é o horário do sistema em milissegundos", () => {
    vi.useFakeTimers({ now: 1_700_000_000_000 });
    expect(new RelogioDoNavegador().agora()).toBe(1_700_000_000_000);
  });

  it("instante é o relógio monotônico de alta precisão (performance.now), não o horário", () => {
    vi.spyOn(performance, "now").mockReturnValue(1234.5);
    expect(new RelogioDoNavegador().instante()).toBe(1234.5);
    vi.restoreAllMocks();
  });

  it("aCada repete a tarefa no intervalo até ser cancelada", () => {
    vi.useFakeTimers();
    const disparos: number[] = [];
    const cancelar = new RelogioDoNavegador().aCada(100, () => disparos.push(1));
    vi.advanceTimersByTime(350);
    cancelar();
    vi.advanceTimersByTime(500);
    expect(disparos).toHaveLength(3);
  });
});

describe("sorteador aleatório", () => {
  it("devolve uma permutação da lista, sem perder nem repetir itens", () => {
    const lista = Array.from({ length: 30 }, (_, i) => i);
    const embaralhada = new SorteadorAleatorio().embaralhar(lista);
    expect([...embaralhada].sort((a, b) => a - b)).toEqual(lista);
  });

  it("não altera a lista recebida", () => {
    const lista = [1, 2, 3];
    new SorteadorAleatorio(() => 0).embaralhar(lista);
    expect(lista).toEqual([1, 2, 3]);
  });

  it("com o gerador fixo em 0, o embaralhamento é determinístico (Fisher-Yates)", () => {
    expect(new SorteadorAleatorio(() => 0).embaralhar(["a", "b", "c"])).toEqual(["b", "c", "a"]);
  });
});
