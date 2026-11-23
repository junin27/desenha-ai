"""Linhas de comando do `llama-server` e decisão de memória da demo (spec inicializacao-da-demo).

Exemplo:
    >>> entradas = EntradasDoPlano("llama-server", "ze.gguf", 1, "base.gguf", 1, "jogo", 8 * GIB)
    >>> [servidor.porta for servidor in planejar_servidores(entradas).servidores]
    [8080, 8081]
"""

from dataclasses import dataclass

GIB = 1024**3
HOST_LOCAL = "127.0.0.1"
PORTA_DO_DESTILADO = 8080
PORTA_DO_BASE = 8081
CONTEXTO_EM_TOKENS = 2048
MAXIMO_DE_TOKENS_POR_FALA = 300
THREADS = 8  # os 8 núcleos do Ryzen 7 5700U do estande
RESERVA_DE_CONTEXTO_E_BUFFERS = int(0.3 * GIB)
SOBRA_MINIMA_PARA_O_BASE = int(1.5 * GIB)
MENSAGEM_DO_MODO_ENSAIO = "Modo ensaio: Zé sem fine-tuning"
AVISO_BASE_SEM_MEMORIA = (
    "Qwen3 base desligado por falta de memória: a comparação base × destilado vai usar a reserva."
)


@dataclass(frozen=True)
class EntradasDoPlano:
    executavel: str
    gguf_do_ze: str | None  # None = modo ensaio
    tamanho_do_gguf_do_ze: int
    gguf_base: str
    tamanho_do_gguf_base: int
    pasta_do_jogo: str
    memoria_livre: int  # bytes


@dataclass(frozen=True)
class ServidorPlanejado:
    nome: str
    porta: int
    linha: tuple[str, ...]


@dataclass(frozen=True)
class PlanoDeServidores:
    servidores: tuple[ServidorPlanejado, ...]
    avisos: tuple[str, ...]


def planejar_servidores(entradas: EntradasDoPlano) -> PlanoDeServidores:
    """O destilado sempre sobe; o base só se, reservada a memória do destilado, sobrar o mínimo."""
    modo_ensaio = entradas.gguf_do_ze is None
    gguf_da_vaga = entradas.gguf_base if entradas.gguf_do_ze is None else entradas.gguf_do_ze
    tamanho_da_vaga = entradas.tamanho_do_gguf_base if modo_ensaio else entradas.tamanho_do_gguf_do_ze
    destilado = ServidorPlanejado(
        "Zé destilado",
        PORTA_DO_DESTILADO,
        _linha(entradas.executavel, gguf_da_vaga, PORTA_DO_DESTILADO, entradas.pasta_do_jogo),
    )
    avisos = (MENSAGEM_DO_MODO_ENSAIO,) if modo_ensaio else ()
    sobra = entradas.memoria_livre - (tamanho_da_vaga + RESERVA_DE_CONTEXTO_E_BUFFERS)
    if sobra < SOBRA_MINIMA_PARA_O_BASE:
        return PlanoDeServidores((destilado,), (*avisos, AVISO_BASE_SEM_MEMORIA))
    base = ServidorPlanejado(
        "Qwen3 base", PORTA_DO_BASE, _linha(entradas.executavel, entradas.gguf_base, PORTA_DO_BASE, None)
    )
    return PlanoDeServidores((destilado, base), avisos)


def _linha(executavel: str, gguf: str, porta: int, pasta_do_jogo: str | None) -> tuple[str, ...]:
    """Só o destilado serve o jogo (`--path`): a mesma origem evita CORS na porta 8080."""
    comum = (
        executavel,
        "-m",
        gguf,
        "--host",
        HOST_LOCAL,
        "--port",
        str(porta),
        "-c",
        str(CONTEXTO_EM_TOKENS),
        "-n",
        str(MAXIMO_DE_TOKENS_POR_FALA),
        "--threads",
        str(THREADS),
        "--parallel",
        "1",
    )
    return comum if pasta_do_jogo is None else (*comum, "--path", pasta_do_jogo)
