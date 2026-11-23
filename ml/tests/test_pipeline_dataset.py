"""Pipeline do dataset de ponta a ponta com o Teacher de ensaio (sem rede)."""

import json
from pathlib import Path

from desenha_ml.pipeline_dataset import gerar_dataset
from desenha_ml.teacher_de_ensaio import TeacherDeEnsaio


def _predicao(alvo: str, primeiro: str, segundo: str) -> dict[str, object]:
    top = [[primeiro, 0.6], [segundo, 0.3], ["lua", 0.05], ["sol", 0.03], ["raio", 0.02]]
    return {"alvo": alvo, "fracao_desenho": 0.5, "cnn": top, "lstm": top, "ensemble": top}


PREDICOES = [_predicao("vaca", "vaca", "cavalo")] * 50 + [_predicao("vaca", "cavalo", "vaca")] * 50


def test_pipeline_gera_e_cura_com_rejeicoes_de_proposito(tmp_path: Path) -> None:
    resultado = gerar_dataset(
        teacher=TeacherDeEnsaio(),
        predicoes=PREDICOES,
        metricas_redes=None,
        pasta=tmp_path,
        registrar=lambda _: None,
    )
    relatorio = resultado.relatorio
    assert relatorio["pedidos"] == 180 + 240 + 84
    rejeicoes = relatorio["rejeicoes"]
    assert isinstance(rejeicoes, dict)
    vazou, errado = rejeicoes.get("vazou"), rejeicoes.get("veredito_errado")
    assert isinstance(vazou, int) and isinstance(errado, int) and vazou > 0 and errado > 0
    por_tarefa = relatorio["aprovadas_por_tarefa"]
    assert isinstance(por_tarefa, dict) and set(por_tarefa) == {"CHARADA", "VEREDITO", "PERGUNTA"}
    assert json.loads((tmp_path / "relatorio_dataset.json").read_text(encoding="utf8"))["pedidos"] == 504


def test_retomada_nao_chama_o_teacher_de_novo(tmp_path: Path) -> None:
    primeiro = TeacherDeEnsaio()
    gerar_dataset(
        teacher=primeiro, predicoes=PREDICOES, metricas_redes=None, pasta=tmp_path, registrar=lambda _: None
    )
    segundo = TeacherDeEnsaio()
    gerar_dataset(
        teacher=segundo, predicoes=PREDICOES, metricas_redes=None, pasta=tmp_path, registrar=lambda _: None
    )
    assert primeiro.chamadas > 0 and segundo.chamadas == 0


def test_teacher_de_ensaio_le_os_nomes_do_top5_sem_virgula() -> None:
    linhas = [
        "TAREFA: VEREDITO",
        "Desafio: cavalo",
        "Desenho concluído: 50%",
        "CNN (imagem): vaca 60%, cavalo 30%",
        "LSTM (traços): vaca 60%, cavalo 30%",
        "Ensemble: vaca 60%, cavalo 30%",
    ]
    caso = "\n".join(linhas)
    prompt = "\n".join(["TAREFA: julgar o desenho", "CASO 1:", caso, "", "CASO 2:", caso])
    resposta = TeacherDeEnsaio().gerar(prompt, 0.3)
    assert isinstance(resposta, dict)
    # o 1º item é errado de propósito (ERRO_A_CADA); o 2º tem de seguir a regra: cavalo em 2º lugar = QUASE
    assert "VEREDITO: QUASE" in resposta["exemplos"][1]
