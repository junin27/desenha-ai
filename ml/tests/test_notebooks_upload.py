"""Notebooks do Colab: abrem o menu de upload quando falta arquivo, em vez de quebrar com AssertionError."""

import importlib.util
import json
import re
import subprocess
import sys
import types
from collections.abc import Callable
from pathlib import Path

import pytest

RAIZ = Path(__file__).parents[2]
NOTEBOOKS = ("01_redes_neurais_cnn_lstm", "02_slm_destilacao_dataset", "03_slm_finetuning_zedorabisco_v5")
ARQUIVOS_EXIGIDOS = {
    "01_redes_neurais_cnn_lstm": ("desenha_ml-*.whl",),
    "02_slm_destilacao_dataset": ("desenha_ml-*.whl", "modelos_redes.zip"),
    "03_slm_finetuning_zedorabisco_v5": ("desenha_ml-*.whl", "modelos_redes.zip", "dataset_slm.zip"),
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
        ("03_slm_finetuning_zedorabisco_v5", "metricas_slm.json"),
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
    celulas = _celulas_de_codigo("03_slm_finetuning_zedorabisco_v5")
    primeira_que_instala = next(i for i, c in enumerate(celulas) if "pip install unsloth" in c)
    conferencias = [i for i, c in enumerate(celulas) if "torch.cuda.is_available()" in c]

    assert conferencias and conferencias[0] < primeira_que_instala
    assert "Alterar o tipo" in celulas[conferencias[0]]  # a mensagem diz onde trocar o ambiente


def test_notebook_3_nao_passa_warmup_ratio_direto_ao_sftconfig() -> None:
    """Achado no Colab (24/11): o transformers novo removeu `warmup_ratio` (TypeError no SFTConfig)."""
    codigo = "\n".join(_celulas_de_codigo("03_slm_finetuning_zedorabisco_v5"))

    assert "warmup_ratio=" not in codigo
    # escolhe `warmup_ratio` ou `warmup_steps` conforme a versão instalada
    assert "dataclasses.fields(SFTConfig)" in codigo


def test_notebook_3_importa_o_unsloth_antes_de_trl_e_transformers() -> None:
    """O Unsloth avisa (e perde otimizações) se for importado depois do trl/transformers/peft."""
    celula = next(c for c in _celulas_de_codigo("03_slm_finetuning_zedorabisco_v5") if "from trl import" in c)

    assert celula.index("from unsloth import") < celula.index("from trl import")
    assert celula.index("from unsloth import") < celula.index("from datasets import")


def test_notebook_3_ja_vem_configurado_para_a_rodada_completa() -> None:
    """O ensaio foi feito em 24/11; o padrão agora é a rodada completa, que gera o GGUF do Zé."""
    codigo = "\n".join(_celulas_de_codigo("03_slm_finetuning_zedorabisco_v5"))

    assert re.search(r"^MODO_ENSAIO = False\b", codigo, flags=re.MULTILINE)


def test_notebook_3_diz_no_fim_onde_estao_o_gguf_e_o_que_fazer_com_ele() -> None:
    ultima = _celulas_de_codigo("03_slm_finetuning_zedorabisco_v5")[-1]

    assert "zedorabisco-1.7b-Q4_K_M.gguf" in ultima
    assert "notebooks" in ultima and "resultados" in ultima  # onde colocar os arquivos baixados
    assert "criterio.aprovado" in ultima  # avisa se o critério reprovou, para não seguir com um Zé fraco


def test_checagem_de_gpu_mostra_o_diagnostico_do_nvidia_smi() -> None:
    """Sem GPU, o erro precisa mostrar o que o Colab realmente alocou (e não só mandar trocar o tipo)."""
    celulas = _celulas_de_codigo("03_slm_finetuning_zedorabisco_v5")
    conferencia = next(c for c in celulas if "torch.cuda.is_available()" in c)

    assert "nvidia-smi" in conferencia and "subprocess" in conferencia
    assert "cota" in conferencia  # cita a cota diária como causa provável


def test_checagem_de_gpu_nao_quebra_quando_o_nvidia_smi_nao_existe(monkeypatch: pytest.MonkeyPatch) -> None:
    """Achado no Colab (24/11): sem GPU o nvidia-smi nem existe e o subprocess levantava FileNotFoundError."""

    def sem_nvidia_smi(*_argumentos: object, **_opcoes: object) -> None:
        raise FileNotFoundError(2, "No such file or directory", "nvidia-smi")

    monkeypatch.setattr(subprocess, "run", sem_nvidia_smi)
    celulas = _celulas_de_codigo("03_slm_finetuning_zedorabisco_v5")
    conferencia = next(c for c in celulas if "torch.cuda.is_available()" in c)
    saida: list[str] = []

    class FalsoTorch:
        class cuda:  # noqa: N801 - imita o módulo torch.cuda
            @staticmethod
            def is_available() -> bool:
                return False

    monkeypatch.setitem(sys.modules, "torch", types.SimpleNamespace(cuda=FalsoTorch.cuda))
    espaco: dict[str, object] = {"print": lambda *args: saida.append(" ".join(map(str, args)))}
    with pytest.raises(RuntimeError, match="Sem GPU"):
        exec(compile(conferencia, "celula", "exec"), espaco)

    assert any("nvidia-smi" in linha and "não encontrado" in linha for linha in saida)


def test_notebook_3_instala_o_wheel_sem_mexer_no_torch_e_confere_o_import() -> None:
    """Achado no Colab (24/11, noite): `No module named 'desenha_ml'`; o `-q` escondia o motivo."""
    celulas = _celulas_de_codigo("03_slm_finetuning_zedorabisco_v5")
    instalacao = next(c for c in celulas if "desenha_ml-*.whl" in c and "RODA" in c)

    assert "--no-deps" in instalacao  # só precisa do numpy; o pip não deve mexer no torch do Unsloth
    assert "-q " not in instalacao  # o erro do pip tem de aparecer
    assert 'import_module("desenha_ml")' in instalacao  # falha aqui, com mensagem clara


def test_notebook_3_para_antes_de_treinar_se_o_packing_juntou_conversas() -> None:
    """Rodada de 24/11 (noite) usou um .ipynb antigo: packing ligado de novo (363 conversas → 110 linhas)."""
    codigo = "\n".join(_celulas_de_codigo("03_slm_finetuning_zedorabisco_v5"))
    trava = codigo.index("len(trainer.train_dataset) == len(ds_treino)")

    assert "packing=False" in codigo
    assert trava < codigo.index("trainer.train()")


def test_notebook_3_treina_5_epocas() -> None:
    """Rodada v3 (24/11): 3 épocas deixaram o Zé subtreinado; decisão do usuário (fine-tuning-do-ze D3)."""
    codigo = "\n".join(_celulas_de_codigo("03_slm_finetuning_zedorabisco_v5"))

    assert "num_train_epochs=5" in codigo


def test_notebook_3_baixa_tudo_em_vez_de_usar_o_drive() -> None:
    """Pedido do usuário (24/11): sem Drive; o GGUF e os resultados saem por download."""
    celulas = _celulas_de_codigo("03_slm_finetuning_zedorabisco_v5")
    codigo = "\n".join(celulas)

    assert "drive.mount" not in codigo and "MyDrive" not in codigo
    assert re.search(r"^baixar_com_menu\(ZIP_DOS_RESULTADOS\)$", codigo, flags=re.MULTILINE)
    # o GGUF tem célula própria: dá para repetir só o download se o navegador falhar
    celula_do_gguf = next(c for c in celulas if "baixar_com_menu(GGUF_DO_ZE)" in c)
    assert "zipfile" not in celula_do_gguf


def test_notebook_3_conta_parametros_sem_duplicar_embeddings_amarrados() -> None:
    """Diagnóstico de 25/11: somar `parameter_count` dava 2,03 bi em vez de 1,72 bi (spec modelo-do-ze)."""
    codigo = "\n".join(_celulas_de_codigo("03_slm_finetuning_zedorabisco_v5"))

    assert "N_PARAMETROS = sum(" not in codigo
    assert "contar_parametros_unicos(" in codigo and "tie_word_embeddings" in codigo
