"""Geração da spec dataset-do-ze: ficha técnica, Teacher com checkpoint, pedidos e Evol-Instruct."""

import collections
import json
from pathlib import Path

import pytest

from desenha_ml.categorias import CATEGORIAS
from desenha_ml.ficha_tecnica import montar_ficha, numeros_da_ficha
from desenha_ml.geracao_dataset import (
    SEEDS_PERGUNTA,
    casos_de_veredito,
    evoluir_perguntas,
    lotes_de_pergunta,
    lotes_de_veredito,
    pedidos_de_charada,
    veredito_esperado,
)
from desenha_ml.teacher import Lote, TeacherComCuidados, executar_lotes


# ------------------------------------------------------------------------------------------ ficha
def test_ficha_sem_metricas_tem_os_fatos_base() -> None:
    ficha = montar_ficha(None)
    for fato in ("Gilberto Aparecido Dias Junior", "CNN", "LSTM", "Qwen3", "QLoRA", "Unsloth", "4 bits"):
        assert fato in ficha


def test_ficha_com_metricas_reais() -> None:
    metricas = {
        "teste": {"CNN": {"acuracia": 0.9}, "LSTM": {"acuracia": 0.88}, "Ensemble": {"acuracia": 0.912}},
        "parametros": {"cnn": 700_123, "lstm": 456_789},
    }
    ficha = montar_ficha(metricas)
    assert "91,2%" in ficha and "700.123" in ficha
    assert "91,2" in numeros_da_ficha(ficha)


# ---------------------------------------------------------------------------------------- teacher
class ApiFalsa:
    """Responde em sequência; registra prompts. `None` na fila simula exceção da API."""

    def __init__(self, respostas: list[str | None]) -> None:
        self.respostas = respostas
        self.prompts: list[str] = []

    def __call__(self, prompt: str, temperatura: float) -> str:
        self.prompts.append(prompt)
        resposta = self.respostas.pop(0)
        if resposta is None:
            raise ConnectionError("falha simulada da API")
        return resposta


class RelogioFalso:
    def __init__(self) -> None:
        self.agora = 0.0
        self.esperas: list[float] = []

    def tempo(self) -> float:
        return self.agora

    def dormir(self, segundos: float) -> None:
        self.esperas.append(segundos)
        self.agora += segundos


def _teacher(api: ApiFalsa, relogio: RelogioFalso) -> TeacherComCuidados:
    return TeacherComCuidados(api, intervalo=4.5, tentativas=5, tempo=relogio.tempo, dormir=relogio.dormir)


def test_novas_tentativas_com_espera_crescente() -> None:
    relogio = RelogioFalso()
    api = ApiFalsa([None, None, '{"exemplos": ["ok"]}'])
    assert _teacher(api, relogio).gerar("p", 0.5) == {"exemplos": ["ok"]}
    esperas_de_erro = [e for e in relogio.esperas if e != 4.5]
    assert esperas_de_erro == sorted(esperas_de_erro) and len(esperas_de_erro) == 2


def test_lote_que_falha_sempre_devolve_nada() -> None:
    relogio = RelogioFalso()
    assert _teacher(ApiFalsa([None] * 5), relogio).gerar("p", 0.5) is None


def test_json_invalido_conta_como_falha() -> None:
    relogio = RelogioFalso()
    assert _teacher(ApiFalsa(["não é json", '{"exemplos": []}']), relogio).gerar("p", 0.5) == {"exemplos": []}


def _lotes(quantidade: int) -> list[Lote]:
    return [
        Lote(f"l{i}", "CHARADA", f"prompt {i}", 0.8, [f"entrada {i}"], [{"palavra": "vaca"}])
        for i in range(quantidade)
    ]


