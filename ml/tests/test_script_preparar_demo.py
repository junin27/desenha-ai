"""Scripts de preparação: "Download interrompido" e "Preparação repetida" (spec preparacao-da-demo)."""

import hashlib
import importlib.util
import threading
from collections.abc import Iterator
from contextlib import contextmanager
from http.server import BaseHTTPRequestHandler, HTTPServer
from pathlib import Path
from types import ModuleType

import pytest

from desenha_ml.resultado import Erro, Ok

CAMINHO_DO_SCRIPT = Path(__file__).parents[2] / "scripts" / "preparar_demo.py"
CONTEUDO = b"conteudo-do-gguf-de-mentira" * 100


def _carregar_script() -> ModuleType:
    especificacao = importlib.util.spec_from_file_location("preparar_demo", CAMINHO_DO_SCRIPT)
    assert especificacao is not None and especificacao.loader is not None
    modulo = importlib.util.module_from_spec(especificacao)
    especificacao.loader.exec_module(modulo)
    return modulo


class _Servidor:
    """Servidor HTTP real em thread; `cortar_em` simula a conexão caindo no meio do download."""

    def __init__(self, cortar_em: int | None) -> None:
        self.requisicoes = 0
        servidor = self

        class Manipulador(BaseHTTPRequestHandler):
            def do_GET(self) -> None:
                servidor.requisicoes += 1
                self.send_response(200)
                self.send_header("Content-Length", str(len(CONTEUDO)))
                self.end_headers()
                enviado = CONTEUDO if cortar_em is None else CONTEUDO[:cortar_em]
                self.wfile.write(enviado)
                self.wfile.flush()
                self.close_connection = True

            def log_message(self, *argumentos: object) -> None:
                return

        self.http = HTTPServer(("127.0.0.1", 0), Manipulador)

    @property
    def url(self) -> str:
        return f"http://127.0.0.1:{self.http.server_address[1]}/modelo.gguf"


@contextmanager
def _servindo(cortar_em: int | None = None) -> Iterator[_Servidor]:
    servidor = _Servidor(cortar_em)
    fio = threading.Thread(target=servidor.http.serve_forever, daemon=True)
    fio.start()
    try:
        yield servidor
    finally:
        servidor.http.shutdown()
        servidor.http.server_close()


def test_download_interrompido_diz_quantos_bytes_chegaram_e_nao_deixa_o_arquivo_final(tmp_path: Path) -> None:
    script = _carregar_script()
    destino = tmp_path / "modelos" / "base.gguf"

    with _servindo(cortar_em=40) as servidor:
        resultado = script.baixar_com_conferencia(servidor.url, destino, len(CONTEUDO), None)

    assert isinstance(resultado, Erro)
    assert resultado.codigo == "download_incompleto"
    assert "40" in resultado.detalhe and str(len(CONTEUDO)) in resultado.detalhe
    assert not destino.exists()


def test_download_completo_grava_so_depois_de_conferir(tmp_path: Path) -> None:
    script = _carregar_script()
    destino = tmp_path / "base.gguf"
    sha = hashlib.sha256(CONTEUDO).hexdigest()

    with _servindo() as servidor:
        resultado = script.baixar_com_conferencia(servidor.url, destino, len(CONTEUDO), sha)

    assert resultado == Ok(destino)
    assert destino.read_bytes() == CONTEUDO
    assert not destino.with_name("base.gguf.parcial").exists()


def test_arquivo_corrompido_no_download_e_recusado(tmp_path: Path) -> None:
    script = _carregar_script()
    destino = tmp_path / "base.gguf"

    with _servindo() as servidor:
        resultado = script.baixar_com_conferencia(servidor.url, destino, len(CONTEUDO), "0" * 64)

    assert isinstance(resultado, Erro)
    assert "SHA-256" in resultado.detalhe
    assert not destino.exists()


def test_preparacao_repetida_nao_baixa_de_novo_o_que_ja_esta_integro(tmp_path: Path) -> None:
    script = _carregar_script()
    destino = tmp_path / "base.gguf"
    sha = hashlib.sha256(CONTEUDO).hexdigest()

    with _servindo() as servidor:
        script.baixar_com_conferencia(servidor.url, destino, len(CONTEUDO), sha)
        segunda = script.baixar_com_conferencia(servidor.url, destino, len(CONTEUDO), sha)

        assert servidor.requisicoes == 1
    assert segunda == Ok(destino)


def test_arquivo_existente_corrompido_e_baixado_de_novo(tmp_path: Path) -> None:
    script = _carregar_script()
    destino = tmp_path / "base.gguf"
    destino.write_bytes(b"lixo")
    sha = hashlib.sha256(CONTEUDO).hexdigest()

    with _servindo() as servidor:
        resultado = script.baixar_com_conferencia(servidor.url, destino, len(CONTEUDO), sha)

        assert servidor.requisicoes == 1
    assert resultado == Ok(destino)
    assert destino.read_bytes() == CONTEUDO


def test_sem_o_gguf_do_ze_a_preparacao_avisa_o_modo_ensaio(tmp_path: Path) -> None:
    script = _carregar_script()

    aviso = script.aviso_do_ze(None)

    assert "Zé destilado está faltando" in aviso


def test_gguf_do_ze_inexistente_e_erro_com_o_caminho(tmp_path: Path) -> None:
    script = _carregar_script()
    faltando = tmp_path / "nao_existe.gguf"

    resultado = script.copiar_gguf_do_ze(faltando, tmp_path / "demo")

    assert isinstance(resultado, Erro)
    assert resultado.codigo == "arquivo_ausente"
    assert str(faltando) in resultado.detalhe


@pytest.mark.parametrize("tag", ["b12651"])
def test_tag_do_llama_cpp_fixada_aparece_na_url_e_no_nome_do_zip(tag: str) -> None:
    script = _carregar_script()

    assert tag == script.TAG_DO_LLAMA_CPP
    assert tag in script.URL_DO_LLAMA_CPP
    assert script.URL_DO_LLAMA_CPP.endswith(f"llama-{tag}-bin-win-cpu-x64.zip")
