"""Utilidades de texto com conjunto explícito de espaços (iguais em Python e TypeScript)."""

from desenha_ml.texto import aparar, aparar_inicio, normalizar_espacos

SEPARADOR_DE_ARQUIVO = chr(0x1C)  # str.strip() do Python remove; o trim() do JS não
ESPACO_INSEPARAVEL = chr(0xA0)


def test_normalizar_espacos() -> None:
    assert normalizar_espacos(f"  Ana\t{ESPACO_INSEPARAVEL} Maria \n") == "Ana Maria"


def test_aparar_usa_so_o_conjunto_explicito() -> None:
    assert aparar(f"\n {ESPACO_INSEPARAVEL}ok\r\t") == "ok"
    assert aparar(f"{SEPARADOR_DE_ARQUIVO}ok{SEPARADOR_DE_ARQUIVO}") == f"{SEPARADOR_DE_ARQUIVO}ok{SEPARADOR_DE_ARQUIVO}"


def test_aparar_inicio_mantem_o_fim() -> None:
    assert aparar_inicio("  ok  ") == "ok  "
