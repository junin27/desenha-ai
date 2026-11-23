"""Escolha do navegador e argumentos de tela cheia (spec inicializacao-da-demo).

Caminhos do Windows montados com `ntpath`, para a regra rodar igual em qualquer sistema.

Exemplo:
    >>> argumentos_do_navegador("http://127.0.0.1:8080/", "perfil")[:2]
    ('--app=http://127.0.0.1:8080/', '--start-fullscreen')
"""

import ntpath
from collections.abc import Callable
from dataclasses import dataclass

from desenha_ml.resultado import Erro, Ok, Resultado

CAMINHO_DO_CHROME = ntpath.join("Google", "Chrome", "Application", "chrome.exe")
CAMINHO_DO_EDGE = ntpath.join("Microsoft", "Edge", "Application", "msedge.exe")


@dataclass(frozen=True)
class PastasDoWindows:
    program_files: str
    program_files_x86: str
    local_app_data: str


def localizar_navegador(existe: Callable[[str], bool], pastas: PastasDoWindows) -> Resultado[tuple[str, str]]:
    """Chrome primeiro (Program Files, x86, instalação por usuário); se não houver, o Edge."""
    bases = (pastas.program_files, pastas.program_files_x86, pastas.local_app_data)
    candidatos = [("Chrome", ntpath.join(base, CAMINHO_DO_CHROME)) for base in bases] + [
        ("Edge", ntpath.join(base, CAMINHO_DO_EDGE))
        for base in (pastas.program_files_x86, pastas.program_files)
    ]
    for nome, caminho in candidatos:
        if existe(caminho):
            return Ok((nome, caminho))
    procurados = ", ".join(caminho for _nome, caminho in candidatos)
    return Erro(
        "navegador_ausente",
        f"nem chrome.exe nem msedge.exe encontrados; procurei em: {procurados}",
    )


def argumentos_do_navegador(url: str, pasta_do_perfil: str) -> tuple[str, ...]:
    """Modo aplicativo (sem barra de endereço) e perfil próprio: o placar do evento fica isolado."""
    return (
        f"--app={url}",
        "--start-fullscreen",
        f"--user-data-dir={pasta_do_perfil}",
        "--no-first-run",
    )
