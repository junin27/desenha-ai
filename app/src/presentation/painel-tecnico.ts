import type { ContagemDoModelo, RetratoDasMedicoes } from "../application/medicoes-da-sessao";
import type { MetricasDasRedes, MetricasDoSlm } from "../application/metricas-do-treino";
import type { Cancelamento, ModeloDoZe } from "../application/portas";
import { botao, criar, preencherLista } from "./dom";
import {
  linhasDasMetricasDoSlm,
  NOME_DO_MODELO,
  SEM_DADO,
  textoDaFala,
  textoDaParidade,
  textoDasMetricasDasRedes,
  textoDasRedes,
} from "./formato-do-painel";

/** O que o painel lê (a aplicação fornece `MedicoesDaSessao` e `NarradorAlternavel`). */
export interface FontesDoPainel {
  readonly medicoes: {
    readonly retrato: RetratoDasMedicoes;
    aoMudar(ouvinte: (retrato: RetratoDasMedicoes) => void): Cancelamento;
  };
  readonly narrador: { readonly escolhido: ModeloDoZe; escolher(modelo: ModeloDoZe): void };
  readonly metricasDasRedes: MetricasDasRedes | undefined;
  readonly metricasDoSlm: MetricasDoSlm | undefined;
}

const TECLA_DO_PAINEL = "F2"; // Ctrl+Shift+B abre os favoritos no Chrome e no Edge (D5 do design)
const MODELOS: readonly ModeloDoZe[] = ["destilado", "base"];
const CONTADORES = [
  ["falasDoZe", "Zé"],
  ["reservas", "Reserva"],
  ["discordancias", "Discordou"],
  ["narrador_indisponivel", "Desligado"],
  ["narrador_lento", "Lento"],
] as const;

/**
 * Bastidores para a banca (spec `painel-tecnico`): camada sobreposta, alternada pelo botão e por F2,
 * que não pausa a partida. Traz a chave base × destilado e as medições ao vivo.
 *
 * @example
 * const painel = new PainelTecnico({ medicoes, narrador, metricasDasRedes, metricasDoSlm });
 * document.body.append(painel.raiz, painel.botao);
 */
export class PainelTecnico {
  readonly raiz: HTMLElement;
  readonly botao: HTMLButtonElement;
  private readonly redes = criar("p", { dados: { texto: "redes" } });
  private readonly paridade = criar("p", { dados: { texto: "paridade" } });
  private readonly ultimaFala = criar("p", { dados: { texto: "ultima-fala" } });
  private readonly contadores = criar("table", { classe: "contadores" });
  private readonly chave: Readonly<Record<ModeloDoZe, HTMLButtonElement>>;

  constructor(private readonly fontes: FontesDoPainel) {
    this.botao = botao("Bastidores", "bastidores", () => {
      this.alternar();
    });
    this.chave = {
      destilado: botao(NOME_DO_MODELO.destilado, "modelo-destilado", () => {
        this.escolher("destilado");
      }),
      base: botao(NOME_DO_MODELO.base, "modelo-base", () => {
        this.escolher("base");
      }),
    };
    this.raiz = criar("aside", { classe: "painel", dados: { painel: "tecnico" } }, [
      criar("h2", { texto: "Bastidores" }),
      criar("h3", { texto: "Quem narra" }),
      criar("div", { classe: "linha" }, [this.chave.destilado, this.chave.base]),
      criar("h3", { texto: "Última fala do Zé" }),
      this.ultimaFala,
      this.contadores,
      criar("h3", { texto: "Redes no navegador" }),
      this.redes,
      this.paridade,
      ...this.secoesDoTreino(),
    ]);
    this.raiz.hidden = true;
    fontes.medicoes.aoMudar((retrato) => {
      this.mostrar(retrato);
    });
    this.mostrar(fontes.medicoes.retrato);
    this.marcarEscolha();
  }

  alternar(): void {
    this.raiz.hidden = !this.raiz.hidden;
  }

  instalarAtalho(alvo: Document): void {
    alvo.addEventListener("keydown", (evento) => {
      if (evento.key !== TECLA_DO_PAINEL) return;
      evento.preventDefault();
      this.alternar();
    });
  }

  private secoesDoTreino(): HTMLElement[] {
    const slm = criar("ul", { dados: { texto: "metricas-slm" } });
    const linhas = linhasDasMetricasDoSlm(this.fontes.metricasDoSlm);
    if (linhas.length === 0) slm.textContent = SEM_DADO;
    else preencherLista(slm, linhas);
    return [
      criar("h3", { texto: "Treino" }),
      criar("p", {
        texto: textoDasMetricasDasRedes(this.fontes.metricasDasRedes),
        dados: { texto: "metricas-redes" },
      }),
      slm,
    ];
  }

  private mostrar(retrato: RetratoDasMedicoes): void {
    this.redes.textContent = textoDasRedes(retrato.redes);
    this.paridade.textContent = `Paridade: ${textoDaParidade(retrato.paridade)}`;
    this.ultimaFala.textContent = textoDaFala(retrato.ultimaFala);
    this.contadores.replaceChildren(
      cabecalho(),
      ...MODELOS.map((modelo) => linhaDoModelo(modelo, retrato.porModelo[modelo])),
    );
  }

  private escolher(modelo: ModeloDoZe): void {
    this.fontes.narrador.escolher(modelo);
    this.marcarEscolha();
  }

  private marcarEscolha(): void {
    for (const modelo of MODELOS) {
      this.chave[modelo].setAttribute("aria-pressed", String(this.fontes.narrador.escolhido === modelo));
    }
  }
}

function cabecalho(): HTMLTableRowElement {
  return criar("tr", {}, [criar("th"), ...CONTADORES.map(([, titulo]) => criar("th", { texto: titulo }))]);
}

function linhaDoModelo(modelo: ModeloDoZe, contagem: ContagemDoModelo): HTMLTableRowElement {
  const valor = (campo: (typeof CONTADORES)[number][0]): number =>
    campo === "narrador_indisponivel" || campo === "narrador_lento"
      ? contagem.falhas[campo]
      : contagem[campo];
  const celulas = CONTADORES.map(([campo]) =>
    criar("td", { texto: String(valor(campo)), dados: { contador: `${modelo}-${campo}` } }),
  );
  return criar("tr", {}, [criar("th", { texto: NOME_DO_MODELO[modelo] }), ...celulas]);
}
