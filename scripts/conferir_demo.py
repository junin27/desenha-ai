"""Checklist automático antes de abrir o estande (spec checklist-do-evento).

Uso (a partir de `projeto_final/`), normalmente pelo `Conferir Desenha Aí.bat`:
    ml/.venv/Scripts/python scripts/conferir_demo.py
Sai com código 0 só se não houver nenhum item com falha.
"""

import json
import socket
import sys
import time
import urllib.request
from collections.abc import Mapping, Sequence
from pathlib import Path
from typing import Protocol

sys.path.insert(0, str(Path(__file__).parent))

from demo_comum import (
    PASTA_DA_DEMO,
    DiscoReal,
    configurar_saida_em_utf8,
    ler_manifesto,
    memoria_livre_em_bytes,
)
from desenha_ml.conversa import entrada_charada
from desenha_ml.demo.checklist import (
    ItemDoChecklist,
    OcupacaoDaPorta,
    VozInstalada,
    formatar_item,
    item_de_arquivos,
    item_de_memoria,
    item_de_portas,
    item_de_voz,
    item_do_ze,
    item_dos_modelos,
    resultado_final,
)
from desenha_ml.demo.manifesto import Manifesto, comparar_com_o_disco
from desenha_ml.demo.saude import ServidorEsperado, esperar_servidores
from desenha_ml.demo.servidores import (
    HOST_LOCAL,
    MAXIMO_DE_TOKENS_POR_FALA,
    PORTA_DO_BASE,
    PORTA_DO_DESTILADO,
    planejar_servidores,
)
from desenha_ml.prompt_qwen import PARADA, prompt_de_inferencia
from desenha_ml.resultado import Erro
from iniciar_demo import (
    SEGUNDOS_PARA_ENCERRAR,
    _entradas,
    encerrar,
    ler_registro,
    sondar_health,
)
from job_do_windows import criar_job_que_encerra_os_filhos, iniciar_no_job

CHAVES_DE_VOZES = (
    r"SOFTWARE\Microsoft\Speech_OneCore\Voices\Tokens",
    r"SOFTWARE\Microsoft\Speech\Voices\Tokens",
)
TEMPERATURA_DA_CHARADA = 0.7  # a mesma do jogo (narrador-llama-server.ts)
ACAO_REFAZER = "rode a preparação de novo"
SEGUNDOS_MAXIMOS_DO_PEDIDO = 60
SEGUNDOS_DA_CONEXAO = 0.5


class Registro(Protocol):
    def subchaves(self, chave: str) -> list[str]: ...

    def valor(self, chave: str, nome: str) -> str | None: ...


class RegistroDoWindows:
    """HKLM só para leitura: nada é gravado."""

    def subchaves(self, chave: str) -> list[str]:
        import winreg

        try:
            with winreg.OpenKey(winreg.HKEY_LOCAL_MACHINE, chave) as aberta:
                quantidade = winreg.QueryInfoKey(aberta)[0]
                return [winreg.EnumKey(aberta, indice) for indice in range(quantidade)]
        except OSError:
            return []

    def valor(self, chave: str, nome: str) -> str | None:
        import winreg

        try:
            with winreg.OpenKey(winreg.HKEY_LOCAL_MACHINE, chave) as aberta:
                return str(winreg.QueryValueEx(aberta, nome)[0])
        except OSError:
            return None


def vozes_do_registro(registro: Registro) -> list[VozInstalada]:
    """As vozes locais que o Chrome e o Edge enxergam: SAPI e OneCore, com nome e idioma."""
    vozes = []
    for chave in CHAVES_DE_VOZES:
        for token in registro.subchaves(chave):
            atributos = f"{chave}\\{token}\\Attributes"
            idioma = registro.valor(atributos, "Language")
            if idioma is not None:
                vozes.append(
                    VozInstalada(registro.valor(atributos, "Name") or token, idioma)
                )
    return vozes


def corpo_do_pedido_da_charada() -> str:
    """O mesmo prompt e a mesma parada do jogo; só muda o `stream` (aqui lemos a resposta de uma vez)."""
    entrada = entrada_charada("vaca", "fácil")
    if isinstance(entrada, Erro):
        raise TypeError(entrada.detalhe)
    return json.dumps(
        {
            "prompt": prompt_de_inferencia(entrada.valor),
            "n_predict": MAXIMO_DE_TOKENS_POR_FALA,
            "stop": [PARADA],
            "stream": False,
            "temperature": TEMPERATURA_DA_CHARADA,
        }
    )


def pedir_charada(porta: int) -> tuple[str, float, int] | None:
    """(texto, segundos, tokens) ou None se o servidor não respondeu."""
    pedido = urllib.request.Request(
        f"http://{HOST_LOCAL}:{porta}/completion",
        data=corpo_do_pedido_da_charada().encode("utf8"),
        headers={"Content-Type": "application/json"},
    )
    inicio = time.monotonic()
    try:
        with urllib.request.urlopen(
            pedido, timeout=SEGUNDOS_MAXIMOS_DO_PEDIDO
        ) as resposta:
            corpo = json.loads(resposta.read().decode("utf8"))
    except (OSError, ValueError):
        return None
    return (
        str(corpo.get("content", "")),
        time.monotonic() - inicio,
        int(corpo.get("tokens_predicted", 0)),
    )


