"""Desenhos reais da vitrine (change vitrine-viva, spec `vitrine-da-abertura`, decisão D5)."""

import numpy as np

from desenha_ml.desenho import Desenho
from desenha_ml.vitrine import (
    CandidatoDaVitrine,
    escolher_desenhos_da_vitrine,
    exportar_vitrine,
    montar_arquivo_da_vitrine,
    primeiro_que_serve,
)

TOTAL_DE_CLASSES = 30


def _candidato(
    categoria: str, indice: int, prob_do_alvo: float, tracos: int = 3, indice_vencedor: int | None = None
) -> CandidatoDaVitrine:
    probabilidades = np.full(TOTAL_DE_CLASSES, (1.0 - prob_do_alvo) / (TOTAL_DE_CLASSES - 1))
    probabilidades[indice] = prob_do_alvo
    if indice_vencedor is not None:
        probabilidades[indice_vencedor] = prob_do_alvo + 0.01
    desenho = Desenho.de_arrays([[[i, i], [i + 1, i + 2]] for i in range(tracos)])
    return CandidatoDaVitrine(
        categoria=categoria,
        indice_da_categoria=indice,
        desenho=desenho,
        probabilidades_do_ensemble=probabilidades,
    )


def test_desenho_real_do_dataset_escolhe_o_primeiro_que_o_ensemble_acerta_com_ao_menos_0_8() -> None:
    candidatos = [_candidato("sun", 15, 0.79), _candidato("sun", 15, 0.81), _candidato("sun", 15, 0.99)]
    escolhidos = escolher_desenhos_da_vitrine(candidatos, categorias=("sun",))
    assert [c.probabilidades_do_ensemble[15] for c in escolhidos] == [0.81]


def test_desenho_real_do_dataset_recusa_quando_outra_categoria_vence() -> None:
    candidatos = [_candidato("sun", 15, 0.85, indice_vencedor=16)]
    assert escolher_desenhos_da_vitrine(candidatos, categorias=("sun",)) == []


def test_desenho_real_do_dataset_aceita_so_de_2_a_8_tracos() -> None:
    candidatos = [
        _candidato("sun", 15, 0.9, tracos=1),
        _candidato("sun", 15, 0.9, tracos=9),
        _candidato("sun", 15, 0.9, tracos=8),
    ]
    escolhidos = escolher_desenhos_da_vitrine(candidatos, categorias=("sun",))
    assert [len(c.desenho.tracos) for c in escolhidos] == [8]


def test_desenho_real_do_dataset_um_por_categoria_na_ordem_pedida() -> None:
    candidatos = [_candidato("house", 24, 0.9), _candidato("sun", 15, 0.9), _candidato("house", 24, 0.95)]
    escolhidos = escolher_desenhos_da_vitrine(candidatos, categorias=("sun", "house", "fish"))
    assert [c.categoria for c in escolhidos] == ["sun", "house"]
    assert escolhidos[1].probabilidades_do_ensemble[24] == 0.9


class ClassificadorFalso:
    """Devolve probabilidades fixas por número de traços e conta quantas vezes foi chamado."""

    def __init__(self, prob_por_tracos: dict[int, float], indice: int) -> None:
        self.prob_por_tracos, self.indice, self.chamadas = prob_por_tracos, indice, 0

    def __call__(self, desenho: Desenho) -> np.ndarray:
        self.chamadas += 1
        probabilidades = np.zeros(TOTAL_DE_CLASSES)
        probabilidades[self.indice] = self.prob_por_tracos[len(desenho.tracos)]
        return probabilidades


def test_primeiro_que_serve_so_classifica_desenhos_com_tracos_validos_e_para_no_primeiro() -> None:
    desenhos = [Desenho.de_arrays([[[i, i], [i + 1, i + 1]] for i in range(n)]) for n in (1, 3, 4, 5, 9)]
    classificador = ClassificadorFalso({3: 0.5, 4: 0.9, 5: 0.95}, indice=15)
    escolhido = primeiro_que_serve("sun", 15, desenhos, classificador)
    assert escolhido is not None and len(escolhido.desenho.tracos) == 4
    assert classificador.chamadas == 2  # 1 e 9 traços nem são classificados; para no de 4


def test_primeiro_que_serve_sem_nenhum_desenho_bom_devolve_none() -> None:
    desenhos = [Desenho.de_arrays([[[0, 0], [1, 1]], [[2, 2], [3, 3]]])]
    assert primeiro_que_serve("sun", 15, desenhos, ClassificadorFalso({2: 0.3}, indice=15)) is None


def test_montar_arquivo_usa_so_o_bloco_de_teste_de_cada_categoria() -> None:
    def baixar(categoria_en: str, quantidade: int) -> list[Desenho]:
        # treino e validação têm 2 traços (serviriam); só o bloco de teste tem 3
        tracos = [3 if i >= 8 else 2 for i in range(quantidade)]
        return [Desenho.de_arrays([[[j, j], [j + 1, j + 1]] for j in range(n)]) for n in tracos]

    arquivo = montar_arquivo_da_vitrine(
        baixar, ClassificadorFalso({2: 0.9, 3: 0.9}, indice=6), categorias=("fish",), tamanhos=(6, 2, 2)
    )
    assert [len(d["tracos"]) for d in arquivo["desenhos"]] == [3]
    assert arquivo["desenhos"][0]["categoria"] == "peixe" and arquivo["desenhos"][0]["indice"] == 6


def test_exportar_vitrine_grava_categoria_indice_e_tracos_em_pontos_inteiros() -> None:
    candidato = CandidatoDaVitrine(
        categoria="sun",
        indice_da_categoria=15,
        desenho=Desenho.de_arrays([[[10.4, 20.6], [30.0, 40.0]], [[1.0, 2.0], [3.0, 4.0], [5.0, 6.0]]]),
        probabilidades_do_ensemble=np.zeros(TOTAL_DE_CLASSES),
    )
    arquivo = exportar_vitrine([candidato], nomes={"sun": "sol"})
    assert arquivo["fonte"] == "Quick, Draw! (Google) · CC BY 4.0 · conjunto de teste"
    assert arquivo["desenhos"] == [
        {"categoria": "sol", "indice": 15, "tracos": [[[10, 21], [30, 40]], [[1, 2], [3, 4], [5, 6]]]}
    ]
