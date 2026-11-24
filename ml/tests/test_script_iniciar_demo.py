"""Requisito "Encerrar" (spec inicializacao-da-demo): o Job Object mata os filhos sem deixar órfãos."""

import importlib.util
import subprocess
import sys
import time
from pathlib import Path
from types import ModuleType

import pytest

CAMINHO_DO_SCRIPT = Path(__file__).parents[2] / "scripts" / "iniciar_demo.py"
PRAZO_PARA_TERMINAR_EM_SEGUNDOS = 5
PROCESSO_DE_LONGA_DURACAO = "import time; time.sleep(120)"

pytestmark = pytest.mark.skipif(sys.platform != "win32", reason="Job Object é do Windows")


def _carregar_script() -> ModuleType:
    especificacao = importlib.util.spec_from_file_location("iniciar_demo", CAMINHO_DO_SCRIPT)
    assert especificacao is not None and especificacao.loader is not None
    modulo = importlib.util.module_from_spec(especificacao)
    especificacao.loader.exec_module(modulo)
    return modulo


def _esperar_terminar(processo: subprocess.Popen[bytes]) -> bool:
    limite = time.monotonic() + PRAZO_PARA_TERMINAR_EM_SEGUNDOS
    while time.monotonic() < limite:
        if processo.poll() is not None:
            return True
        time.sleep(0.05)
    return False


def test_ctrl_c_fechar_o_job_encerra_o_processo_filho_em_ate_5_segundos() -> None:
    script = _carregar_script()
    job = script.criar_job_que_encerra_os_filhos()
    filho = script.iniciar_no_job(job, [sys.executable, "-c", PROCESSO_DE_LONGA_DURACAO], None)
    try:
        assert filho.poll() is None  # está rodando de verdade

        job.fechar()  # o que o Windows faz sozinho se o Python morrer (janela fechada)

        assert _esperar_terminar(filho)
    finally:
        if filho.poll() is None:
            filho.kill()


def test_encerrar_chama_terminate_e_o_filho_sai_limpo() -> None:
    script = _carregar_script()
    job = script.criar_job_que_encerra_os_filhos()
    filho = script.iniciar_no_job(job, [sys.executable, "-c", PROCESSO_DE_LONGA_DURACAO], None)
    try:
        script.encerrar([filho], PRAZO_PARA_TERMINAR_EM_SEGUNDOS)

        assert filho.poll() is not None
    finally:
        job.fechar()
        if filho.poll() is None:
            filho.kill()


def test_sonda_de_health_sem_servidor_devolve_fora() -> None:
    script = _carregar_script()

    assert script.sondar_health(1) == "fora"  # porta 1: ninguém escuta


def test_registro_ausente_vira_texto_vazio(tmp_path: Path) -> None:
    script = _carregar_script()

    assert script.ler_registro(str(tmp_path / "nao_existe.log")) == ""
