import type { EstadoDaConversa } from "../../application/conversa-com-o-ze";
import { botao, criar } from "../dom";
import { falaAoVivoNaTela, seloDaFala } from "../textos";
import type { ComandosDaConversa } from "./tela";

const TAMANHO_MAXIMO_DA_PERGUNTA = 200;
const MENSAGEM_DE_PERGUNTA_INVALIDA = "Escreva uma pergunta de 1 a 200 letras, sô!";

/** "Pergunte ao Zé": campo, botão Perguntar, raciocínio ao vivo, resposta e Voltar. */
export class TelaPergunta {
  readonly raiz: HTMLElement;
  private readonly campo = criar("textarea", { dados: { campo: "pergunta" } });
  private readonly perguntar: HTMLButtonElement;
  private readonly aoVivo = criar("p", { classe: "ze-ao-vivo", dados: { texto: "ze-pergunta-ao-vivo" } });
  private readonly resposta = criar("p", { classe: "resposta", dados: { texto: "resposta" } });
  private readonly erro = criar("p", { classe: "erro", dados: { texto: "erro-pergunta" } });
  private readonly selo = criar("p", { classe: "selo", dados: { texto: "selo" } });
  readonly rodape = criar("div", { classe: "linha" });

  constructor(conversa: ComandosDaConversa) {
    this.campo.maxLength = TAMANHO_MAXIMO_DA_PERGUNTA;
    this.campo.rows = 2;
    this.campo.placeholder = "Pergunte qualquer coisa ao Zé…";
    this.perguntar = botao("Perguntar", "perguntar", () => void conversa.perguntar(this.campo.value));
    this.rodape.append(
      this.perguntar,
      botao("Voltar", "voltar", () => {
        conversa.voltar();
      }),
    );
    this.raiz = criar("section", { classe: "tela tela-pergunta", dados: { tela: "pergunta" } }, [
      criar("h2", { texto: "Pergunte ao Zé do Rabisco" }),
      this.campo,
      this.rodape,
      this.erro,
      this.aoVivo,
      this.resposta,
      this.selo,
    ]);
  }

  atualizar(estado: EstadoDaConversa): void {
    this.perguntar.disabled = estado.respondendo;
    this.aoVivo.hidden = !estado.respondendo;
    this.aoVivo.textContent = falaAoVivoNaTela(estado.falaAoVivo) || "Pensando…";
    this.resposta.textContent = estado.resposta?.texto ?? "";
    this.selo.hidden = estado.resposta === undefined;
    if (estado.resposta !== undefined) {
      this.selo.textContent = seloDaFala(estado.resposta.origem, estado.resposta.modelo);
    }
    this.erro.textContent = estado.erro === undefined ? "" : MENSAGEM_DE_PERGUNTA_INVALIDA;
    if (!estado.aberta) this.campo.value = "";
  }
}