def ocupacao_da_porta(porta: int) -> OcupacaoDaPorta:
    try:
        with socket.create_connection((HOST_LOCAL, porta), timeout=SEGUNDOS_DA_CONEXAO):
            pass
    except OSError:
        return "livre"
    return "outro" if sondar_health(porta) == "fora" else "da_demo"


def _fala_do_ze(manifesto: Manifesto, demo_no_ar: bool) -> ItemDoChecklist:
    if demo_no_ar:
        resposta = pedir_charada(PORTA_DO_DESTILADO)
        return item_do_ze(*(resposta or (None, 0.0, 0)))
    plano = planejar_servidores(_entradas(manifesto))
    destilado = plano.servidores[0]
    job = criar_job_que_encerra_os_filhos()
    processo = iniciar_no_job(
        job, list(destilado.linha), PASTA_DA_DEMO / "registros" / "conferencia.log"
    )
    try:
        espera = esperar_servidores(
            [
                ServidorEsperado(
                    destilado.nome,
                    destilado.porta,
                    str(PASTA_DA_DEMO / "registros" / "conferencia.log"),
                )
            ],
            sondar_health,
            time.monotonic,
            time.sleep,
            ler_registro,
        )
        if isinstance(espera, Erro):
            return ItemDoChecklist(
                "Fala real do Zé",
                "falha",
                espera.detalhe,
                "confira o registro em demo/registros",
            )
        resposta = pedir_charada(destilado.porta)
        return item_do_ze(*(resposta or (None, 0.0, 0)))
    finally:
        encerrar([processo], SEGUNDOS_PARA_ENCERRAR)
        job.fechar()


def conferir() -> list[ItemDoChecklist]:
    manifesto = ler_manifesto()
    if isinstance(manifesto, Erro):
        return [
            ItemDoChecklist(
                "Arquivos da demo", "falha", manifesto.detalhe, "rode a preparação"
            )
        ]
    divergencias = comparar_com_o_disco(manifesto.valor, DiscoReal(PASTA_DA_DEMO))
    ocupacao = {
        porta: ocupacao_da_porta(porta) for porta in (PORTA_DO_DESTILADO, PORTA_DO_BASE)
    }
    demo_no_ar = ocupacao[PORTA_DO_DESTILADO] == "da_demo"
    entradas = _entradas(manifesto.valor)
    tamanho_da_vaga = (
        entradas.tamanho_do_gguf_base
        if manifesto.valor.modo_ensaio
        else entradas.tamanho_do_gguf_do_ze
    )
    plano = planejar_servidores(entradas)
    itens = [item_de_arquivos(divergencias), item_de_portas(ocupacao)]
    itens.append(
        item_de_memoria(entradas.memoria_livre, tamanho_da_vaga)
        if not demo_no_ar
        else ItemDoChecklist("Memória", "ok", "a demo já está no ar", "")
    )
    itens.append(item_de_voz(vozes_do_registro(RegistroDoWindows())))
    itens.append(
        item_dos_modelos(
            modo_ensaio=manifesto.valor.modo_ensaio,
            base_sobe=len(plano.servidores) == 2,
        )
    )
    itens.append(
        item_da_fala_pulada(ocupacao, divergencias)
        or _fala_do_ze(manifesto.valor, demo_no_ar)
    )
    return itens


def item_da_fala_pulada(
    ocupacao: Mapping[int, OcupacaoDaPorta], divergencias: Sequence[object]
) -> ItemDoChecklist | None:
    """A fala real só roda com arquivos íntegros e a 8080 livre ou da demo; senão o erro seria confuso."""
    titulo = "Fala real do Zé"
    if divergencias:
        return ItemDoChecklist(
            titulo, "falha", "não testada: os arquivos não conferem", ACAO_REFAZER
        )
    if ocupacao.get(PORTA_DO_DESTILADO) == "outro":
        detalhe = (
            f"não testada: a porta {PORTA_DO_DESTILADO} está ocupada por outro programa"
        )
        return ItemDoChecklist(
            titulo,
            "falha",
            detalhe,
            "libere a porta (veja o item Portas) e confira de novo",
        )
    return None


def main() -> int:
    configurar_saida_em_utf8()
    print(f"Memória livre agora: {memoria_livre_em_bytes() / 1024**3:.1f} GiB\n")
    itens = conferir()
    for item in itens:
        print(formatar_item(item))
    final = resultado_final(itens)
    print(f"\n{final.mensagem}")
    return final.codigo_de_saida


if __name__ == "__main__":
    sys.exit(main())
