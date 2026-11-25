import type { EstadoDaConversa } from "../../application/conversa-com-o-ze";
import { botaoComIcone, comIcone } from "../icones";
import type { EstadoDaPartida } from "../../application/estado-da-partida";
import { limparNome } from "../../domain/rodada/pontuacao";
import { botao, criar } from "../dom";
import type { OpcoesDoPersonagem } from "../ze/personagem";
import type { PersonagemDoZe } from "../ze/personagem";
import { TelaPergunta } from "./tela-pergunta";
import type { ComandosDaConversa, ComandosDoJogo, Tela } from "./tela";

const TAMANHO_MAXIMO_DO_APELIDO = 16;
const MENSAGEM_DE_NOME_INVALIDO = "Escolha um apelido de 1 a 16 letras, sô!";
/** Sugestões que preenchem o apelido com um toque (spec `tela-de-abertura`). */
export const SUGESTOES_DE_APELIDO = ["Peão Veloz", "Rabisco de Ouro", "Lápis Ligeiro", "Traço Fino"];

/** Apelido: campo, sugestões, "Começar partida", "Ver placar" e, ao lado, o Pergunte ao Zé. */
export class TelaInicio implements Tela {
  readonly raiz: HTMLElement;
  private readonly campo = criar("input", { classe: "campo", dados: { campo: "apelido" } });
  private readonly erro = criar("p", { classe: "erro", dados: { texto: "erro" } });
  private readonly comecar: HTMLButtonElement;
  private readonly pergunta: TelaPergunta;
  private readonly aviso = criar("p", {
    classe: "aviso",
    texto: "Redes divergentes do treino: confira os arquivos dos modelos.",
    dados: { texto: "aviso-redes" },
  });

  constructor(
    private readonly comandos: ComandosDoJogo,
    conversa: ComandosDaConversa,
    aoVerPlacar: () => void,
    opcoesDoZe: OpcoesDoPersonagem = {},
  ) {
    this.pergunta = new TelaPergunta(conversa, opcoesDoZe);
    this.campo.maxLength = TAMANHO_MAXIMO_DO_APELIDO;
    this.campo.placeholder = "Ex.: Peão Veloz";
    this.campo.autocomplete = "off";
    this.campo.addEventListener("input", () => {
      this.liberarComecar();
    });
    this.campo.addEventListener("keydown", (evento) => {
      if (evento.key === "Enter" && !this.comecar.disabled) this.jogar();
    });
    this.aviso.hidden = true;
    this.comecar = botaoComIcone("jogar", "Começar partida", "jogar", () => {
      this.jogar();
    });
    this.comecar.classList.add("principal");
    const verPlacar = botaoComIcone("trofeu", "Ver placar", "ver-placar", aoVerPlacar);
    verPlacar.classList.add("secundario");
    const apelido = criar("div", { classe: "cartao apelido" }, [
      comIcone("chapeu", criar("h2", { texto: "Qual é o seu apelido?" })),
      this.campo,
      this.criarSugestoes(),
      criar("div", { classe: "linha" }, [this.comecar, verPlacar]),
      this.erro,
      criar("p", { classe: "dica", texto: "3 rodadas · acertou rápido vale mais · quase (top 3) vale 30" }),
      this.aviso,
    ]);
    this.raiz = criar("section", { classe: "tela tela-inicio", dados: { tela: "inicio" } }, [
      apelido,
      this.pergunta.raiz,
    ]);
    this.liberarComecar();
  }

  /** O Zé do Pergunte ao Zé, para o vigia do tédio. */
  get personagem(): PersonagemDoZe {
    return this.pergunta.personagem;
  }

  atualizar(estado: EstadoDaPartida): void {
    this.erro.textContent = estado.erro?.codigo === "nome_invalido" ? MENSAGEM_DE_NOME_INVALIDO : "";
    if (estado.nome === "" && estado.erro === undefined) this.campo.value = "";
    this.liberarComecar();
  }

  mostrarConversa(estado: EstadoDaConversa): void {
    this.pergunta.atualizar(estado);
  }

  focar(): void {
    this.campo.focus();
  }

  avisarRedesDivergentes(): void {
    this.aviso.hidden = false;
  }

  private criarSugestoes(): HTMLElement {
    return criar(
      "div",
      { classe: "sugestoes" },
      SUGESTOES_DE_APELIDO.map((sugestao) => {
        const chip = botao(sugestao, "sugestao-de-apelido", () => {
          this.campo.value = sugestao;
          this.liberarComecar();
        });
        chip.classList.add("chip");
        return chip;
      }),
    );
  }

  /** "Começar partida" só com nome válido pela regra de `pontuacao-e-placar`. */
  private liberarComecar(): void {
    this.comecar.disabled = !limparNome(this.campo.value).ok;
  }

  private jogar(): void {
    void this.comandos.comecar(this.campo.value);
  }
}
