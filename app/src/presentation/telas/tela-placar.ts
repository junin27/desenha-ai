import type { EstadoDaPartida } from "../../application/estado-da-partida";
import { botaoComIcone, comIcone } from "../icones";
import { listarPlacar, type LinhaDoPlacar, type OrdemDaLista } from "../../domain/rodada/listagem-do-placar";
import { ordemOficialDoPlacar, type PartidaNoPlacar } from "../../domain/rodada/pontuacao";
import { botao, criar } from "../dom";
import type { ComandosDoJogo, InformacoesDoJogo, Tela } from "./tela";

const TAMANHO_DO_PODIO = 5;
/** Ordem visual do pódio: 4º, 2º, 1º (centro, mais alto), 3º, 5º. */
const ORDEM_DOS_DEGRAUS = [4, 2, 1, 3, 5];
const ORDENS: readonly { readonly ordem: OrdemDaLista; readonly texto: string }[] = [
  { ordem: "pontos", texto: "Pontos" },
  { ordem: "nome", texto: "A–Z" },
  { ordem: "recentes", texto: "Recentes" },
];

/**
 * Placar: pódio das 5 melhores e a lista com pesquisa e ordenação (spec `placar-com-busca`). No fim da
 * partida mostra o total e a posição e destaca a linha de quem acabou de jogar.
 */
export class TelaPlacar implements Tela {
  readonly raiz: HTMLElement;
  private readonly podio = criar("div", { classe: "podio", dados: { parte: "podio" } });
  private readonly resumo = criar("div", { classe: "resumo-da-partida" });
  private readonly total = criar("p", { classe: "total", dados: { texto: "total" } });
  private readonly posicao = criar("p", { classe: "posicao", dados: { texto: "posicao" } });
  private readonly busca = criar("input", { classe: "campo", dados: { campo: "busca" } });
  private readonly lista = criar("ol", { classe: "lista-do-placar", dados: { lista: "placar" } });
  private readonly vazio = criar("p", { classe: "dica", dados: { texto: "placar-vazio" } });
  private readonly botoesDeOrdem: HTMLButtonElement[];
  private readonly jogarDeNovo: HTMLButtonElement;
  private ordem: OrdemDaLista = "pontos";
  private recemJogada: PartidaNoPlacar | undefined;

  constructor(
    comandos: ComandosDoJogo,
    private readonly informacoes: InformacoesDoJogo,
    aoVoltar: () => void,
  ) {
    this.busca.placeholder = "Pesquisar apelido";
    this.busca.autocomplete = "off";
    this.busca.addEventListener("input", () => {
      this.listar();
    });
    this.botoesDeOrdem = ORDENS.map(({ ordem, texto }) => {
      const elemento = botao(texto, "ordenar", () => {
        this.ordem = ordem;
        this.listar();
      });
      elemento.classList.add("ordem");
      elemento.dataset["ordem"] = ordem;
      return elemento;
    });
    this.jogarDeNovo = botaoComIcone("estrela", "Jogar de novo", "nova-partida", () => {
      comandos.novaPartida();
    });
    this.jogarDeNovo.classList.add("principal");
    const voltar = botaoComIcone("casinha", "Início", "voltar-do-placar", aoVoltar);
    voltar.classList.add("secundario");
    this.resumo.append(this.total, this.posicao);
    const tabela = criar("div", { classe: "cartao tabela-do-placar" }, [
      comIcone("trofeu", criar("h2", { texto: "Placar" })),
      this.resumo,
      criar("div", { classe: "controles" }, [this.busca, ...this.botoesDeOrdem]),
      this.lista,
      this.vazio,
      criar("div", { classe: "linha" }, [this.jogarDeNovo, voltar]),
    ]);
    const lado = criar("div", { classe: "lado-do-podio" }, [
      comIcone("estrela", criar("h2", { texto: "Top 5" })),
      this.podio,
    ]);
    this.raiz = criar("section", { classe: "tela tela-placar", dados: { tela: "placar" } }, [lado, tabela]);
  }