def test_checkpoint_pula_lotes_ja_gravados(tmp_path: Path) -> None:
    checkpoint = tmp_path / "bruto.jsonl"
    relogio = RelogioFalso()
    primeira = ApiFalsa(['{"exemplos": ["a"]}'] * 2)
    executar_lotes(_lotes(2), _teacher(primeira, relogio), checkpoint)
    segunda = ApiFalsa(['{"exemplos": ["b"]}'] * 3)
    registros = executar_lotes(_lotes(5), _teacher(segunda, relogio), checkpoint)
    assert len(segunda.prompts) == 3
    assert [r["lote_id"] for r in registros] == ["l0", "l1", "l2", "l3", "l4"]
    assert len(checkpoint.read_text(encoding="utf8").splitlines()) == 5


def test_lote_sem_resposta_e_gravado_sem_saida(tmp_path: Path) -> None:
    registros = executar_lotes(
        _lotes(1), _teacher(ApiFalsa([None] * 5), RelogioFalso()), tmp_path / "b.jsonl"
    )
    assert registros[0]["saida"] is None


def test_retomada_refaz_so_o_lote_que_ficou_sem_saida(tmp_path: Path) -> None:
    """Achado no Colab (24/11): 90 amostras `vazia` ficavam presas no checkpoint e nunca eram refeitas."""
    checkpoint = tmp_path / "bruto.jsonl"
    relogio = RelogioFalso()
    primeira = ApiFalsa(['{"exemplos": ["a"]}', *[None] * 5, '{"exemplos": ["c"]}'])
    executar_lotes(_lotes(3), _teacher(primeira, relogio), checkpoint)

    segunda = ApiFalsa(['{"exemplos": ["b"]}'])
    registros = executar_lotes(_lotes(3), _teacher(segunda, relogio), checkpoint)

    assert len(segunda.prompts) == 1 and segunda.prompts[0] == "prompt 1"
    assert [(r["lote_id"], r["saida"]) for r in registros] == [("l0", "a"), ("l2", "c"), ("l1", "b")]
    assert len(checkpoint.read_text(encoding="utf8").splitlines()) == 3


def test_lote_com_menos_exemplos_que_o_pedido_tambem_e_refeito(tmp_path: Path) -> None:
    checkpoint = tmp_path / "bruto.jsonl"
    relogio = RelogioFalso()
    lote = Lote("l0", "PERGUNTA", "prompt", 0.8, ["e1", "e2"], [{}, {}])
    executar_lotes([lote], _teacher(ApiFalsa(['{"exemplos": ["so um"]}']), relogio), checkpoint)

    segunda = ApiFalsa(['{"exemplos": ["um", "dois"]}'])
    registros = executar_lotes([lote], _teacher(segunda, relogio), checkpoint)

    assert len(segunda.prompts) == 1
    assert [r["saida"] for r in registros] == ["um", "dois"]


def test_retomada_nao_refaz_lotes_completos_nem_duplica_linhas(tmp_path: Path) -> None:
    checkpoint = tmp_path / "bruto.jsonl"
    relogio = RelogioFalso()
    executar_lotes(_lotes(2), _teacher(ApiFalsa(['{"exemplos": ["a"]}'] * 2), relogio), checkpoint)

    terceira = ApiFalsa([])
    executar_lotes(_lotes(2), _teacher(terceira, relogio), checkpoint)

    assert terceira.prompts == []
    assert len(checkpoint.read_text(encoding="utf8").splitlines()) == 2


# ---------------------------------------------------------------------------------------- pedidos
def test_180_pedidos_de_charada() -> None:
    lotes = pedidos_de_charada(semente=1)
    assert len(lotes) == 30
    assert sum(len(lote.entradas) for lote in lotes) == 180
    niveis = collections.Counter(meta["nivel"] for lote in lotes for meta in lote.metas)
    assert niveis == {"fácil": 60, "médio": 60, "difícil": 60}


def _predicao(alvo: str, primeiro: str, segundo: str) -> dict[str, object]:
    top = [[primeiro, 0.6], [segundo, 0.3], ["lua", 0.05], ["sol", 0.03], ["raio", 0.02]]
    return {"alvo": alvo, "fracao_desenho": 1.0, "cnn": top, "lstm": top, "ensemble": top}


