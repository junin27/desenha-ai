"""Requisito "Contrato entre Python e TypeScript" — spec pre-processamento-de-desenho."""

import json
from pathlib import Path

from desenha_ml.contratos import CASOS_OBRIGATORIOS, gerar_contrato_de_pre_processamento
from desenha_ml.contratos_conversa import FALAS_COMPLETAS, gerar_contrato_da_conversa
from desenha_ml.contratos_prompt import gerar_contrato_do_prompt
from desenha_ml.contratos_regras import gerar_contrato_de_regras
from desenha_ml.desenho import Desenho

CONTRATO_VERSIONADO = Path(__file__).parents[2] / "contratos" / "pre_processamento.json"


def test_contrato_cobre_os_casos_exigidos_pela_spec(desenhos_da_amostra: list[tuple[str, Desenho]]) -> None:
    contrato = gerar_contrato_de_pre_processamento(desenhos_da_amostra)
    nomes = {caso["nome"] for caso in contrato["casos"]}
    assert set(CASOS_OBRIGATORIOS) <= nomes
    assert any(nome.startswith("quickdraw_") for nome in nomes)


def test_cada_caso_traz_todas_as_saidas(desenhos_da_amostra: list[tuple[str, Desenho]]) -> None:
    for caso in gerar_contrato_de_pre_processamento(desenhos_da_amostra)["casos"]:
        assert {"tracos", "normalizado", "capturado", "prefixo", "imagem", "sequencia"} <= caso.keys()
        assert len(caso["imagem"]) == 28 * 28
        assert caso["prefixo"]["fracao"] == 0.5


def test_contrato_versionado_esta_atualizado(desenhos_da_amostra: list[tuple[str, Desenho]]) -> None:
    gerado = gerar_contrato_de_pre_processamento(desenhos_da_amostra)
    versionado = json.loads(CONTRATO_VERSIONADO.read_text(encoding="utf8"))
    assert versionado == gerado, (
        "contratos/pre_processamento.json está desatualizado; rode "
        "`ml/.venv/Scripts/python -m desenha_ml.contratos contratos/`"
    )


CONTRATO_DE_REGRAS = Path(__file__).parents[2] / "contratos" / "regras.json"
SECOES_DE_REGRAS = {
    "ensemble",
    "top_k",
    "veredito",
    "vitoria_antecipada",
    "pontos_da_rodada",
    "nome",
    "placar",
    "forma_comparavel",
    "vazamento",
}


def _contrato_de_regras_em_json() -> dict[str, list[dict[str, object]]]:
    """O contrato como o TypeScript o lê: depois de serializar em JSON."""
    contrato: dict[str, list[dict[str, object]]] = json.loads(json.dumps(gerar_contrato_de_regras()))
    return contrato


def test_contrato_de_regras_tem_todas_as_secoes() -> None:
    contrato = _contrato_de_regras_em_json()
    assert contrato.keys() >= SECOES_DE_REGRAS
    assert all(len(contrato[secao]) > 0 for secao in SECOES_DE_REGRAS)


def test_contrato_de_regras_cobre_erros_e_o_plural_das_30_categorias() -> None:
    contrato = _contrato_de_regras_em_json()
    resultados = [
        caso["resultado"] for secao in ("ensemble", "top_k", "veredito") for caso in contrato[secao]
    ]
    codigos = {r["codigo"] for r in resultados if isinstance(r, dict) and r["ok"] is False}
    assert {"probabilidades_invalidas", "peso_invalido", "k_invalido", "alvo_invalido"} <= codigos
    assert sum(1 for caso in contrato["vazamento"] if str(caso["texto"]).startswith("Desenhei ")) == 30


TOLERANCIA_DOS_FLOATS = (
    1e-12  # numpy/CPU diferentes erram o último bit (~1e-17); o TypeScript também usa tolerância
)


def _iguais_com_tolerancia(esperado: object, obtido: object) -> bool:
    """Igualdade estrutural em que só floats têm tolerância; texto, inteiros e booleanos são exatos."""
    if isinstance(esperado, float) and isinstance(obtido, float):
        return abs(esperado - obtido) <= TOLERANCIA_DOS_FLOATS
    if isinstance(esperado, dict) and isinstance(obtido, dict):
        return esperado.keys() == obtido.keys() and all(
            _iguais_com_tolerancia(valor, obtido[chave]) for chave, valor in esperado.items()
        )
    if isinstance(esperado, list) and isinstance(obtido, list):
        return len(esperado) == len(obtido) and all(
            _iguais_com_tolerancia(a, b) for a, b in zip(esperado, obtido, strict=True)
        )
    return bool(esperado == obtido) and type(esperado) is type(obtido)


def test_comparacao_do_contrato_tolera_so_o_ultimo_bit_dos_floats() -> None:
    assert _iguais_com_tolerancia({"p": [0.5, 1]}, {"p": [0.5 + 3e-17, 1]})
    assert not _iguais_com_tolerancia({"p": [0.5]}, {"p": [0.5001]})
    assert not _iguais_com_tolerancia({"p": [1]}, {"p": [1.0]})
    assert not _iguais_com_tolerancia({"p": "a"}, {"p": "b"})
    assert not _iguais_com_tolerancia({"p": 1}, {"q": 1})


def test_contrato_de_regras_versionado_esta_atualizado() -> None:
    versionado = json.loads(CONTRATO_DE_REGRAS.read_text(encoding="utf8"))
    assert _iguais_com_tolerancia(versionado, _contrato_de_regras_em_json()), (
        "contratos/regras.json está desatualizado; rode "
        "`ml/.venv/Scripts/python -m desenha_ml.contratos contratos/`"
    )


CONTRATO_DA_CONVERSA = Path(__file__).parents[2] / "contratos" / "conversa.json"


def test_contrato_da_conversa_cobre_todos_os_prefixos() -> None:
    contrato = json.loads(json.dumps(gerar_contrato_da_conversa()))
    esperado = sum(len(fala) + 1 for fala in FALAS_COMPLETAS)
    assert len(contrato["ler_parcial"]) == esperado
    assert {caso["etapa"] for caso in contrato["ler_parcial"]} == {"pensando", "respondendo", "completa"}


def test_contrato_da_conversa_versionado_esta_atualizado() -> None:
    versionado = json.loads(CONTRATO_DA_CONVERSA.read_text(encoding="utf8"))
    assert versionado == json.loads(json.dumps(gerar_contrato_da_conversa())), (
        "contratos/conversa.json está desatualizado; rode "
        "`ml/.venv/Scripts/python -m desenha_ml.contratos contratos/`"
    )


CONTRATO_DO_PROMPT = Path(__file__).parents[2] / "contratos" / "prompt_qwen.json"


def test_contrato_do_prompt_versionado_esta_atualizado() -> None:
    versionado = json.loads(CONTRATO_DO_PROMPT.read_text(encoding="utf8"))
    gerado = json.loads(json.dumps(gerar_contrato_do_prompt()))
    assert len(gerado["casos"]) == 4
    assert versionado == gerado, (
        "contratos/prompt_qwen.json está desatualizado; rode "
        "`ml/.venv/Scripts/python -m desenha_ml.contratos contratos/`"
    )
