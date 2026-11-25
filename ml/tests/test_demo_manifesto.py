"""Requisitos "Manifesto da demo", "Downloads com versão fixada" e "Zé destilado ou modo ensaio"."""

import json
from collections.abc import Mapping

import pytest

from desenha_ml.demo.manifesto import (
    ArquivoDaDemo,
    Divergencia,
    Manifesto,
    arquivos_a_refazer,
    comparar_com_o_disco,
    manifesto_de_json,
    manifesto_para_json,
    montar_manifesto,
    sha256_de_blocos,
)
from desenha_ml.resultado import Erro, Ok

SHA_VAZIO = "e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855"
CAMINHO_BASE = "modelos/qwen3-1.7b-base-Q4_K_M.gguf"
CAMINHO_ZE = "modelos/zedorabisco-1.7b-Q4_K_M.gguf"
CAMINHO_SERVIDOR = "llama/llama-server.exe"


class DiscoFalso:
    """Disco em memória: caminho -> (tamanho, sha256). O hash só é pedido se o tamanho bater."""

    def __init__(self, arquivos: Mapping[str, tuple[int, str]]) -> None:
        self.arquivos = arquivos
        self.hashes_calculados: list[str] = []

    def tamanho(self, caminho: str) -> int | None:
        achado = self.arquivos.get(caminho)
        return None if achado is None else achado[0]

    def sha256(self, caminho: str) -> str:
        self.hashes_calculados.append(caminho)
        return self.arquivos[caminho][1]


def _arquivo(caminho: str, tamanho: int, sha256: str) -> ArquivoDaDemo:
    return ArquivoDaDemo(caminho=caminho, tamanho=tamanho, sha256=sha256)


def _manifesto_completo() -> Manifesto:
    return montar_manifesto(
        versao_do_llama_cpp="b9999",
        origem_do_gguf_base="unsloth/Qwen3-1.7B-GGUF:Qwen3-1.7B-Q4_K_M.gguf",
        arquivos_comuns=(
            _arquivo(CAMINHO_SERVIDOR, 100, "aa"),
            _arquivo(CAMINHO_BASE, 1_100, "bb"),
            _arquivo("jogo/index.html", 10, "cc"),
        ),
        gguf_do_ze=_arquivo(CAMINHO_ZE, 1_000, "dd"),
    )


def _disco_igual_ao_manifesto(manifesto: Manifesto) -> DiscoFalso:
    return DiscoFalso({a.caminho: (a.tamanho, a.sha256) for a in manifesto.arquivos})


def test_manifesto_completo_sem_divergencias_quando_o_disco_bate() -> None:
    manifesto = _manifesto_completo()

    divergencias = comparar_com_o_disco(manifesto, _disco_igual_ao_manifesto(manifesto))

    assert divergencias == []
    assert {a.caminho for a in manifesto.arquivos} >= {CAMINHO_SERVIDOR, CAMINHO_BASE, CAMINHO_ZE}
    assert manifesto.versao_do_llama_cpp == "b9999"
    assert "Qwen3-1.7B" in manifesto.origem_do_gguf_base


def test_arquivo_ausente_e_apontado_pelo_nome() -> None:
    manifesto = _manifesto_completo()
    disco = DiscoFalso(
        {a.caminho: (a.tamanho, a.sha256) for a in manifesto.arquivos if a.caminho != CAMINHO_BASE}
    )

    divergencias = comparar_com_o_disco(manifesto, disco)

    assert divergencias == [
        Divergencia(caminho=CAMINHO_BASE, motivo="ausente", detalhe=divergencias[0].detalhe)
    ]
    assert CAMINHO_BASE in divergencias[0].detalhe


def test_tamanho_diferente_diz_o_que_veio_e_o_que_se_esperava_sem_calcular_hash() -> None:
    manifesto = _manifesto_completo()
    arquivos = {a.caminho: (a.tamanho, a.sha256) for a in manifesto.arquivos}
    arquivos[CAMINHO_BASE] = (500, "bb")
    disco = DiscoFalso(arquivos)

    divergencias = comparar_com_o_disco(manifesto, disco)

    assert [d.motivo for d in divergencias] == ["tamanho"]
    assert "500" in divergencias[0].detalhe and "1100" in divergencias[0].detalhe
    assert CAMINHO_BASE not in disco.hashes_calculados


