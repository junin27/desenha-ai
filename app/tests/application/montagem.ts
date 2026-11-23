import {
  ClassificadorControlado,
  ClassificadorFalso,
  NarradorFalso,
  PlacarEmMemoria,
  RelogioFalso,
  ReservaFalsa,
  SorteadorFixo,
  TOTAL_DE_CATEGORIAS,
} from "./dubles";
import { Partida } from "../../src/application/partida";
import type { Etapa } from "../../src/application/estado-da-partida";

export const CATEGORIAS = Array.from({ length: TOTAL_DE_CATEGORIAS }, (_, i) => `categoria${i}`);
CATEGORIAS[0] = "vaca";
CATEGORIAS[1] = "cavalo";
CATEGORIAS[2] = "porco";
export const PESO_DA_CNN = 0.6;

export interface PartidaDeTeste {
  readonly partida: Partida;
  readonly classificador: ClassificadorFalso;
  readonly classificadorControlado: ClassificadorControlado;
  readonly narrador: NarradorFalso;
  readonly placar: PlacarEmMemoria;
  readonly relogio: RelogioFalso;
  readonly etapas: Etapa[];
}

/** Partida com dublês; as categorias saem na ordem 0, 1, 2 (vaca, cavalo, porco) salvo outra ordem. */
export function montarPartida(
  ordemDoSorteio: readonly number[] = [0, 1, 2],
  comClassificadorControlado = false,
): PartidaDeTeste {
  const classificadorControlado = new ClassificadorControlado();
  const classificador = new ClassificadorFalso();
  const dubles = {
    classificador,
    narrador: new NarradorFalso(),
    placar: new PlacarEmMemoria(),
    relogio: new RelogioFalso(),
  };
  const partida = new Partida(
    {
      ...dubles,
      classificador: comClassificadorControlado ? classificadorControlado : classificador,
      sorteador: new SorteadorFixo(ordemDoSorteio),
      reserva: new ReservaFalsa(),
    },
    { categorias: CATEGORIAS, pesoDaCnn: PESO_DA_CNN },
  );
  const etapas: Etapa[] = [partida.estado.etapa];
  partida.aoMudar((estado) => {
    if (etapas.at(-1) !== estado.etapa) etapas.push(estado.etapa);
  });
  return { partida, ...dubles, classificadorControlado, etapas };
}
