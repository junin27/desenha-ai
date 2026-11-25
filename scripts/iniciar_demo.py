"""Inicia a demo SEM internet: servidores do Zé, espera por saúde e jogo em tela cheia (spec inicializacao-da-demo).

Uso (a partir de `projeto_final/`), normalmente pelo `Iniciar Desenha Aí.bat`:
    ml/.venv/Scripts/python scripts/iniciar_demo.py
Ctrl+C ou fechar a janela encerra os servidores.
"""

import os
import subprocess
import sys
import time
import urllib.error
import urllib.request
from pathlib import Path

sys.path.insert(0, str(Path(__file__).parent))

from demo_comum import (
    PASTA_DA_DEMO,
    configurar_saida_em_utf8,
    ler_manifesto,
    memoria_livre_em_bytes,
)
from desenha_ml.demo.manifesto import Manifesto
from desenha_ml.demo.navegador import (
    PastasDoWindows,
    argumentos_do_navegador,
    localizar_navegador,
)
from desenha_ml.demo.saude import (
    EstadoDoServidor,
    ServidorEsperado,
    esperar_servidores,
    interpretar_health,
)
from desenha_ml.demo.servidores import (
    HOST_LOCAL,
    PORTA_DO_DESTILADO,
    EntradasDoPlano,
    planejar_servidores,
)
from desenha_ml.resultado import Erro
from job_do_windows import JobDoWindows, criar_job_que_encerra_os_filhos, iniciar_no_job

__all__ = ["criar_job_que_encerra_os_filhos", "iniciar_no_job"]

NOME_DO_GGUF_BASE = "modelos/qwen3-1.7b-base-Q8_0.gguf"
NOME_DO_GGUF_DO_ZE = "modelos/zedorabisco-1.7b.gguf"
SEGUNDOS_DA_SONDA = 2
SEGUNDOS_PARA_ENCERRAR = 5
SEGUNDOS_ENTRE_CONFERENCIAS = 1.0


def sondar_health(porta: int) -> EstadoDoServidor:
    """Um GET /health; qualquer falha de rede é "fora", e o 503 do carregamento é "carregando"."""
    try:
        with urllib.request.urlopen(
            f"http://{HOST_LOCAL}:{porta}/health", timeout=SEGUNDOS_DA_SONDA
        ) as resposta:
            return interpretar_health(
                resposta.status, resposta.read().decode("utf8", "replace")
            )
    except urllib.error.HTTPError as erro:
        return interpretar_health(erro.code, erro.read().decode("utf8", "replace"))
    except OSError:
        return interpretar_health(None, "")


def ler_registro(caminho: str) -> str:
    arquivo = Path(caminho)
    return (
        arquivo.read_text(encoding="utf8", errors="replace")
        if arquivo.is_file()
        else ""
    )


def encerrar(
    processos: list["subprocess.Popen[bytes]"], prazo_em_segundos: float
) -> None:
    """terminate() primeiro para sair limpo; o que não sair no prazo é morto."""
    for processo in processos:
        if processo.poll() is None:
            processo.terminate()
    limite = time.monotonic() + prazo_em_segundos
    for processo in processos:
        try:
            processo.wait(timeout=max(0.0, limite - time.monotonic()))
        except subprocess.TimeoutExpired:
            processo.kill()


def _entradas(manifesto: Manifesto) -> EntradasDoPlano:
    tamanhos = {arquivo.caminho: arquivo.tamanho for arquivo in manifesto.arquivos}
    gguf_do_ze = (
        None if manifesto.modo_ensaio else str(PASTA_DA_DEMO / NOME_DO_GGUF_DO_ZE)
    )
    return EntradasDoPlano(
        executavel=str(next(PASTA_DA_DEMO.joinpath("llama").rglob("llama-server.exe"))),
        gguf_do_ze=gguf_do_ze,
        tamanho_do_gguf_do_ze=tamanhos.get(NOME_DO_GGUF_DO_ZE, 0),
        gguf_base=str(PASTA_DA_DEMO / NOME_DO_GGUF_BASE),
        tamanho_do_gguf_base=tamanhos[NOME_DO_GGUF_BASE],
        pasta_do_jogo=str(PASTA_DA_DEMO / "jogo"),
        memoria_livre=memoria_livre_em_bytes(),
    )


def _pastas_do_windows() -> PastasDoWindows:
    return PastasDoWindows(
        program_files=os.environ.get("ProgramFiles", r"C:\Program Files"),
        program_files_x86=os.environ.get(
            "ProgramFiles(x86)", r"C:\Program Files (x86)"
        ),
        local_app_data=os.environ.get("LOCALAPPDATA", ""),
    )


def _abrir_o_jogo() -> str | None:
    navegador = localizar_navegador(
        lambda caminho: Path(caminho).is_file(), _pastas_do_windows()
    )
    if isinstance(navegador, Erro):
        return navegador.detalhe
    url = f"http://{HOST_LOCAL}:{PORTA_DO_DESTILADO}/"
    argumentos = argumentos_do_navegador(url, str(PASTA_DA_DEMO / "perfil"))
    subprocess.Popen([navegador.valor[1], *argumentos])
    return None


def _subir(
    manifesto: Manifesto, job: JobDoWindows
) -> tuple[list["subprocess.Popen[bytes]"], list[ServidorEsperado]]:
    plano = planejar_servidores(_entradas(manifesto))
    for aviso in plano.avisos:
        print(f"AVISO: {aviso}")
    processos, esperados = [], []
    for servidor in plano.servidores:
        registro = PASTA_DA_DEMO / "registros" / f"{servidor.porta}.log"
        print(f"Subindo {servidor.nome} na porta {servidor.porta}...")
        processos.append(iniciar_no_job(job, list(servidor.linha), registro))
        esperados.append(ServidorEsperado(servidor.nome, servidor.porta, str(registro)))
    return processos, esperados


def main() -> int:
    configurar_saida_em_utf8()
    manifesto = ler_manifesto()
    if isinstance(manifesto, Erro):
        print(f"ERRO: {manifesto.detalhe}", file=sys.stderr)
        return 1
    job = criar_job_que_encerra_os_filhos()
    processos, esperados = _subir(manifesto.valor, job)
    try:
        espera = esperar_servidores(
            esperados, sondar_health, time.monotonic, time.sleep, ler_registro
        )
        if isinstance(espera, Erro):
            print(f"ERRO: {espera.detalhe}", file=sys.stderr)
            return 1
        if (problema := _abrir_o_jogo()) is not None:
            print(f"ERRO: {problema}", file=sys.stderr)
            return 1
        print("Demo no ar. Ctrl+C (ou fechar esta janela) encerra os servidores.")
        while all(processo.poll() is None for processo in processos):
            time.sleep(SEGUNDOS_ENTRE_CONFERENCIAS)
        print(
            "ERRO: um servidor terminou sozinho; veja demo/registros/.", file=sys.stderr
        )
        return 1
    except KeyboardInterrupt:
        print("Encerrando...")
        return 0
    finally:
        encerrar(processos, SEGUNDOS_PARA_ENCERRAR)
        job.fechar()


if __name__ == "__main__":
    sys.exit(main())