  atualizar(estado: EstadoDaPartida): void {
    const partidas = this.informacoes.lerPlacar();
    const noFim = estado.etapa === "fim";
    this.recemJogada = noFim ? partidaRecemJogada(partidas, estado) : undefined;
    this.resumo.hidden = !noFim;
    this.jogarDeNovo.hidden = !noFim;
    if (noFim) this.mostrarResumo(estado, partidas);
    this.busca.value = "";
    this.ordem = "pontos";
    this.desenharPodio(partidas);
    this.listar();
  }

  private mostrarResumo(estado: EstadoDaPartida, partidas: readonly PartidaNoPlacar[]): void {
    this.total.textContent = `${estado.nome}, você fez ${String(estado.total)} pontos`;
    const posicao =
      this.recemJogada === undefined
        ? undefined
        : ordemOficialDoPlacar(partidas).indexOf(this.recemJogada) + 1;
    this.posicao.textContent = posicao === undefined ? "" : `${String(posicao)}º lugar no placar`;
  }

  private desenharPodio(partidas: readonly PartidaNoPlacar[]): void {
    const melhores = ordemOficialDoPlacar(partidas).slice(0, TAMANHO_DO_PODIO);
    const degraus = ORDEM_DOS_DEGRAUS.flatMap((posicao) => {
      const partida = melhores[posicao - 1];
      return partida === undefined ? [] : [degrau(posicao, partida)];
    });
    this.podio.replaceChildren(...degraus);
  }

  private listar(): void {
    const linhas = listarPlacar(this.informacoes.lerPlacar(), {
      busca: this.busca.value,
      ordem: this.ordem,
      ...(this.recemJogada === undefined ? {} : { recemJogada: this.recemJogada }),
    });
    this.lista.replaceChildren(...linhas.map(itemDaLista));
    const procurado = this.busca.value.trim();
    this.vazio.hidden = linhas.length > 0;
    this.vazio.textContent =
      procurado === "" ? "Ninguém jogou ainda. Seja o primeiro!" : `Ninguém com "${procurado}" no placar.`;
    for (const elemento of this.botoesDeOrdem) {
      elemento.setAttribute("aria-pressed", String(elemento.dataset["ordem"] === this.ordem));
    }
    this.lista.querySelector("li.destaque")?.scrollIntoView({ block: "nearest" });
  }
}

/** A partida que acabou de terminar: mesmo nome e total, a de término mais recente. */
function partidaRecemJogada(
  partidas: readonly PartidaNoPlacar[],
  estado: EstadoDaPartida,
): PartidaNoPlacar | undefined {
  return partidas
    .filter((partida) => partida.nome === estado.nome && partida.pontos === estado.total)
    .reduce<PartidaNoPlacar | undefined>(
      (recente, partida) =>
        recente === undefined || partida.terminadaEmMs > recente.terminadaEmMs ? partida : recente,
      undefined,
    );
}

function degrau(posicao: number, partida: PartidaNoPlacar): HTMLElement {
  const elemento = criar(
    "div",
    { classe: posicao === 1 ? "degrau mais-alto" : "degrau", dados: { posicao: String(posicao) } },
    [
      criar("span", { classe: "medalha", texto: String(posicao) }),
      criar("span", { classe: "nome", texto: partida.nome }),
      criar("span", { classe: "pts", texto: String(partida.pontos) }),
    ],
  );
  elemento.style.setProperty("--ordem", String(posicao));
  return elemento;
}

function itemDaLista(linha: LinhaDoPlacar): HTMLLIElement {
  return criar("li", { classe: linha.destaque ? "linha-do-placar destaque" : "linha-do-placar" }, [
    criar("b", { texto: `${String(linha.posicao)}º` }),
    document.createTextNode(" "),
    criar("span", { texto: linha.partida.nome }),
    document.createTextNode(" "),
    criar("b", { texto: `${String(linha.partida.pontos)} pts` }),
  ]);
}
