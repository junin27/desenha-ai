"""Casca compartilhada pelos scripts da demo: disco real, memória do Windows e leitura do manifesto."""

import ctypes
import sys
from pathlib import Path

from desenha_ml.demo.manifesto import Manifesto, manifesto_de_json, sha256_de_blocos
from desenha_ml.resultado import Erro, Ok, Resultado

RAIZ_DO_PROJETO = Path(__file__).resolve().parents[1]
PASTA_DA_DEMO = RAIZ_DO_PROJETO / "demo"
CAMINHO_DO_MANIFESTO = PASTA_DA_DEMO / "manifesto.json"
BYTES_POR_BLOCO = 8 * 1024 * 1024  # blocos grandes: o GGUF tem ~1 GB


def sha256_do_arquivo(caminho: Path) -> str:
    with caminho.open("rb") as arquivo:
        return sha256_de_blocos(iter(lambda: arquivo.read(BYTES_POR_BLOCO), b""))


class DiscoReal:
    """O disco que a regra pura do manifesto consulta (protocolo `Disco`)."""

    def __init__(self, raiz: Path) -> None:
        self.raiz = raiz

    def tamanho(self, caminho: str) -> int | None:
        arquivo = self.raiz / caminho
        return arquivo.stat().st_size if arquivo.is_file() else None

    def sha256(self, caminho: str) -> str:
        return sha256_do_arquivo(self.raiz / caminho)


def ler_manifesto(caminho: Path = CAMINHO_DO_MANIFESTO) -> Resultado[Manifesto]:
    if not caminho.is_file():
        return Erro(
            "arquivo_ausente",
            f"{caminho} não existe; rode `ml.venvScriptspython scriptspreparar_demo.py`",
        )
    lido = manifesto_de_json(caminho.read_text(encoding="utf8"))
    return Ok(lido.valor) if isinstance(lido, Ok) else lido


def memoria_livre_em_bytes() -> int:
    """`GlobalMemoryStatusEx` (Windows). Fora dele devolve 0, o que faz a demo subir só o destilado."""
    if sys.platform != "win32":
        return 0

    class EstadoDaMemoria(ctypes.Structure):
        _fields_ = [
            ("tamanho", ctypes.c_ulong),
            ("em_uso_percentual", ctypes.c_ulong),
            ("fisica_total", ctypes.c_ulonglong),
            ("fisica_livre", ctypes.c_ulonglong),
            ("arquivo_de_paginas_total", ctypes.c_ulonglong),
            ("arquivo_de_paginas_livre", ctypes.c_ulonglong),
            ("virtual_total", ctypes.c_ulonglong),
            ("virtual_livre", ctypes.c_ulonglong),
            ("estendida_livre", ctypes.c_ulonglong),
        ]

    estado = EstadoDaMemoria()
    estado.tamanho = ctypes.sizeof(EstadoDaMemoria)
    ctypes.windll.kernel32.GlobalMemoryStatusEx(ctypes.byref(estado))  # type: ignore[attr-defined,unused-ignore]
    return int(estado.fisica_livre)
