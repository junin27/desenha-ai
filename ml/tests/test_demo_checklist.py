"""Requisitos "Conferência automática", "Fala real do Zé" e "Resultado final" (spec checklist-do-evento)."""

from desenha_ml.demo.checklist import (
    ItemDoChecklist,
    Situacao,
    VozInstalada,
    formatar_item,
    item_de_arquivos,
    item_de_memoria,
    item_de_portas,
    item_de_voz,
    item_do_ze,
    item_dos_modelos,
    resultado_final,
)
from desenha_ml.demo.manifesto import Divergencia
from desenha_ml.demo.servidores import GIB

GGUF_DO_ZE = "modelos/zedorabisco-1.7b-Q4_K_M.gguf"
FALA_VALIDA = (
    "<pensamento>A palavra é vaca.</pensamento><resposta>Charada: Tenho chifres e dou leite.</resposta>"
)
MARIA_PT_BR = VozInstalada(nome="Microsoft Maria", idioma="416;9")
ZIRA_EN_US = VozInstalada(nome="Microsoft Zira", idioma="409;9")


def _item(situacao: Situacao, titulo: str = "item") -> ItemDoChecklist:
    return ItemDoChecklist(titulo=titulo, situacao=situacao, detalhe="", acao="")


def test_arquivo_corrompido_aparece_com_falha_o_nome_e_a_acao() -> None:
    divergencia = Divergencia(caminho=GGUF_DO_ZE, motivo="hash", detalhe="SHA-256 diferente")

    item = item_de_arquivos([divergencia])

    assert item.situacao == "falha"
    assert GGUF_DO_ZE in item.detalhe
    assert item.acao == "rode a preparação de novo"


def test_arquivos_integros_passam() -> None:
    assert item_de_arquivos([]).situacao == "ok"


def test_sem_voz_pt_br_vira_aviso_com_a_instrucao_da_maria() -> None:
    item = item_de_voz([ZIRA_EN_US])

    assert item.situacao == "aviso"
    assert "Microsoft Maria" in item.acao
    assert "Fala" in item.acao


def test_voz_pt_br_instalada_passa_mesmo_com_o_codigo_em_hexadecimal_curto_ou_longo() -> None:
    assert item_de_voz([ZIRA_EN_US, MARIA_PT_BR]).situacao == "ok"
    assert item_de_voz([VozInstalada(nome="Maria", idioma="0416")]).situacao == "ok"
    assert item_de_voz([]).situacao == "aviso"


def test_ze_respondendo_no_formato_em_6_segundos_passa_com_os_tokens_por_segundo() -> None:
    item = item_do_ze(FALA_VALIDA, segundos=6.0, tokens=100)

    assert item.situacao == "ok"
    assert "16,7 tokens/s" in item.detalhe


def test_fala_fora_do_formato_falha_e_mostra_o_que_veio() -> None:
    item = item_do_ze("Oi, sou o Zé", segundos=3.0, tokens=10)

    assert item.situacao == "falha"
    assert "Oi, sou o Zé" in item.detalhe


def test_charada_sem_o_prefixo_falha() -> None:
    fala = "<pensamento>x</pensamento><resposta>Tenho chifres.</resposta>"

    assert item_do_ze(fala, segundos=3.0, tokens=10).situacao == "falha"


def test_resposta_acima_de_25_segundos_falha_mesmo_no_formato_certo() -> None:
    item = item_do_ze(FALA_VALIDA, segundos=25.1, tokens=100)

    assert item.situacao == "falha"
    assert "25" in item.detalhe


def test_sem_resposta_do_servidor_falha() -> None:
    item = item_do_ze(None, segundos=0.0, tokens=0)

    assert item.situacao == "falha"
    assert item.acao != ""


def test_porta_ocupada_por_outro_programa_falha_e_a_da_propria_demo_passa() -> None:
    assert item_de_portas({8080: "livre", 8081: "da_demo"}).situacao == "ok"

    item = item_de_portas({8080: "outro", 8081: "livre"})

    assert item.situacao == "falha"
    assert "8080" in item.detalhe


def test_memoria_insuficiente_para_o_destilado_falha_e_diz_quanto_falta() -> None:
    item = item_de_memoria(memoria_livre=1 * GIB, tamanho_do_gguf_do_ze=int(1.1 * GIB))

    assert item.situacao == "falha"
    assert "fechar" in item.acao


def test_memoria_suficiente_passa() -> None:
    assert item_de_memoria(memoria_livre=3 * GIB, tamanho_do_gguf_do_ze=int(1.1 * GIB)).situacao == "ok"


def test_base_desligado_ou_modo_ensaio_sao_avisos() -> None:
    assert item_dos_modelos(modo_ensaio=False, base_sobe=True).situacao == "ok"
    assert item_dos_modelos(modo_ensaio=False, base_sobe=False).situacao == "aviso"
    assert item_dos_modelos(modo_ensaio=True, base_sobe=True).situacao == "aviso"


def test_so_avisos_diz_pronto_para_o_evento_e_sai_com_codigo_0() -> None:
    final = resultado_final([_item("ok"), _item("aviso", "voz"), _item("ok")])

    assert final.mensagem.startswith("Pronto para o evento")
    assert "voz" in final.mensagem
    assert final.codigo_de_saida == 0


def test_com_falha_diz_nao_pronto_lista_as_falhas_e_sai_com_codigo_diferente_de_0() -> None:
    final = resultado_final(
        [_item("ok"), _item("falha", "arquivos"), _item("falha", "Zé"), _item("aviso", "voz")]
    )

    assert final.mensagem.startswith("Não pronto")
    assert "arquivos" in final.mensagem and "Zé" in final.mensagem
    assert final.codigo_de_saida == 1


def test_item_impresso_com_simbolo_e_a_acao_so_quando_nao_passou() -> None:
    passou = ItemDoChecklist(titulo="Arquivos", situacao="ok", detalhe="12 conferidos", acao="")
    falhou = ItemDoChecklist(
        titulo="Arquivos", situacao="falha", detalhe="faltou x", acao="rode a preparação"
    )
    avisou = ItemDoChecklist(titulo="Voz", situacao="aviso", detalhe="sem pt-BR", acao="instale a Maria")

    assert formatar_item(passou) == "✓ Arquivos: 12 conferidos"
    assert formatar_item(falhou) == "✗ Arquivos: faltou x\n    → rode a preparação"
    assert formatar_item(avisou).startswith("⚠ Voz: sem pt-BR\n    → instale")
