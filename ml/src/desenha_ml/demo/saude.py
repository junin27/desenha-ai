"""Espera pela saúde dos `llama-server` antes de abrir o navegador (spec inicializacao-da-demo).

Relógio, sono, sonda HTTP e leitura do registro entram como funções: o prazo de 90 s é testado sem esperar.

Exemplo:
    >>> interpretar_health(200, '{"status":"ok"}')
    'pronto'
    >>> ultimas_linhas("a\\nb\\nc", 2)
    'b\\nc'
"""

import json
from collections.abc import Callable, Sequence
from dataclasses import dataclass
from typing import Literal

from desenha_ml.resultado import Erro, Ok, Resultado

EstadoDoServidor = Literal["pronto", "carregando", "fora"]
PRAZO_EM_SEGUNDOS = 90
INTERVALO_ENTRE_SONDAS_EM_SEGUNDOS = 0.5
LINHAS_DO_REGISTRO_NO_ERRO = 20
STATUS_HTTP_OK = 200
STATUS_HTTP_CARREGANDO = 503  # o llama-server responde 503 enquanto carrega o modelo


@dataclass(frozen=True)
class ServidorEsperado:
    nome: str
    porta: int
    registro: str  # caminho do arquivo de saída do servidor


def interpretar_health(status_http: int | None, corpo: str) -> EstadoDoServidor:
    """`None` = sem conexão. 200 só vale com `{"status":"ok"}`: outro programa na porta não conta."""
    if status_http == STATUS_HTTP_CARREGANDO:
        return "carregando"
    if status_http == STATUS_HTTP_OK and _status_do_corpo(corpo) == "ok":
        return "pronto"
    return "fora"


def _status_do_corpo(corpo: str) -> object:
    try:
        achado = json.loads(corpo)
    except ValueError:
        return None
    return achado.get("status") if isinstance(achado, dict) else None


def ultimas_linhas(texto: str, quantidade: int) -> str:
    linhas = texto.rstrip().splitlines()
    return "\n".join(linhas[-quantidade:])


def esperar_servidores(
    servidores: Sequence[ServidorEsperado],
    sondar: Callable[[int], EstadoDoServidor],
    agora: Callable[[], float],
    dormir: Callable[[float], None],
    ler_registro: Callable[[str], str],
) -> Resultado[None]:
    """Um prazo só para todos: eles carregam em paralelo. Falha cita o primeiro que não respondeu."""
    limite = agora() + PRAZO_EM_SEGUNDOS
    pendentes = list(servidores)
    while pendentes and agora() < limite:
        pendentes = [servidor for servidor in pendentes if sondar(servidor.porta) != "pronto"]
        if pendentes:
            dormir(INTERVALO_ENTRE_SONDAS_EM_SEGUNDOS)
    if not pendentes:
        return Ok(None)
    return Erro("servidor_sem_resposta", _mensagem_da_falha(pendentes[0], ler_registro))


def _mensagem_da_falha(servidor: ServidorEsperado, ler_registro: Callable[[str], str]) -> str:
    registro = ultimas_linhas(ler_registro(servidor.registro), LINHAS_DO_REGISTRO_NO_ERRO)
    titulo = f"{servidor.nome} não respondeu na porta {servidor.porta} em {PRAZO_EM_SEGUNDOS} s"
    return f"{titulo}. Últimas linhas do registro ({servidor.registro}):\n{registro}"
