"""Requisitos "Um clique, sem internet" e "Modelo base conforme a memória" (spec inicializacao-da-demo)."""

from desenha_ml.demo.servidores import (
    GIB,
    MENSAGEM_DO_MODO_ENSAIO,
    RESERVA_DE_CONTEXTO_E_BUFFERS,
    SOBRA_MINIMA_PARA_O_BASE,
    EntradasDoPlano,
    planejar_servidores,
)

LLAMA = "demo/llama/llama-server.exe"
GGUF_ZE = "demo/modelos/zedorabisco-1.7b-Q4_K_M.gguf"
GGUF_BASE = "demo/modelos/qwen3-1.7b-base-Q4_K_M.gguf"
JOGO = "demo/jogo"
TAMANHO_DO_ZE = int(1.1 * GIB)  # + 0,3 GiB de contexto e buffers = 1,4 GiB, como no cenário da spec
TAMANHO_DO_BASE = int(1.1 * GIB)


def _entradas(memoria_livre_gib: float, *, modo_ensaio: bool = False) -> EntradasDoPlano:
    return EntradasDoPlano(
        executavel=LLAMA,
        gguf_do_ze=None if modo_ensaio else GGUF_ZE,
        tamanho_do_gguf_do_ze=0 if modo_ensaio else TAMANHO_DO_ZE,
        gguf_base=GGUF_BASE,
        tamanho_do_gguf_base=TAMANHO_DO_BASE,
        pasta_do_jogo=JOGO,
        memoria_livre=int(memoria_livre_gib * GIB),
    )


def test_linhas_de_comando_dos_servidores_com_os_dois_modelos() -> None:
    plano = planejar_servidores(_entradas(memoria_livre_gib=6))

    destilado, base = plano.servidores
    assert destilado.porta == 8080 and base.porta == 8081
    assert destilado.linha[0] == LLAMA and base.linha[0] == LLAMA
    assert _valor(destilado.linha, "--host") == "127.0.0.1" and _valor(base.linha, "--host") == "127.0.0.1"
    assert _valor(destilado.linha, "--port") == "8080" and _valor(base.linha, "--port") == "8081"
    assert _valor(destilado.linha, "-m") == GGUF_ZE and _valor(base.linha, "-m") == GGUF_BASE
    assert _valor(destilado.linha, "--path") == JOGO
    assert "--path" not in base.linha
    assert plano.avisos == ()


def test_limites_de_geracao_e_contexto_em_cpu() -> None:
    plano = planejar_servidores(_entradas(memoria_livre_gib=6))

    for servidor in plano.servidores:
        assert _valor(servidor.linha, "-n") == "300"
        assert _valor(servidor.linha, "-c") == "2048"
        assert _valor(servidor.linha, "--parallel") == "1"


def test_modo_ensaio_serve_a_porta_8080_com_o_gguf_base_e_avisa() -> None:
    plano = planejar_servidores(_entradas(memoria_livre_gib=6, modo_ensaio=True))

    destilado = plano.servidores[0]
    assert destilado.porta == 8080
    assert _valor(destilado.linha, "-m") == GGUF_BASE
    assert MENSAGEM_DO_MODO_ENSAIO == "Modo ensaio: Zé sem fine-tuning"
    assert MENSAGEM_DO_MODO_ENSAIO in plano.avisos


def test_memoria_curta_sobe_so_o_destilado_e_avisa_o_motivo() -> None:
    plano = planejar_servidores(_entradas(memoria_livre_gib=2.2))

    assert [servidor.porta for servidor in plano.servidores] == [8080]
    assert any("base" in aviso and "falta de memória" in aviso for aviso in plano.avisos)
    assert any("reserva" in aviso for aviso in plano.avisos)


def _com_memoria(memoria_livre: int) -> EntradasDoPlano:
    return EntradasDoPlano(**{**_entradas(0).__dict__, "memoria_livre": memoria_livre})


def test_base_sobe_quando_sobra_exatamente_o_minimo() -> None:
    exato = TAMANHO_DO_ZE + RESERVA_DE_CONTEXTO_E_BUFFERS + SOBRA_MINIMA_PARA_O_BASE

    plano = planejar_servidores(_com_memoria(exato))

    assert [servidor.porta for servidor in plano.servidores] == [8080, 8081]


def test_base_nao_sobe_um_byte_abaixo_do_minimo() -> None:
    exato = TAMANHO_DO_ZE + RESERVA_DE_CONTEXTO_E_BUFFERS + SOBRA_MINIMA_PARA_O_BASE

    plano = planejar_servidores(_com_memoria(exato - 1))

    assert [servidor.porta for servidor in plano.servidores] == [8080]


def _valor(linha: tuple[str, ...], opcao: str) -> str:
    return linha[linha.index(opcao) + 1]


def test_base_exige_2_gib_livres_depois_do_destilado_porque_ocupa_cerca_de_1_9_gib() -> None:
    """Medido no ensaio real (3.1): o base ocupou 1,75-1,96 GiB; o mínimo antigo (1,5) não cobria."""
    assert SOBRA_MINIMA_PARA_O_BASE == 2 * GIB
