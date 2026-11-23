"""Requisito "Navegador em tela cheia" (spec inicializacao-da-demo)."""

from desenha_ml.demo.navegador import (
    PastasDoWindows,
    argumentos_do_navegador,
    localizar_navegador,
)
from desenha_ml.resultado import Erro, Ok

PASTAS = PastasDoWindows(
    program_files="C:\\Program Files",
    program_files_x86="C:\\Program Files (x86)",
    local_app_data="C:\\Users\\estande\\AppData\\Local",
)
CHROME = "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe"
CHROME_DO_USUARIO = "C:\\Users\\estande\\AppData\\Local\\Google\\Chrome\\Application\\chrome.exe"
EDGE = "C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe"


def test_prefere_o_chrome_quando_instalado() -> None:
    resultado = localizar_navegador({CHROME, EDGE}.__contains__, PASTAS)

    assert resultado == Ok(("Chrome", CHROME))


def test_acha_o_chrome_instalado_so_para_o_usuario() -> None:
    resultado = localizar_navegador({CHROME_DO_USUARIO}.__contains__, PASTAS)

    assert resultado == Ok(("Chrome", CHROME_DO_USUARIO))


def test_sem_chrome_abre_no_edge() -> None:
    resultado = localizar_navegador({EDGE}.__contains__, PASTAS)

    assert resultado == Ok(("Edge", EDGE))


def test_sem_nenhum_dos_dois_diz_onde_procurou() -> None:
    resultado = localizar_navegador(lambda _caminho: False, PASTAS)

    assert isinstance(resultado, Erro)
    assert resultado.codigo == "navegador_ausente"
    assert "chrome.exe" in resultado.detalhe and "msedge.exe" in resultado.detalhe


def test_argumentos_abrem_o_jogo_em_modo_aplicativo_e_tela_cheia_com_perfil_proprio() -> None:
    argumentos = argumentos_do_navegador("http://127.0.0.1:8080/", "demo\\perfil")

    assert argumentos == (
        "--app=http://127.0.0.1:8080/",
        "--start-fullscreen",
        "--user-data-dir=demo\\perfil",
        "--no-first-run",
    )
