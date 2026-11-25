/**
 * Raiz de composição (D-04): o único arquivo que conhece todas as camadas. Lê os arquivos do jogo, cria
 * os adaptadores reais, monta a partida, a conversa, a voz e o painel e liga a tela.
 */
import "./estilo.css";
import { conferirParidade } from "./application/autoteste-de-paridade";
import { ClassificadorMedido } from "./application/classificador-medido";
import { contarFalasDaConversa, contarFalasDaPartida } from "./application/contador-de-falas";
import { ConversaComOZe } from "./application/conversa-com-o-ze";
import { LeitorEmVoz } from "./application/leitor-em-voz";
import { MedicoesDaSessao } from "./application/medicoes-da-sessao";
import { NarradorAlternavel } from "./application/narrador-alternavel";
import { NarradorMedido } from "./application/narrador-medido";
import { Partida } from "./application/partida";
import type { ClassificadorDeDesenho, ModeloDoZe, Relogio } from "./application/portas";
import { buscarJson } from "./infrastructure/arquivos/buscar-json";
import { lerCasosDeParidade } from "./infrastructure/arquivos/casos-de-paridade";
import { lerClassesDoJogo, type ClassesDoJogo } from "./infrastructure/arquivos/classes-do-jogo";
import { lerMetricasDasRedes, lerMetricasDoSlm } from "./infrastructure/arquivos/metricas-do-treino";
import { enderecosDoZe } from "./infrastructure/enderecos-do-ze";
import { NarradorLlamaServer, type Buscador } from "./infrastructure/narrador-llama-server";
import { carregarRedesNoNavegador } from "./infrastructure/onnx/redes-no-navegador";
import { PlacarLocalStorage } from "./infrastructure/placar-local-storage";
import { PreferenciasLocalStorage } from "./infrastructure/preferencias-local-storage";
import { RelogioDoNavegador } from "./infrastructure/relogio-do-navegador";
import {
  lerCharadasDeReserva,
  ReservaDeArquivo,
  type CharadasDeReserva,
} from "./infrastructure/reserva/reserva-de-arquivo";
import { SorteadorAleatorio } from "./infrastructure/sorteador-aleatorio";
import { criarVozDoNavegador } from "./infrastructure/voz-do-navegador";
import { instalarAtalhoDeZerarPlacar } from "./presentation/atalho-de-zerar";
import { criarBotaoDaVoz } from "./presentation/botao-da-voz";
import { criar } from "./presentation/dom";
import { mostrarErroDeCarregamento } from "./presentation/erro-de-carregamento";
import { InterfaceDoJogo, type InformacoesDoJogo } from "./presentation/interface-do-jogo";
import { PainelTecnico } from "./presentation/painel-tecnico";

const PASTA_DOS_MODELOS = "modelos";
const buscar: Buscador = (url, init) => fetch(url, init);

async function iniciar(raiz: HTMLElement): Promise<void> {
  const classes = await lerClasses();
  if (typeof classes === "string") {
    mostrarErroDeCarregamento(raiz, classes);
    return;
  }
  const redes = await carregarRedesNoNavegador(PASTA_DOS_MODELOS);
  if (!redes.ok) {
    mostrarErroDeCarregamento(raiz, redes.erro.detalhe);
    return;
  }
  const relogio = new RelogioDoNavegador();
  const medicoes = new MedicoesDaSessao();
  const sorteador = new SorteadorAleatorio();
  const placar = new PlacarLocalStorage(window.localStorage);
  const narrador = criarNarrador(relogio, medicoes);
  const reserva = new ReservaDeArquivo(await lerCharadas(), sorteador);
  const classificador = new ClassificadorMedido(redes.valor, medicoes, relogio);
  const partida = new Partida(
    { classificador, narrador, placar, relogio, sorteador, reserva },
    { categorias: classes.nomesDasCategorias, pesoDaCnn: classes.pesoDaCnn },
  );
  const conversa = new ConversaComOZe(narrador, reserva, () => partida.estado.etapa === "inicio");
  // A voz assina antes da tela: ao trocar de tela, a fala é interrompida antes de a nova aparecer.
  const leitor = new LeitorEmVoz(
    criarVozDoNavegador(window),
    new PreferenciasLocalStorage(window.localStorage),
  );
  leitor.acompanharPartida(partida);
  leitor.acompanharConversa(conversa);
  contarFalasDaPartida(partida, medicoes);
  contarFalasDaConversa(conversa, medicoes);

  const metricas = await lerMetricasDoTreino();
  const tela = ligarTela(raiz, partida, conversa, telaDoPlacar(classes, placar, metricas));
  montarBarraDoEstande(leitor, medicoes, narrador, metricas);
  void conferirRedesAoAbrir(redes.valor, tela, medicoes);
  instalarAtalhoDeZerarPlacar(document, {
    podeZerar: () => partida.estado.etapa === "inicio",
    confirmar: (pergunta) => window.confirm(pergunta),
    zerar: () => {
      placar.zerar();
      tela.mostrar(partida.estado);
    },
  });
}

