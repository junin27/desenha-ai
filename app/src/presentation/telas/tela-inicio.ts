import type { EstadoDaPartida } from "../../application/estado-da-partida";
import { ordenarPlacar } from "../../domain/rodada/pontuacao";
import { botao, criar, preencherLista } from "../dom";
import type { ComandosDoJogo, InformacoesDoJogo, Tela } from "./tela";

const TAMANHO_MAXIMO_DO_APELIDO = 16;
const MENSAGEM_DE_NOME_INVALIDO = "Escolha um apelido de 1 a 16 letras, sô!";

/** Início: apelido, botão Jogar, placar e o aviso do autoteste das redes. */
export class TelaInicio implements Tela {
  readonly raiz: HTMLElement;
  private readonly campo = criar("input", { dados: { campo: "apelido" } });
  private readonly erro = criar("p", { classe: "erro", dados: { texto: "erro" } });
  private readonly placar = criar("ol", { classe: "placar", dados: { lista: "placar" } });
  private readonly aviso = criar("p", {
    classe: "aviso",
    texto: "Redes divergentes do treino: confira os arquivos dos modelos.",
    dados: { texto: "aviso-redes" },
  });

  constructor(
    private readonly comandos: ComandosDoJogo,
    private readonly informacoes: InformacoesDoJogo,
  ) {
    this.campo.maxLength = TAMANHO_MAXIMO_DO_APELIDO;
    this.campo.placeholder = "Seu apelido";
    this.campo.addEventListener("keydown", (evento) => {
      if (evento.key === "Enter") this.jogar();
    });
    this.aviso.hidden = true;
    const formulario = criar("div", { classe: "linha" }, [
      this.campo,
      botao("Jogar", "jogar", () => {
        this.jogar();
      }),
    ]);
    this.raiz = criar("section", { classe: "tela tela-inicio", dados: { tela: "inicio" } }, [
      criar("h1", { texto: "Desenha Aí, Sô!" }),
      criar("p", {
        classe: "subtitulo",
        texto: "Resolva a charada do Zé e desenhe a resposta: as redes tentam adivinhar!",
      }),
      this.aviso,
      formulario,
      this.erro,
      criar("h2", { texto: "Placar" }),
      this.placar,
    ]);
  }

  atualizar(estado: EstadoDaPartida): void {
    this.erro.textContent = estado.erro?.codigo === "nome_invalido" ? MENSAGEM_DE_NOME_INVALIDO : "";
    const partidas = ordenarPlacar(this.informacoes.lerPlacar());
    preencherLista(
      this.placar,
      partidas.map((partida) => `${partida.nome} — ${partida.pontos} pontos`),
    );
    if (estado.nome === "" && estado.erro === undefined) this.campo.value = "";
  }

  avisarRedesDivergentes(): void {
    this.aviso.hidden = false;
  }

  private jogar(): void {
    void this.comandos.comecar(this.campo.value);
  }
}