def test_arquivo_corrompido_com_mesmo_tamanho_e_pego_pelo_sha256() -> None:
    manifesto = _manifesto_completo()
    arquivos = {a.caminho: (a.tamanho, a.sha256) for a in manifesto.arquivos}
    arquivos[CAMINHO_ZE] = (1_000, "ee")

    divergencias = comparar_com_o_disco(manifesto, DiscoFalso(arquivos))

    assert [(d.caminho, d.motivo) for d in divergencias] == [(CAMINHO_ZE, "hash")]


def test_preparacao_repetida_nao_refaz_nada_quando_tudo_esta_integro() -> None:
    manifesto = _manifesto_completo()

    divergencias = comparar_com_o_disco(manifesto, _disco_igual_ao_manifesto(manifesto))

    assert arquivos_a_refazer(divergencias) == []


def test_preparacao_repetida_refaz_so_o_que_divergiu() -> None:
    divergencias = [
        Divergencia(caminho=CAMINHO_BASE, motivo="ausente", detalhe="x"),
        Divergencia(caminho=CAMINHO_ZE, motivo="hash", detalhe="y"),
    ]

    assert arquivos_a_refazer(divergencias) == [CAMINHO_BASE, CAMINHO_ZE]


def test_sem_o_gguf_do_ze_o_manifesto_registra_o_modo_ensaio_e_avisa() -> None:
    manifesto = montar_manifesto(
        versao_do_llama_cpp="b9999",
        origem_do_gguf_base="unsloth/Qwen3-1.7B-GGUF:Qwen3-1.7B-Q4_K_M.gguf",
        arquivos_comuns=(_arquivo(CAMINHO_BASE, 1_100, "bb"),),
        gguf_do_ze=None,
    )

    assert manifesto.modo_ensaio is True
    assert "Zé destilado está faltando" in manifesto.aviso_de_modo_ensaio
    assert all(a.caminho != CAMINHO_ZE for a in manifesto.arquivos)


def test_com_o_gguf_do_ze_nao_ha_modo_ensaio() -> None:
    manifesto = _manifesto_completo()

    assert manifesto.modo_ensaio is False
    assert manifesto.aviso_de_modo_ensaio == ""


def test_manifesto_vai_e_volta_pelo_json() -> None:
    manifesto = _manifesto_completo()

    lido = manifesto_de_json(manifesto_para_json(manifesto))

    assert lido == Ok(manifesto)


@pytest.mark.parametrize("texto", ["não é json", "[]", '{"versao_do_llama_cpp": "b1"}'])
def test_json_invalido_vira_erro_com_o_valor_recebido(texto: str) -> None:
    lido = manifesto_de_json(texto)

    assert isinstance(lido, Erro)
    assert lido.codigo == "formato_invalido"
    assert texto[:20] in lido.detalhe


def test_sha256_de_blocos_bate_com_o_valor_conhecido() -> None:
    assert sha256_de_blocos([]) == SHA_VAZIO
    assert sha256_de_blocos([b"ab", b"c"]) == sha256_de_blocos([b"abc"])


def test_mesma_quantizacao_manifesto_registra_a_origem_do_gguf_do_ze() -> None:
    manifesto = montar_manifesto(
        versao_do_llama_cpp="b9999",
        origem_do_gguf_base="unsloth/Qwen3-1.7B-GGUF:Qwen3-1.7B-Q8_0.gguf",
        arquivos_comuns=(_arquivo(CAMINHO_BASE, 1_100, "bb"),),
        gguf_do_ze=_arquivo(CAMINHO_ZE, 1_000, "dd"),
        origem_do_gguf_do_ze="zedorabisco-1.7b-Q8_0.gguf",
    )

    lido = manifesto_de_json(manifesto_para_json(manifesto))

    assert isinstance(lido, Ok)
    assert lido.valor.origem_do_gguf_do_ze == "zedorabisco-1.7b-Q8_0.gguf"


def test_mesma_quantizacao_manifesto_antigo_sem_a_origem_do_ze_continua_valido() -> None:
    antigo = json.loads(manifesto_para_json(_manifesto_completo()))
    del antigo["origem_do_gguf_do_ze"]

    lido = manifesto_de_json(json.dumps(antigo))

    assert isinstance(lido, Ok)
    assert lido.valor.origem_do_gguf_do_ze is None
