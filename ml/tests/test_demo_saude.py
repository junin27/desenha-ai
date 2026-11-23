"""Requisito "Espera por saúde antes do navegador" (spec inicializacao-da-demo)."""

from collections.abc import Callable

from desenha_ml.demo.saude import (
    LINHAS_DO_REGISTRO_NO_ERRO,
    PRAZO_EM_SEGUNDOS,
    EstadoDoServidor,
    ServidorEsperado,
    esperar_servidores,
    interpretar_health,
    ultimas_linhas,
)
from desenha_ml.resultado import Erro, Ok

DESTILADO = ServidorEsperado(nome="Zé destilado", porta=8080, registro="demo/registros/destilado.log")
BASE = ServidorEsperado(nome="Qwen3 base", porta=8081, registro="demo/registros/base.log")


class RelogioFalso:
    """Tempo simulado: dormir avança o relógio, então o teste de 90 s roda instantâneo."""

    def __init__(self) -> None:
        self.agora_em_segundos = 0.0

    def agora(self) -> float:
        return self.agora_em_segundos

    def dormir(self, segundos: float) -> None:
        self.agora_em_segundos += segundos


def _registro_de(linhas: int) -> Callable[[str], str]:
    texto = "\n".join(f"linha {numero}" for numero in range(1, linhas + 1))
    return lambda _caminho: texto


def test_health_200_com_status_ok_e_pronto() -> None:
    assert interpretar_health(200, '{"status":"ok"}') == "pronto"


def test_health_503_e_modelo_ainda_carregando() -> None:
    assert interpretar_health(503, '{"error":{"message":"Loading model"}}') == "carregando"


def test_health_sem_conexao_ou_resposta_estranha_e_fora() -> None:
    assert interpretar_health(None, "") == "fora"
    assert interpretar_health(500, "erro") == "fora"
    assert interpretar_health(200, "<html>outra coisa na porta</html>") == "fora"


def test_servidores_que_ficam_prontos_liberam_o_navegador() -> None:
    relogio = RelogioFalso()
    tentativas: dict[int, int] = {8080: 0, 8081: 0}

    def sondar(porta: int) -> EstadoDoServidor:
        tentativas[porta] += 1
        return "pronto" if tentativas[porta] >= 3 else "carregando"

    resultado = esperar_servidores([DESTILADO, BASE], sondar, relogio.agora, relogio.dormir, _registro_de(0))

    assert resultado == Ok(None)


def test_servidor_que_nao_sobe_mostra_o_nome_a_porta_e_as_ultimas_20_linhas() -> None:
    relogio = RelogioFalso()

    def sondar(porta: int) -> EstadoDoServidor:
        return "pronto" if porta == 8081 else "fora"

    resultado = esperar_servidores([DESTILADO, BASE], sondar, relogio.agora, relogio.dormir, _registro_de(30))

    assert isinstance(resultado, Erro)
    assert resultado.codigo == "servidor_sem_resposta"
    assert "Zé destilado não respondeu na porta 8080" in resultado.detalhe
    assert "Qwen3 base" not in resultado.detalhe
    assert "linha 30" in resultado.detalhe and "linha 11" in resultado.detalhe
    assert "linha 10\n" not in resultado.detalhe + "\n"
    assert relogio.agora_em_segundos >= PRAZO_EM_SEGUNDOS


def test_o_prazo_e_de_90_segundos() -> None:
    assert PRAZO_EM_SEGUNDOS == 90
    assert LINHAS_DO_REGISTRO_NO_ERRO == 20


def test_ultimas_linhas_ignora_linhas_vazias_do_fim() -> None:
    assert ultimas_linhas("a\nb\nc\n\n", 2) == "b\nc"
    assert ultimas_linhas("", 20) == ""
