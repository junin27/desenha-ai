"""Notebooks do Colab: abrem o menu de upload quando falta arquivo, em vez de quebrar com AssertionError."""

import importlib.util
import json
import re
import sys
import types
from collections.abc import Callable
from pathlib import Path

import pytest

RAIZ = Path(__file__).parents[2]
NOTEBOOKS = ("01_redes_neurais_cnn_lstm", "02_slm_destilacao_dataset", "03_slm_finetuning_qlora_gguf")
ARQUIVOS_EXIGIDOS = {
    "01_redes_neurais_cnn_lstm": ("desenha_ml-*.whl",),
    "02_slm_destilacao_dataset": ("desenha_ml-*.whl", "modelos_redes.zip"),
    "03_slm_finetuning_qlora_gguf": ("desenha_ml-*.whl", "modelos_redes.zip", "dataset_slm.zip"),
}


def _carregar_gerador() -> types.ModuleType:
    especificacao = importlib.util.spec_from_file_location(
        "gerar_notebooks", RAIZ / "scripts" / "gerar_notebooks.py"
    )
    assert especificacao is not None and especificacao.loader is not None
    modulo = importlib.util.module_from_spec(especificacao)
    especificacao.loader.exec_module(modulo)
    return modulo


def _celulas_de_codigo(nome: str) -> list[str]:
    gerador = _carregar_gerador()
    fonte = (RAIZ / "notebooks" / "fontes" / f"{nome}.py").read_text(encoding="utf8")
    return ["".join(c["source"]) for c in gerador.celulas_da_fonte(fonte) if c["cell_type"] == "code"]


@pytest.mark.parametrize("nome", NOTEBOOKS)
def test_notebook_gerado_esta_atualizado_com_a_fonte(nome: str) -> None:
    gerador = _carregar_gerador()
    fonte = (RAIZ / "notebooks" / "fontes" / f"{nome}.py").read_text(encoding="utf8")
    esperado = json.loads(json.dumps(gerador.notebook(gerador.celulas_da_fonte(fonte)), ensure_ascii=False))

    gerado = json.loads((RAIZ / "notebooks" / f"{nome}.ipynb").read_text(encoding="utf8"))

    assert gerado == esperado, f"{nome}.ipynb desatualizado; rode scripts/gerar_notebooks.py"


@pytest.mark.parametrize("nome", NOTEBOOKS)
def test_notebook_pede_os_arquivos_que_precisa_pelo_menu_de_upload(nome: str) -> None:
    codigo = "\n".join(_celulas_de_codigo(nome))

    assert "assert RODA" not in codigo
    chamadas = " ".join(re.findall(r"^exigir_arquivos\((.*)\)$", codigo, flags=re.MULTILINE))
    for arquivo in ARQUIVOS_EXIGIDOS[nome]:
        assert f'"{arquivo}"' in chamadas


def _carregar_funcao_do_notebook() -> Callable[..., None]:
    celula = next(c for c in _celulas_de_codigo(NOTEBOOKS[0]) if "def exigir_arquivos" in c)
    espaco: dict[str, object] = {}
    exec(compile(celula, "celula", "exec"), espaco)
    funcao = espaco["exigir_arquivos"]
    assert callable(funcao)
    return funcao


class ColabFalso:
    """`files.upload()` simulado: cada chamada grava os arquivos da vez na pasta e devolve os nomes."""

    def __init__(self, pasta: Path, rodadas: list[list[str]]) -> None:
        self.pasta, self.rodadas, self.chamadas = pasta, rodadas, 0

    def upload(self) -> dict[str, bytes]:
        enviados = self.rodadas[self.chamadas] if self.chamadas < len(self.rodadas) else []
        self.chamadas += 1
        for nome in enviados:
            (self.pasta / nome).write_bytes(b"x")
        return {nome: b"x" for nome in enviados}


def _com_colab_falso(monkeypatch: pytest.MonkeyPatch, colab: ColabFalso) -> Callable[..., None]:
    google = types.ModuleType("google")
    pacote_colab = types.ModuleType("google.colab")
    pacote_colab.files = colab  # type: ignore[attr-defined]
    monkeypatch.setitem(sys.modules, "google", google)
    monkeypatch.setitem(sys.modules, "google.colab", pacote_colab)
    return _carregar_funcao_do_notebook()


def test_arquivo_que_ja_esta_na_pasta_nao_abre_o_menu(
    tmp_path: Path, monkeypatch: pytest.MonkeyPatch
) -> None:
    (tmp_path / "desenha_ml-0.1.0-py3-none-any.whl").write_bytes(b"x")
    colab = ColabFalso(tmp_path, [])
    exigir = _com_colab_falso(monkeypatch, colab)
    exigir.__globals__["PASTA_DOS_ARQUIVOS"] = str(tmp_path)

    exigir("desenha_ml-*.whl")

    assert colab.chamadas == 0


def test_arquivo_faltando_abre_o_menu_ate_todos_chegarem(
    tmp_path: Path, monkeypatch: pytest.MonkeyPatch
) -> None:
    colab = ColabFalso(tmp_path, [["desenha_ml-0.1.0-py3-none-any.whl"], ["modelos_redes.zip"]])
    exigir = _com_colab_falso(monkeypatch, colab)
    exigir.__globals__["PASTA_DOS_ARQUIVOS"] = str(tmp_path)

    exigir("desenha_ml-*.whl", "modelos_redes.zip")

    assert colab.chamadas == 2


def test_menu_fechado_sem_enviar_nada_vira_erro_com_o_que_faltou(
    tmp_path: Path, monkeypatch: pytest.MonkeyPatch
) -> None:
    colab = ColabFalso(tmp_path, [[]])
    exigir = _com_colab_falso(monkeypatch, colab)
    exigir.__globals__["PASTA_DOS_ARQUIVOS"] = str(tmp_path)

    with pytest.raises(FileNotFoundError, match=r"modelos_redes\.zip"):
        exigir("modelos_redes.zip")
