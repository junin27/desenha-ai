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


def _com_colab_falso(
    monkeypatch: pytest.MonkeyPatch, colab: ColabFalso, tela: "TelaFalsa | None" = None
) -> Callable[..., None]:
    """Instala `google.colab` e `IPython.display` falsos: a célula dos notebooks importa os dois."""
    tela = tela or TelaFalsa()
    google, pacote_colab = types.ModuleType("google"), types.ModuleType("google.colab")
    pacote_colab.files = colab  # type: ignore[attr-defined]
    ipython, exibicao = types.ModuleType("IPython"), types.ModuleType("IPython.display")
    exibicao.HTML, exibicao.display = tela.HTML, tela.display  # type: ignore[attr-defined]
    for nome, modulo in (
        ("google", google),
        ("google.colab", pacote_colab),
        ("IPython", ipython),
        ("IPython.display", exibicao),
    ):
        monkeypatch.setitem(sys.modules, nome, modulo)
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


class ColabComDownloadFalso(ColabFalso):
    def __init__(self, pasta: Path) -> None:
        super().__init__(pasta, [])
        self.baixados: list[str] = []

    def download(self, caminho: str) -> None:
        self.baixados.append(caminho)


class TelaFalsa:
    """`IPython.display` simulado: guarda o HTML que o notebook mostraria."""

    def __init__(self) -> None:
        self.exibidos: list[str] = []

    def HTML(self, texto: str) -> str:  # noqa: N802 - nome da classe real
        return texto

    def display(self, objeto: str) -> None:
        self.exibidos.append(objeto)


def _funcao_de_baixar(
    monkeypatch: pytest.MonkeyPatch, colab: ColabComDownloadFalso, tela: TelaFalsa
) -> Callable[..., None]:
    _com_colab_falso(monkeypatch, colab, tela)
    celula = next(c for c in _celulas_de_codigo(NOTEBOOKS[0]) if "def baixar_com_menu" in c)
    espaco: dict[str, object] = {}
    exec(compile(celula, "celula", "exec"), espaco)
    funcao = espaco["baixar_com_menu"]
    assert callable(funcao)
    return funcao


def test_arquivo_pequeno_mostra_botao_que_abre_a_janela_de_salvar_como(
    tmp_path: Path, monkeypatch: pytest.MonkeyPatch
) -> None:
    arquivo = tmp_path / "modelos_redes.zip"
    arquivo.write_bytes(b"conteudo")
    colab, tela = ColabComDownloadFalso(tmp_path), TelaFalsa()

    _funcao_de_baixar(monkeypatch, colab, tela)(str(arquivo))

    assert len(tela.exibidos) == 1 and colab.baixados == []
    html = tela.exibidos[0]
    assert "showSaveFilePicker" in html and "modelos_redes.zip" in html
    assert "Y29udGV1ZG8=" in html  # base64 de "conteudo": o arquivo vai dentro do botão


def test_se_o_navegador_nao_abre_a_janela_o_botao_cai_no_download_normal(
    tmp_path: Path, monkeypatch: pytest.MonkeyPatch
) -> None:
    arquivo = tmp_path / "metricas_slm.json"
    arquivo.write_bytes(b"{}")
    colab, tela = ColabComDownloadFalso(tmp_path), TelaFalsa()

    _funcao_de_baixar(monkeypatch, colab, tela)(str(arquivo))

    assert "a.download" in tela.exibidos[0]  # plano B no próprio botão


def test_arquivo_grande_demais_para_o_botao_usa_o_download_normal(
    tmp_path: Path, monkeypatch: pytest.MonkeyPatch
) -> None:
    arquivo = tmp_path / "grande.bin"
    arquivo.write_bytes(b"0" * 10)
    colab, tela = ColabComDownloadFalso(tmp_path), TelaFalsa()
    baixar = _funcao_de_baixar(monkeypatch, colab, tela)
    baixar.__globals__["LIMITE_DO_BOTAO_EM_BYTES"] = 5

    baixar(str(arquivo))

    assert colab.baixados == [str(arquivo)] and tela.exibidos == []


@pytest.mark.parametrize(
    ("nome", "arquivo"),
    [
        ("01_redes_neurais_cnn_lstm", "modelos_redes.zip"),
        ("02_slm_destilacao_dataset", "dataset_slm.zip"),
        ("03_slm_finetuning_qlora_gguf", "metricas_slm.json"),
    ],
)
def test_notebook_entrega_o_arquivo_pelo_menu_de_salvar_e_nao_pelo_download_direto(
    nome: str, arquivo: str
) -> None:
    codigo = "\n".join(_celulas_de_codigo(nome))

    assert codigo.count("files.download(") == 1  # só dentro de baixar_com_menu (arquivos grandes)
    assert re.search(r"^baixar_com_menu\(.*\)$", codigo, flags=re.MULTILINE)
    assert arquivo in codigo


def test_notebook_3_confere_a_gpu_antes_de_instalar_o_unsloth() -> None:
    """Achado no Colab (24/11): sem GPU o notebook gastava a instalação e quebrava num erro obscuro."""
    celulas = _celulas_de_codigo("03_slm_finetuning_qlora_gguf")
    primeira_que_instala = next(i for i, c in enumerate(celulas) if "pip install unsloth" in c)
    conferencias = [i for i, c in enumerate(celulas) if "torch.cuda.is_available()" in c]

    assert conferencias and conferencias[0] < primeira_que_instala
    assert "Alterar o tipo" in celulas[conferencias[0]]  # a mensagem diz onde trocar o ambiente


def test_notebook_3_nao_passa_warmup_ratio_direto_ao_sftconfig() -> None:
    """Achado no Colab (24/11): o transformers novo removeu `warmup_ratio` (TypeError no SFTConfig)."""
    codigo = "\n".join(_celulas_de_codigo("03_slm_finetuning_qlora_gguf"))

    assert "warmup_ratio=" not in codigo
    # escolhe `warmup_ratio` ou `warmup_steps` conforme a versão instalada
    assert "dataclasses.fields(SFTConfig)" in codigo


def test_notebook_3_importa_o_unsloth_antes_de_trl_e_transformers() -> None:
    """O Unsloth avisa (e perde otimizações) se for importado depois do trl/transformers/peft."""
    celula = next(c for c in _celulas_de_codigo("03_slm_finetuning_qlora_gguf") if "from trl import" in c)

    assert celula.index("from unsloth import") < celula.index("from trl import")
    assert celula.index("from unsloth import") < celula.index("from datasets import")
