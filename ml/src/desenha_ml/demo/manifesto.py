"""Manifesto da demo: o que a pasta `demo/` deve conter e como conferir (spec preparacao-da-demo).

O disco entra por um protocolo, então a regra é pura e testável sem arquivos de verdade.

Exemplo:
    >>> sha256_de_blocos([])[:8]
    'e3b0c442'
"""

import hashlib
import json
from collections.abc import Iterable
from dataclasses import dataclass
from typing import Literal, Protocol

from desenha_ml.resultado import Erro, Ok, Resultado

MotivoDaDivergencia = Literal["ausente", "tamanho", "hash"]
AVISO_SEM_ZE = "Modo ensaio: o Zé destilado está faltando; o Qwen3 base ocupa a vaga dele."
CARACTERES_DO_TRECHO_NO_ERRO = 80


@dataclass(frozen=True)
class ArquivoDaDemo:
    caminho: str  # relativo a demo/, sempre com "/"
    tamanho: int
    sha256: str


@dataclass(frozen=True)
class Manifesto:
    versao_do_llama_cpp: str
    origem_do_gguf_base: str
    modo_ensaio: bool
    arquivos: tuple[ArquivoDaDemo, ...]
    origem_do_gguf_do_ze: str | None = None  # nome do arquivo de origem: diz a quantização (Q4_K_M, Q8_0)

    @property
    def aviso_de_modo_ensaio(self) -> str:
        return AVISO_SEM_ZE if self.modo_ensaio else ""


@dataclass(frozen=True)
class Divergencia:
    caminho: str
    motivo: MotivoDaDivergencia
    detalhe: str


class Disco(Protocol):
    def tamanho(self, caminho: str) -> int | None: ...

    def sha256(self, caminho: str) -> str: ...


def sha256_de_blocos(blocos: Iterable[bytes]) -> str:
    """Hash em blocos: o GGUF tem ~1 GB e não cabe de uma vez na memória que sobra no estande."""
    resumo = hashlib.sha256()
    for bloco in blocos:
        resumo.update(bloco)
    return resumo.hexdigest()


def montar_manifesto(
    *,
    versao_do_llama_cpp: str,
    origem_do_gguf_base: str,
    arquivos_comuns: tuple[ArquivoDaDemo, ...],
    gguf_do_ze: ArquivoDaDemo | None,
    origem_do_gguf_do_ze: str | None = None,
) -> Manifesto:
    """Sem o GGUF do Zé o manifesto vira "modo ensaio": o base ocupa a vaga do destilado."""
    arquivos = arquivos_comuns if gguf_do_ze is None else (*arquivos_comuns, gguf_do_ze)
    return Manifesto(
        versao_do_llama_cpp=versao_do_llama_cpp,
        origem_do_gguf_base=origem_do_gguf_base,
        modo_ensaio=gguf_do_ze is None,
        arquivos=arquivos,
        origem_do_gguf_do_ze=None if gguf_do_ze is None else origem_do_gguf_do_ze,
    )


def comparar_com_o_disco(manifesto: Manifesto, disco: Disco) -> list[Divergencia]:
    """Tamanho primeiro (barato); o SHA-256 só é calculado se o tamanho bater."""
    divergencias: list[Divergencia] = []
    for esperado in manifesto.arquivos:
        divergencia = _divergencia_do_arquivo(esperado, disco)
        if divergencia is not None:
            divergencias.append(divergencia)
    return divergencias


def _divergencia_do_arquivo(esperado: ArquivoDaDemo, disco: Disco) -> Divergencia | None:
    tamanho = disco.tamanho(esperado.caminho)
    if tamanho is None:
        return Divergencia(esperado.caminho, "ausente", f"{esperado.caminho}: arquivo ausente")
    if tamanho != esperado.tamanho:
        detalhe = f"{esperado.caminho}: {tamanho} bytes no disco, esperados {esperado.tamanho}"
        return Divergencia(esperado.caminho, "tamanho", detalhe)
    obtido = disco.sha256(esperado.caminho)
    if obtido != esperado.sha256:
        detalhe = f"{esperado.caminho}: SHA-256 {obtido}, esperado {esperado.sha256}"
        return Divergencia(esperado.caminho, "hash", detalhe)
    return None


def arquivos_a_refazer(divergencias: list[Divergencia]) -> list[str]:
    """Preparação repetida: só o que divergiu é baixado/copiado de novo."""
    return [divergencia.caminho for divergencia in divergencias]


def manifesto_para_json(manifesto: Manifesto) -> str:
    return json.dumps(
        {
            "versao_do_llama_cpp": manifesto.versao_do_llama_cpp,
            "origem_do_gguf_base": manifesto.origem_do_gguf_base,
            "origem_do_gguf_do_ze": manifesto.origem_do_gguf_do_ze,
            "modo_ensaio": manifesto.modo_ensaio,
            "arquivos": [
                {"caminho": a.caminho, "tamanho": a.tamanho, "sha256": a.sha256} for a in manifesto.arquivos
            ],
        },
        ensure_ascii=False,
        indent=2,
    )


def manifesto_de_json(texto: str) -> Resultado[Manifesto]:
    try:
        bruto = json.loads(texto)
        return Ok(
            Manifesto(
                versao_do_llama_cpp=str(bruto["versao_do_llama_cpp"]),
                origem_do_gguf_base=str(bruto["origem_do_gguf_base"]),
                modo_ensaio=bool(bruto["modo_ensaio"]),
                arquivos=tuple(
                    ArquivoDaDemo(str(a["caminho"]), int(a["tamanho"]), str(a["sha256"]))
                    for a in bruto["arquivos"]
                ),
                origem_do_gguf_do_ze=_texto_opcional(bruto.get("origem_do_gguf_do_ze")),
            )
        )
    except (ValueError, KeyError, TypeError) as causa:
        trecho = texto[:CARACTERES_DO_TRECHO_NO_ERRO]
        detalhe = (
            f"manifesto inválido ({causa!r}); recebido {trecho!r}, "
            "esperado JSON com versao_do_llama_cpp, origem_do_gguf_base, modo_ensaio e arquivos"
        )
        return Erro("formato_invalido", detalhe)


def _texto_opcional(valor: object) -> str | None:
    """Manifestos de antes de 25/11/2026 não têm a origem do GGUF do Zé."""
    return None if valor is None else str(valor)
