import type { EstadoDaConversa } from "../../application/conversa-com-o-ze";
import { botao, criar, mostrarSelo } from "../dom";
import { falaAoVivoNaTela, seloDaFala } from "../textos";
import { PersonagemDoZe, type OpcoesDoPersonagem } from "../ze/personagem";
import type { ComandosDaConversa } from "./tela";

const TAMANHO_MAXIMO_DA_PERGUNTA = 200;
const MENSAGEM_DE_PERGUNTA_INVALIDA = "Escreva uma pergunta de 1 a 200 letras, sô!";
/** Perguntas prontas: o visitante toca e o Zé responde (spec `tela-de-abertura`). */
export const PERGUNTAS_PRONTAS = ["Como as redes adivinham?", "Você usa internet?", "Quem te ensinou?"];

/**
 * "Pergunte ao Zé" como painel da tela de apelido: perguntas prontas, campo, raciocínio ao vivo e
 * resposta, com o Zé pensando enquanto o SLM gera (specs `pergunte-ao-ze` e `personagem-do-ze`).
 */
export class TelaPergunta {
  readonly raiz: HTMLElement;
  private readonly campo = criar("textarea", { dados: { campo: "pergunta" } });
  private readonly perguntar: HTMLButtonElement;
  private readonly aoVivo = criar("p", { classe: "ze-ao-vivo", dados: { texto: "ze-pergunta-ao-vivo" } });
  /** Texto da resposta (oculto: quem mostra é o balão do Zé). */
  private readonly resposta = criar("p", { classe: "resposta", dados: { texto: "resposta" } });
  private readonly erro = criar("p", { classe: "erro", dados: { texto: "erro-pergunta" } });
  private readonly selo = criar("p", { classe: "selo", dados: { texto: "selo" } });
  private readonly ze: PersonagemDoZe;
  readonly rodape = criar("div", { classe: "linha" });

  constructor(
    private readonly conversa: ComandosDaConversa,
    opcoesDoZe: OpcoesDoPersonagem = {},
  ) {
    this.ze = new PersonagemDoZe(opcoesDoZe);
    this.resposta.hidden = true;
    this.ze.mostrarTexto("Ô de casa! Pergunta o que quiser sobre como eu e as redes funcionamos.");
    this.campo.maxLength = TAMANHO_MAXIMO_DA_PERGUNTA;
    this.campo.rows = 1;
    this.campo.placeholder = "Pergunte qualquer coisa ao Zé…";
    this.perguntar = botao("Enviar", "perguntar", () => {
      this.enviar(this.campo.value);
    });
    this.rodape.append(this.campo, this.perguntar);
    const prontas = criar(
      "div",
      { classe: "sugestoes" },
      PERGUNTAS_PRONTAS.map((pergunta) => {
        const chip = botao(pergunta, "pergunta-pronta", () => {
          this.campo.value = pergunta;
          this.enviar(pergunta);
        });
        chip.classList.add("chip");
        return chip;
      }),
    );
    this.raiz = criar("div", { classe: "cartao conversa", dados: { parte: "pergunte-ao-ze" } }, [
      criar("h2", { texto: "Pergunte ao Zé" }),
      this.ze.raiz,
      this.aoVivo,
      this.resposta,
      this.selo,
      prontas,
      this.rodape,
      this.erro,
    ]);
  }

  /** O Zé deste painel, para o vigia do tédio. */
  get personagem(): PersonagemDoZe {
    return this.ze;
  }

  atualizar(estado: EstadoDaConversa): void {
    this.perguntar.disabled = estado.respondendo;
    this.aoVivo.hidden = !estado.respondendo;
    this.aoVivo.textContent = falaAoVivoNaTela(estado.falaAoVivo) || "Pensando…";
    this.falarResposta(estado.resposta?.texto ?? "");
    mostrarSelo(this.selo, estado.resposta && seloDaFala(estado.resposta.origem, estado.resposta.modelo));
    this.erro.textContent = estado.erro === undefined ? "" : MENSAGEM_DE_PERGUNTA_INVALIDA;
    if (estado.respondendo) this.ze.mudarHumor("pensando");
    else this.ze.mudarHumor("neutro");
    if (!estado.aberta) this.campo.value = "";
  }

  /** A resposta nova sai no balão do Zé, falando; o parágrafo guarda o texto para a voz e os testes. */
  private falarResposta(texto: string): void {
    if (texto === this.resposta.textContent) return;
    this.resposta.textContent = texto;
    if (texto !== "") void this.ze.falar(texto);
  }

  private enviar(pergunta: string): void {
    void this.conversa.perguntar(pergunta);
  }
}
