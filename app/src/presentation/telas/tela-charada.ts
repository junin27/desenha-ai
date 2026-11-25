import type { EstadoDaPartida } from "../../application/estado-da-partida";
import { RODADAS_POR_PARTIDA } from "../../domain/rodada/pontuacao";
import { botao, criar, mostrarSelo } from "../dom";
import { seloDaFala } from "../textos";
import { humorDaPartida } from "../ze/controle-de-humor";
import { PersonagemDoZe, type OpcoesDoPersonagem } from "../ze/personagem";
import type { ComandosDoJogo, Tela } from "./tela";

const TEXTO_ENQUANTO_GERA = "Pensando…";
const FALA_DA_CHARADA = "Escuta essa, sô:";

/** Charada: o Zé pensando ("Pensando…") enquanto gera, depois a charada validada e o botão para desenhar. */
export class TelaCharada implements Tela {
  readonly raiz: HTMLElement;
  private readonly rodada = criar("p", { classe: "rodada", dados: { texto: "rodada" } });
  private readonly pensando = criar("p", { classe: "ze-ao-vivo pensando", dados: { texto: "ze-ao-vivo" } });
  private readonly charada = criar("p", { classe: "charada", dados: { texto: "charada" } });
  private readonly selo = criar("p", { classe: "selo", dados: { texto: "selo" } });
  private readonly desenhar: HTMLButtonElement;
  private readonly ze: PersonagemDoZe;
  private charadaMostrada: string | undefined;

  constructor(comandos: ComandosDoJogo, opcoesDoZe: OpcoesDoPersonagem = {}) {
    this.ze = new PersonagemDoZe(opcoesDoZe);
    this.desenhar = botao("Desenhar!", "desenhar", () => {
      comandos.desenhar();
    });
    this.desenhar.classList.add("principal");
    this.raiz = criar("section", { classe: "tela tela-charada", dados: { tela: "charada" } }, [
      criar("div", { classe: "cartao cartao-da-charada" }, [
        this.rodada,
        this.ze.raiz,
        this.pensando,
        this.charada,
        this.selo,
        this.desenhar,
      ]),
    ]);
  }

  /** O Zé desta tela, para o vigia do tédio. */
  get personagem(): PersonagemDoZe {
    return this.ze;
  }

  atualizar(estado: EstadoDaPartida): void {
    this.rodada.textContent = `Rodada ${String(estado.rodada + 1)} de ${String(RODADAS_POR_PARTIDA)}`;
    const pronta = estado.charada !== undefined;
    this.pensando.hidden = pronta;
    // Sem a fala parcial: o raciocínio costuma citar a palavra secreta e a resposta ainda não passou pelo filtro
    // de vazamento (spec interface-do-jogo, "Charada sem vazamento durante a geração").
    this.pensando.textContent = TEXTO_ENQUANTO_GERA;
    this.charada.textContent = estado.charada?.texto ?? "";
    mostrarSelo(this.selo, estado.charada && seloDaFala(estado.charada.origem, estado.charada.modelo));
    this.desenhar.disabled = !pronta;
    if (estado.etapa === "charada") this.atualizarZe(estado);
  }

  private atualizarZe(estado: EstadoDaPartida): void {
    this.ze.mudarHumor(humorDaPartida(estado, { semTracos: false }));
    const texto = estado.charada?.texto;
    if (texto === this.charadaMostrada) return;
    this.charadaMostrada = texto;
    if (texto === undefined) this.ze.mostrarTexto("");
    else void this.ze.falar(FALA_DA_CHARADA);
  }
}
