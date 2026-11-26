"""Ficha da vitrine: contagem de testes que a vitrine mostra (change vitrine-viva, tarefa 3.4)."""

import importlib.util
from pathlib import Path
from types import ModuleType

CAMINHO_DO_SCRIPT = Path(__file__).parents[2] / "scripts" / "ficha_da_vitrine.py"
SAIDA_DO_PYTEST = "........ [100%]\n483 passed, 2 skipped, 14 warnings in 44.23s\n"
SAIDA_DO_VITEST = " Test Files  80 passed (80)\n      Tests  664 passed (664)\n   Start at  15:12:25\n"


def _carregar_script() -> ModuleType:
    especificacao = importlib.util.spec_from_file_location("ficha_da_vitrine", CAMINHO_DO_SCRIPT)
    assert especificacao is not None and especificacao.loader is not None
    modulo = importlib.util.module_from_spec(especificacao)
    especificacao.loader.exec_module(modulo)
    return modulo


def test_ficha_conta_os_testes_que_passaram_no_pytest_e_no_vitest() -> None:
    ficha = _carregar_script().montar_ficha(SAIDA_DO_PYTEST, SAIDA_DO_VITEST)
    assert ficha == {"testes": {"python": 483, "typescript": 664}}


def test_ficha_sem_contagem_reconhecivel_nao_inventa_numero() -> None:
    assert _carregar_script().montar_ficha("nada aqui", SAIDA_DO_VITEST) is None
