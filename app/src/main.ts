/**
 * Raiz de composição (D-04): o único arquivo que conhece todas as camadas. Lê os arquivos do jogo, cria
 * os adaptadores reais, monta a partida e liga a tela.
 */
import "./estilo.css";
import { conferirParidade } from "./application/autoteste-de-paridade";
import { Partida } from "./application/partida";
import type { ClassificadorDeDesenho } from "./application/portas";
import { lerCasosDeParidade } from "./infrastructure/arquivos/casos-de-paridade";
import { lerClassesDoJogo, type ClassesDoJogo } from "./infrastructure/arquivos/classes-do-jogo";
import { buscarJson } from "./infrastructure/arquivos/buscar-json";
import { NarradorLlamaServer, type Buscador } from "./infrastructure/narrador-llama-server";
import { carregarRedesNoNavegador } from "./infrastructure/onnx/redes-no-navegador";
import { PlacarLocalStorage } from "./infrastructure/placar-local-storage";
import { RelogioDoNavegador } from "./infrastructure/relogio-do-navegador";
import {
  lerCharadasDeReserva,
  ReservaDeArquivo,
  type CharadasDeReserva,
} from "./infrastructure/reserva/reserva-de-arquivo";
import { SorteadorAleatorio } from "./infrastructure/sorteador-aleatorio";
import { instalarAtalhoDeZerarPlacar } from "./presentation/atalho-de-zerar";
import { InterfaceDoJogo } from "./presentation/interface-do-jogo";
import { mostrarErroDeCarregamento } from "./presentation/erro-de-carregamento";

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
  const sorteador = new SorteadorAleatorio();
  const placar = new PlacarLocalStorage(window.localStorage);
  const partida = new Partida(
    {
      classificador: redes.valor,
      narrador: new NarradorLlamaServer(buscar, relogio, configuracaoDoZe()),
      placar,
      relogio,
      sorteador,
      reserva: new ReservaDeArquivo(await lerCharadas(), sorteador),
    },
    { categorias: classes.nomesDasCategorias, pesoDaCnn: classes.pesoDaCnn },
  );
  const tela = new InterfaceDoJogo(raiz, partida, {
    nomesDasCategorias: classes.nomesDasCategorias,
    lerPlacar: () => placar.ler(),
  });
  partida.aoMudar((estado) => {
    tela.mostrar(estado);
  });
  tela.mostrar(partida.estado);
  void conferirRedesAoAbrir(redes.valor, tela);
  instalarAtalhoDeZerarPlacar(document, {
    podeZerar: () => partida.estado.etapa === "inicio",
    confirmar: (pergunta) => window.confirm(pergunta),
    zerar: () => {
      placar.zerar();
      tela.mostrar(partida.estado);
    },
  });
}

/** Autoteste de paridade (spec `palpites-ao-vivo`): avisa na tela de início, mas não impede o jogo. */
async function conferirRedesAoAbrir(redes: ClassificadorDeDesenho, tela: InterfaceDoJogo): Promise<void> {
  const arquivo = await buscarJson(buscar, `${PASTA_DOS_MODELOS}/teste_paridade_redes.json`);
  const casos = arquivo.ok ? lerCasosDeParidade(arquivo.valor) : arquivo;
  const paridade = casos.ok ? await conferirParidade(redes, casos.valor) : undefined;
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

/** `?ze=http://127.0.0.1:8081` troca o endereço do llama-server sem rebuild. */
function configuracaoDoZe(): { endereco?: string } {
  const endereco = new URLSearchParams(window.location.search).get("ze");
  return endereco === null ? {} : { endereco };
}

const raiz = document.querySelector<HTMLElement>("#jogo");
if (raiz === null) throw new Error('index.html sem o elemento <main id="jogo">');
void iniciar(raiz);
