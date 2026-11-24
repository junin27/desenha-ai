"""Porta do LLM Teacher, com intervalo entre chamadas, novas tentativas e checkpoint (spec dataset-do-ze).

As chamadas reais (Gemini, Groq) ficam em `teacher_apis.py`; aqui só a lógica, testável com dublês.

Exemplo:
    >>> teacher = TeacherComCuidados(lambda prompt, temperatura: '{"ok": true}', intervalo=0)
    >>> teacher.gerar("oi", 0.5)
    {'ok': True}
"""

import json
import time
from collections.abc import Callable, Iterable
from dataclasses import dataclass, field
from pathlib import Path
from typing import Protocol, TypedDict

from desenha_ml.contratos_regras import Json

ChamadaDeApi = Callable[[str, float], str]
ESPERA_MAXIMA_SEGUNDOS = 60.0
ESPERA_BASE_SEGUNDOS = 5.0


class Teacher(Protocol):
    def gerar(self, prompt: str, temperatura: float) -> object | None: ...


@dataclass
class TeacherComCuidados:
    """Respeita o intervalo do free tier e tenta de novo com espera crescente; devolve o JSON ou None."""

    chamar: ChamadaDeApi
    intervalo: float = 4.5
    tentativas: int = 5
    tempo: Callable[[], float] = time.monotonic
    dormir: Callable[[float], None] = time.sleep
    registrar: Callable[[str], None] = print
    chamadas: int = 0
    falhas: int = 0
    _ultima: float = field(default=float("-inf"), repr=False)

    def gerar(self, prompt: str, temperatura: float) -> object | None:
        for tentativa in range(self.tentativas):
            self._respeitar_intervalo()
            try:
                self.chamadas += 1
                resposta: object = json.loads(self.chamar(prompt, temperatura))
                return resposta
            except Exception as erro:  # API fora do ar, cota, JSON inválido: tenta de novo e registra
                self.falhas += 1
                self.registrar(f"tentativa {tentativa + 1} falhou: {type(erro).__name__}: {str(erro)[:120]}")
                if tentativa + 1 < self.tentativas:
                    self.dormir(min(ESPERA_MAXIMA_SEGUNDOS, ESPERA_BASE_SEGUNDOS * 2**tentativa))
        return None

    def _respeitar_intervalo(self) -> None:
        espera = self.intervalo - (self.tempo() - self._ultima)
        if espera > 0:
            self.dormir(espera)
        self._ultima = self.tempo()


@dataclass(frozen=True)
class Lote:
    identificador: str
    tarefa: str
    prompt: str
    temperatura: float
    entradas: list[str]
    metas: list[dict[str, Json]]


class RegistroBruto(TypedDict):
    lote_id: str
    tarefa: str
    entrada: str
    meta: dict[str, Json]
    saida: str | None


def executar_lotes(
    lotes: Iterable[Lote], teacher: Teacher, checkpoint: Path, registrar: Callable[[str], None] = print
) -> list[RegistroBruto]:
    """Pede cada lote ainda não completo e grava na hora; devolve todos os registros do checkpoint.

    Lote "completo" = todas as amostras com saída. Um lote que ficou vazio (ou com menos exemplos que o
    pedido) é refeito ao retomar e seus registros antigos são trocados: sem isso a falha ficaria presa.
    """
    gravados = _ler_checkpoint(checkpoint)
    completos = _lotes_completos(gravados)
    pendentes = [lote for lote in lotes if lote.identificador not in completos]
    _descartar_do_checkpoint(checkpoint, gravados, {lote.identificador for lote in pendentes})
    for numero, lote in enumerate(pendentes, start=1):
        saida = teacher.gerar(lote.prompt, lote.temperatura)
        _gravar(checkpoint, _registros(lote, saida))
        registrar(
            f"lote {numero}/{len(pendentes)} ({lote.identificador}) {'ok' if saida else 'SEM RESPOSTA'}"
        )
    return _ler_checkpoint(checkpoint)


def _lotes_completos(registros: list[RegistroBruto]) -> set[str]:
    todos = {r["lote_id"] for r in registros}
    return todos - {r["lote_id"] for r in registros if r["saida"] is None}


def _descartar_do_checkpoint(checkpoint: Path, registros: list[RegistroBruto], lotes: set[str]) -> None:
    """Remove os registros incompletos dos lotes que serão refeitos (os completos não são tocados)."""
    if not any(r["lote_id"] in lotes for r in registros):
        return
    restantes = [r for r in registros if r["lote_id"] not in lotes]
    linhas = [json.dumps(r, ensure_ascii=False) + chr(10) for r in restantes]
    checkpoint.write_text("".join(linhas), encoding="utf8", newline=chr(10))


def _registros(lote: Lote, saida: object | None) -> list[RegistroBruto]:
    exemplos = saida.get("exemplos", []) if isinstance(saida, dict) else []
    return [
        {
            "lote_id": lote.identificador,
            "tarefa": lote.tarefa,
            "entrada": entrada,
            "meta": meta,
            "saida": exemplos[i] if i < len(exemplos) and isinstance(exemplos[i], str) else None,
        }
        for i, (entrada, meta) in enumerate(zip(lote.entradas, lote.metas, strict=True))
    ]


def _gravar(checkpoint: Path, registros: list[RegistroBruto]) -> None:
    checkpoint.parent.mkdir(parents=True, exist_ok=True)
    with checkpoint.open("a", encoding="utf8") as arquivo:
        for registro in registros:
            arquivo.write(json.dumps(registro, ensure_ascii=False) + "\n")


def _ler_checkpoint(checkpoint: Path) -> list[RegistroBruto]:
    if not checkpoint.exists():
        return []
    linhas = checkpoint.read_text(encoding="utf8").splitlines()
    return [json.loads(linha) for linha in linhas if linha.strip()]
