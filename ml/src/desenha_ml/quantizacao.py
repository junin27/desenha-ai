"""Tabela de quantização: memória teórica dos pesos × tamanho real dos GGUF (spec modelo-do-ze).

A mesma conta da atividade 1 (memória = parâmetros × bytes por parâmetro), aplicada ao Zé, com o teto de
2,8 GB livres (4 GB do dispositivo − 1,2 GB do sistema e do runtime).

Exemplo:
    >>> [linha.formato for linha in tabela_de_quantizacao(2.03e9, {}) if linha.cabe]
    ['INT8', 'INT4']
"""

from collections.abc import Mapping
from dataclasses import dataclass

MEMORIA_TOTAL_GB = 4.0
MEMORIA_DO_SISTEMA_GB = 1.2
MEMORIA_LIVRE_GB = MEMORIA_TOTAL_GB - MEMORIA_DO_SISTEMA_GB
BYTES_POR_GB = 1e9  # GB decimal, como na atividade 1
BYTES_POR_PARAMETRO = {"FP32": 4.0, "FP16/BF16": 2.0, "INT8": 1.0, "INT4": 0.5}


@dataclass(frozen=True)
class LinhaDaTabela:
    formato: str
    bytes_por_parametro: float
    teorico_gb: float
    cabe: bool
    margem_gb: float  # negativa quando não cabe
    real_gb: float | None  # tamanho do arquivo GGUF correspondente, se foi gerado


def tabela_de_quantizacao(parametros: float, tamanhos_reais_gb: Mapping[str, float]) -> list[LinhaDaTabela]:
    """Uma linha por formato; `tamanhos_reais_gb` usa as chaves "INT8" (Q8_0) e "INT4" (Q4_K_M)."""
    linhas = []
    for formato, bytes_por_parametro in BYTES_POR_PARAMETRO.items():
        teorico = parametros * bytes_por_parametro / BYTES_POR_GB
        margem = MEMORIA_LIVRE_GB - teorico
        linhas.append(
            LinhaDaTabela(
                formato, bytes_por_parametro, teorico, margem >= 0, margem, tamanhos_reais_gb.get(formato)
            )
        )
    return linhas
