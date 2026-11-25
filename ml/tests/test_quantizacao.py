"""Requisito "Tabela de quantização" — spec modelo-do-ze (conta da atividade 1 aplicada ao Zé)."""

import pytest

from desenha_ml.quantizacao import MEMORIA_LIVRE_GB, contar_parametros_unicos, tabela_de_quantizacao

DOIS_BILHOES = 2.03e9


def test_cenario_de_2_bilhoes_de_parametros() -> None:
    linhas = {linha.formato: linha for linha in tabela_de_quantizacao(DOIS_BILHOES, tamanhos_reais_gb={})}
    assert pytest.approx(2.8) == MEMORIA_LIVRE_GB
    assert linhas["FP32"].teorico_gb == pytest.approx(8.12)
    assert linhas["FP16/BF16"].teorico_gb == pytest.approx(4.06)
    assert linhas["INT8"].teorico_gb == pytest.approx(2.03)
    assert linhas["INT4"].teorico_gb == pytest.approx(1.015)
    assert [linhas[f].cabe for f in ("FP32", "FP16/BF16", "INT8", "INT4")] == [False, False, True, True]
    assert linhas["INT8"].margem_gb == pytest.approx(0.77)
    assert linhas["INT4"].margem_gb == pytest.approx(1.785)


def test_margem_negativa_quando_nao_cabe() -> None:
    fp16 = next(linha for linha in tabela_de_quantizacao(DOIS_BILHOES, {}) if linha.formato == "FP16/BF16")
    assert fp16.margem_gb == pytest.approx(-1.26)


def test_tamanhos_reais_dos_gguf_ao_lado() -> None:
    reais = {"INT8": 2.17, "INT4": 1.28}
    linhas = {linha.formato: linha for linha in tabela_de_quantizacao(DOIS_BILHOES, reais)}
    assert linhas["INT4"].real_gb == 1.28 and linhas["INT8"].real_gb == 2.17
    assert linhas["FP32"].real_gb is None


def test_cenario_da_atividade_1() -> None:
    # 3,2 bilhões de parâmetros: só o INT4 cabia, com 1,2 GB de margem
    linhas = {linha.formato: linha for linha in tabela_de_quantizacao(3.2e9, {})}
    assert [linhas[f].cabe for f in ("FP32", "FP16/BF16", "INT8", "INT4")] == [False, False, False, True]
    assert linhas["INT4"].margem_gb == pytest.approx(1.2)


def test_contagem_qwen3_com_embeddings_amarrados_conta_o_lm_head_uma_vez() -> None:
    lado = 151_936 * 2_048
    formas = {
        "model.embed_tokens.weight": (151_936, 2_048),
        "lm_head.weight": (151_936, 2_048),
        "model.layers.pesos": (2_031_739_904 - 2 * lado,),
    }

    assert contar_parametros_unicos(formas, embeddings_amarrados=True) == 1_720_574_976


def test_contagem_com_embeddings_nao_amarrados_soma_o_lm_head() -> None:
    formas = {"model.embed_tokens.weight": (10, 4), "lm_head.weight": (10, 4), "camada": (3, 2)}

    assert contar_parametros_unicos(formas, embeddings_amarrados=False) == 86