/** Monta a interface e a mantém em dia com a partida e a conversa. */
function ligarTela(
  raiz: HTMLElement,
  partida: Partida,
  conversa: ConversaComOZe,
  informacoes: InformacoesDoJogo,
): InterfaceDoJogo {
  const tela = new InterfaceDoJogo(raiz, partida, informacoes, conversa, {
    atrasoDaTrocaMs: ATRASO_DA_TROCA_DE_TELA_MS,
  });
  partida.aoMudar((estado) => {
    tela.mostrar(estado);
  });
  conversa.aoMudar((estado) => {
    tela.mostrarConversa(estado);
  });
  tela.mostrar(partida.estado);
  return tela;
}

function telaDoPlacar(
  classes: ClassesDoJogo,
  placar: PlacarLocalStorage,
  metricas: MetricasDoTreino,
): InformacoesDoJogo {
  // A abertura mostra a acurácia de teste do ensemble só quando as métricas existem (spec tela-de-abertura).
  const ensemble = metricas.metricasDasRedes?.redes.find((rede) => rede.nome === "Ensemble");
  return {
    nomesDasCategorias: classes.nomesDasCategorias,
    lerPlacar: () => placar.ler(),
    acuraciaDoEnsemble: ensemble?.acuracia,
  };
}

/** Botão da voz e "Bastidores" num canto fixo, fora das telas, e o painel técnico (bancada-do-ze). */
function montarBarraDoEstande(
  leitor: LeitorEmVoz,
  medicoes: MedicoesDaSessao,
  narrador: NarradorAlternavel,
  metricas: MetricasDoTreino,
): void {
  const painel = new PainelTecnico({ medicoes, narrador, ...metricas });
  painel.instalarAtalho(document);
  const barra = criar("div", { classe: "barra-do-estande" }, [criarBotaoDaVoz(leitor), painel.botao]);
  document.body.append(painel.raiz, barra);
}

/** Zé destilado e Qwen3 base, cada um medido, atrás do narrador alternável (bancada-do-ze). */
function criarNarrador(relogio: Relogio, medicoes: MedicoesDaSessao): NarradorAlternavel {
  const enderecos = enderecosDoZe(window.location.search);
  const medido = (modelo: ModeloDoZe): NarradorMedido => {
    const llama = new NarradorLlamaServer(buscar, relogio, { endereco: enderecos[modelo] });
    return new NarradorMedido(llama, modelo, medicoes, relogio);
  };
  return new NarradorAlternavel(medido("destilado"), medido("base"));
}

/** Autoteste de paridade (spec `palpites-ao-vivo`): avisa na tela de início, mas não impede o jogo. */
async function conferirRedesAoAbrir(
  redes: ClassificadorDeDesenho,
  tela: InterfaceDoJogo,
  medicoes: MedicoesDaSessao,
): Promise<void> {
  const arquivo = await buscarJson(buscar, `${PASTA_DOS_MODELOS}/teste_paridade_redes.json`);
  const casos = arquivo.ok ? lerCasosDeParidade(arquivo.valor) : arquivo;
  const paridade = casos.ok ? await conferirParidade(redes, casos.valor) : undefined;
  if (paridade !== undefined) medicoes.registrarParidade(paridade);
  if (paridade?.passou === true) {
    console.info(`Paridade das redes conferida em ${paridade.casos} desenhos.`, paridade);
    return;
  }
  console.warn("Redes divergentes do treino.", casos.ok ? paridade : casos.erro.detalhe);
  tela.avisarRedesDivergentes();
}

/** Devolve as classes ou a mensagem de erro para a tela. */
async function lerClasses(): Promise<ClassesDoJogo | string> {
  const arquivo = await buscarJson(buscar, `${PASTA_DOS_MODELOS}/classes.json`);
  const classes = arquivo.ok ? lerClassesDoJogo(arquivo.valor) : arquivo;
  return classes.ok ? classes.valor : classes.erro.detalhe;
}

/** Sem o arquivo de charadas o jogo segue: a reserva usa a charada genérica (e avisa no console). */
async function lerCharadas(): Promise<CharadasDeReserva> {
  const arquivo = await buscarJson(buscar, `${PASTA_DOS_MODELOS}/charadas_reserva.json`);
  const charadas = arquivo.ok ? lerCharadasDeReserva(arquivo.valor) : arquivo;
  if (charadas.ok) return charadas.valor;
  console.warn("Charadas de reserva indisponíveis:", charadas.erro.detalhe);
  return {};
}

type MetricasDoTreino = Pick<
  ConstructorParameters<typeof PainelTecnico>[0],
  "metricasDasRedes" | "metricasDoSlm"
>;

/** Quando a pincelada cobre a tela e a troca acontece (spec `identidade-visual`). */
const ATRASO_DA_TROCA_DE_TELA_MS = 450;

/** Métricas opcionais do painel e da abertura: arquivo ausente vira "—" ou some. */
async function lerMetricasDoTreino(): Promise<MetricasDoTreino> {
  const [redes, slm] = await Promise.all([
    buscarJson(buscar, `${PASTA_DOS_MODELOS}/metricas_redes.json`),
    buscarJson(buscar, `${PASTA_DOS_MODELOS}/metricas_slm.json`),
  ]);
  return {
    metricasDasRedes: redes.ok ? lerMetricasDasRedes(redes.valor) : undefined,
    metricasDoSlm: slm.ok ? lerMetricasDoSlm(slm.valor) : undefined,
  };
}

const raiz = document.querySelector<HTMLElement>("#jogo");
if (raiz === null) throw new Error('index.html sem o elemento <main id="jogo">');
void iniciar(raiz);
