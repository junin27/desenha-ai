"""Scripts de conferência: leitura das vozes e pedido da fala real (spec checklist-do-evento)."""

import importlib.util
import io
import json
import sys
from collections.abc import Mapping, Sequence
from pathlib import Path
from types import ModuleType

import pytest

from desenha_ml.demo.checklist import VozInstalada, item_de_voz

CAMINHO_DO_SCRIPT = Path(__file__).parents[2] / "scripts" / "conferir_demo.py"
CHAVE_ONECORE = r"SOFTWARE\Microsoft\Speech_OneCore\Voices\Tokens"
CHAVE_SAPI = r"SOFTWARE\Microsoft\Speech\Voices\Tokens"


def _carregar_script() -> ModuleType:
    especificacao = importlib.util.spec_from_file_location("conferir_demo", CAMINHO_DO_SCRIPT)
    assert especificacao is not None and especificacao.loader is not None
    modulo = importlib.util.module_from_spec(especificacao)
    especificacao.loader.exec_module(modulo)
    return modulo


class RegistroFalso:
    """Registro do Windows simulado: chave -> subchaves, e (chave, valor) -> texto."""

    def __init__(
        self, subchaves: Mapping[str, Sequence[str]], valores: Mapping[tuple[str, str], str]
    ) -> None:
        self.subchaves_por_chave = subchaves
        self.valores = valores

    def subchaves(self, chave: str) -> list[str]:
        return list(self.subchaves_por_chave.get(chave, []))

    def valor(self, chave: str, nome: str) -> str | None:
        return self.valores.get((chave, nome))


def test_vozes_do_registro_junta_as_duas_chaves_com_nome_e_idioma() -> None:
    script = _carregar_script()
    registro = RegistroFalso(
        subchaves={CHAVE_ONECORE: ["MSTTS_V110_ptBR_Maria"], CHAVE_SAPI: ["TTS_MS_en-US_Zira_11.0"]},
        valores={
            (CHAVE_ONECORE + r"\MSTTS_V110_ptBR_Maria\Attributes", "Name"): "Microsoft Maria",
            (CHAVE_ONECORE + r"\MSTTS_V110_ptBR_Maria\Attributes", "Language"): "416",
            (CHAVE_SAPI + r"\TTS_MS_en-US_Zira_11.0\Attributes", "Name"): "Microsoft Zira",
            (CHAVE_SAPI + r"\TTS_MS_en-US_Zira_11.0\Attributes", "Language"): "409",
        },
    )

    vozes = script.vozes_do_registro(registro)

    assert VozInstalada("Microsoft Maria", "416") in vozes
    assert VozInstalada("Microsoft Zira", "409") in vozes
    assert item_de_voz(vozes).situacao == "ok"


def test_so_zira_em_ingles_vira_aviso() -> None:
    script = _carregar_script()
    registro = RegistroFalso(
        subchaves={CHAVE_SAPI: ["Zira"]},
        valores={
            (CHAVE_SAPI + r"\Zira\Attributes", "Language"): "409",
            (CHAVE_SAPI + r"\Zira\Attributes", "Name"): "Zira",
        },
    )

    assert item_de_voz(script.vozes_do_registro(registro)).situacao == "aviso"


def test_chave_sem_atributos_e_ignorada_sem_quebrar() -> None:
    script = _carregar_script()
    registro = RegistroFalso(subchaves={CHAVE_ONECORE: ["Quebrada"]}, valores={})

    assert script.vozes_do_registro(registro) == []


def test_pedido_da_charada_usa_o_prompt_do_qwen_e_a_parada() -> None:
    script = _carregar_script()

    corpo = json.loads(script.corpo_do_pedido_da_charada())

    assert corpo["prompt"].startswith("<|im_start|>system")
    assert "TAREFA: CHARADA" in corpo["prompt"]
    assert corpo["stop"] == ["<|im_end|>"]
    assert corpo["stream"] is False
    assert corpo["n_predict"] == 300


def test_pedir_charada_sem_servidor_devolve_none(tmp_path: Path) -> None:
    script = _carregar_script()

    assert script.pedir_charada(1) is None


def test_saida_em_cp1252_passa_a_imprimir_os_simbolos_do_checklist(monkeypatch: pytest.MonkeyPatch) -> None:
    """Regressão achada rodando: o console do Windows em cp1252 quebrava no ✗ (UnicodeEncodeError)."""
    bytes_da_saida = io.BytesIO()
    monkeypatch.setattr(sys, "stdout", io.TextIOWrapper(bytes_da_saida, encoding="cp1252"))

    _carregar_script().configurar_saida_em_utf8()
    print("✓ ✗ ⚠ →")
    sys.stdout.flush()

    assert bytes_da_saida.getvalue().decode("utf8").strip() == "✓ ✗ ⚠ →"


def test_porta_do_destilado_ocupada_por_outro_programa_pula_a_fala_sem_subir_servidor() -> None:
    """Achado no ensaio: um Apache na 8080 fazia o servidor temporário falhar com um erro confuso."""
    script = _carregar_script()

    item = script.item_da_fala_pulada({8080: "outro", 8081: "livre"}, divergencias=[])

    assert item is not None and item.situacao == "falha"
    assert "8080" in item.detalhe and "não testada" in item.detalhe


def test_fala_so_e_testada_com_arquivos_integros_e_portas_livres_ou_da_demo() -> None:
    script = _carregar_script()

    assert script.item_da_fala_pulada({8080: "livre", 8081: "da_demo"}, divergencias=[]) is None
    pulada = script.item_da_fala_pulada({8080: "livre"}, divergencias=[object()])
    assert pulada is not None and "arquivos" in pulada.detalhe
