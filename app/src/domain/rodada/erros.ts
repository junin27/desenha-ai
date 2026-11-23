/** Erros esperados das regras do jogo (espelha os códigos de `desenha_ml.resultado`). */
export interface ErroDeRegra {
  readonly codigo:
    "probabilidades_invalidas" | "peso_invalido" | "k_invalido" | "alvo_invalido" | "nome_invalido";
  readonly detalhe: string;
}
