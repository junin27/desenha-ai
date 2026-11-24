"""Job Object do Windows com KILL_ON_JOB_CLOSE (design D6 da demo-offline).

Se o Python morrer por qualquer motivo (Ctrl+C, janela fechada, erro), o Windows fecha o handle do job e
encerra todos os processos dentro dele: nenhum `llama-server` fica órfão.
"""

import ctypes
import subprocess
from ctypes import wintypes
from pathlib import Path

CLASSE_DE_LIMITES_ESTENDIDOS = 9  # JobObjectExtendedLimitInformation
ENCERRAR_AO_FECHAR_O_JOB = 0x2000  # JOB_OBJECT_LIMIT_KILL_ON_JOB_CLOSE


class _LimitesBasicos(ctypes.Structure):
    _fields_ = (
        ("tempo_de_usuario_por_processo", ctypes.c_int64),
        ("tempo_de_usuario_do_job", ctypes.c_int64),
        ("flags", wintypes.DWORD),
        ("memoria_minima", ctypes.c_size_t),
        ("memoria_maxima", ctypes.c_size_t),
        ("limite_de_processos_ativos", wintypes.DWORD),
        ("afinidade", ctypes.c_size_t),
        ("classe_de_prioridade", wintypes.DWORD),
        ("classe_de_agendamento", wintypes.DWORD),
    )


class _ContadoresDeEs(ctypes.Structure):
    _fields_ = tuple(
        (nome, ctypes.c_ulonglong) for nome in ("a", "b", "c", "d", "e", "f")
    )


class _LimitesEstendidos(ctypes.Structure):
    _fields_ = (
        ("basicos", _LimitesBasicos),
        ("contadores", _ContadoresDeEs),
        ("memoria_por_processo", ctypes.c_size_t),
        ("memoria_do_job", ctypes.c_size_t),
        ("pico_por_processo", ctypes.c_size_t),
        ("pico_do_job", ctypes.c_size_t),
    )


class JobDoWindows:
    def __init__(self, handle: int) -> None:
        self.handle = handle

    def adicionar(self, processo: "subprocess.Popen[bytes]") -> None:
        kernel32 = _kernel32()
        manipulador_do_processo = wintypes.HANDLE(int(processo._handle))  # type: ignore[attr-defined]
        if not kernel32.AssignProcessToJobObject(
            wintypes.HANDLE(self.handle), manipulador_do_processo
        ):
            raise OSError(
                f"não consegui colocar o processo {processo.pid} no Job Object (erro {ctypes.get_last_error()})"
            )

    def fechar(self) -> None:
        if self.handle:
            _kernel32().CloseHandle(wintypes.HANDLE(self.handle))
            self.handle = 0


def _kernel32() -> ctypes.WinDLL:  # type: ignore[name-defined,unused-ignore]
    biblioteca = ctypes.WinDLL("kernel32", use_last_error=True)  # type: ignore[attr-defined,unused-ignore]
    biblioteca.CreateJobObjectW.restype = wintypes.HANDLE
    biblioteca.CreateJobObjectW.argtypes = (wintypes.LPVOID, wintypes.LPCWSTR)
    biblioteca.SetInformationJobObject.argtypes = (
        wintypes.HANDLE,
        ctypes.c_int,
        wintypes.LPVOID,
        wintypes.DWORD,
    )
    biblioteca.AssignProcessToJobObject.argtypes = (wintypes.HANDLE, wintypes.HANDLE)
    biblioteca.CloseHandle.argtypes = (wintypes.HANDLE,)
    return biblioteca


def criar_job_que_encerra_os_filhos() -> JobDoWindows:
    kernel32 = _kernel32()
    handle = kernel32.CreateJobObjectW(None, None)
    if not handle:
        raise OSError(f"CreateJobObjectW falhou (erro {ctypes.get_last_error()})")
    limites = _LimitesEstendidos()
    limites.basicos.flags = ENCERRAR_AO_FECHAR_O_JOB
    if not kernel32.SetInformationJobObject(
        wintypes.HANDLE(handle),
        CLASSE_DE_LIMITES_ESTENDIDOS,
        ctypes.byref(limites),
        ctypes.sizeof(limites),
    ):
        raise OSError(
            f"SetInformationJobObject falhou (erro {ctypes.get_last_error()})"
        )
    return JobDoWindows(int(handle))


def iniciar_no_job(
    job: JobDoWindows, linha: list[str], arquivo_de_registro: Path | None
) -> "subprocess.Popen[bytes]":
    """Abre o processo (saída no registro, se houver) e o coloca no job."""
    if arquivo_de_registro is None:
        processo = subprocess.Popen(
            linha, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL
        )
    else:
        arquivo_de_registro.parent.mkdir(parents=True, exist_ok=True)
        with arquivo_de_registro.open("wb") as registro:
            processo = subprocess.Popen(
                linha, stdout=registro, stderr=subprocess.STDOUT
            )
    job.adicionar(processo)
    return processo