def test_veredito_esperado_pela_regra_do_top_k() -> None:
    assert veredito_esperado("vaca", [("vaca", 0.6), ("cavalo", 0.3)]) == "ACERTOU"
    assert veredito_esperado("vaca", [("cavalo", 0.6), ("vaca", 0.3)]) == "QUASE"
    assert (
        veredito_esperado("vaca", [("cavalo", 0.6), ("porco", 0.3), ("gato", 0.05), ("cobra", 0.03)])
        == "ERROU"
    )


def test_vereditos_balanceados_com_dados_reais() -> None:
    predicoes = (
        [_predicao("vaca", "vaca", "cavalo")] * 700
        + [_predicao("vaca", "cavalo", "vaca")] * 300
        + [_predicao("vaca", "cavalo", "porco")] * 200
    )
    casos = casos_de_veredito(predicoes, semente=1)
    assert collections.Counter(c.veredito for c in casos) == {"ACERTOU": 80, "QUASE": 80, "ERROU": 80}
    assert {c.fonte for c in casos} == {"real"}


def test_vereditos_completados_com_sinteticos() -> None:
    casos = casos_de_veredito([_predicao("vaca", "vaca", "cavalo")] * 10, semente=1)
    contagem = collections.Counter((c.veredito, c.fonte) for c in casos)
    assert contagem[("ACERTOU", "real")] == 10 and contagem[("ACERTOU", "sintetico")] == 70
    assert contagem[("QUASE", "sintetico")] == 80 and contagem[("ERROU", "sintetico")] == 80
    for caso in casos:
        assert veredito_esperado(caso.alvo, caso.ensemble) == caso.veredito


def test_lotes_de_veredito_levam_a_regra_na_meta() -> None:
    casos = casos_de_veredito([_predicao("vaca", "vaca", "cavalo")] * 3, semente=1)
    lotes = lotes_de_veredito(casos)
    assert sum(len(lote.entradas) for lote in lotes) == 240
    assert all(m["regra"] in {"ACERTOU", "QUASE", "ERROU"} for lote in lotes for m in lote.metas)
    assert lotes[0].entradas[0].startswith("TAREFA: VEREDITO\nDesafio: ")


class TeacherDeEvolucao:
    """Devolve, para cada pedido, a pergunta original com um sufixo (simula o Teacher)."""

    def gerar(self, prompt: str, temperatura: float) -> object | None:
        quantidade = prompt.count("Original:")
        return {"perguntas": [f"pergunta evoluída número {i} sobre o jogo?" for i in range(quantidade)]}


def test_evol_instruct_12_24_48() -> None:
    perguntas = evoluir_perguntas(TeacherDeEvolucao(), geracoes=2, semente=1)
    origens = collections.Counter(p.evolucao for p in perguntas)
    assert len(SEEDS_PERGUNTA) == 12
    assert origens["seed"] == 12 and origens["in_depth"] == 36 and origens["in_breadth"] == 36
    assert len(perguntas) == 12 + 24 + 48


def test_lotes_de_pergunta_usam_a_ficha(tmp_path: Path) -> None:
    perguntas = evoluir_perguntas(TeacherDeEvolucao(), geracoes=0, semente=1)
    lotes = lotes_de_pergunta(perguntas, ficha="FICHA-DE-TESTE")
    assert all("FICHA-DE-TESTE" in lote.prompt for lote in lotes)
    assert lotes[0].entradas[0].startswith("TAREFA: PERGUNTA\nVisitante: ")
    json.dumps([lote.metas for lote in lotes])  # metadados serializáveis


@pytest.mark.parametrize("categoria", [c.pt for c in CATEGORIAS[:3]])
def test_prompt_de_charada_proibe_a_palavra(categoria: str) -> None:
    lote = next(lote for lote in pedidos_de_charada(semente=1) if lote.metas[0]["palavra"] == categoria)
    assert f'"{categoria}"' in lote.prompt and "NUNCA" in lote.prompt
