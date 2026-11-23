"""Gera os contratos para o TypeScript: `pre_processamento.json` (D4) e `regras.json` (`contratos_regras`).

Uso (a partir de `projeto_final/`):
    ml/.venv/Scripts/python -m desenha_ml.contratos contratos/

Exemplo:
    >>> contrato = gerar_contrato_de_pre_processamento([])
    >>> sorted(caso["nome"] for caso in contrato["casos"])[:2]
    ['denso_capturado', 'linha_vertical']
"""

import argparse
import json
import math
from pathlib import Path
from typing import TypedDict

from desenha_ml.contratos_regras import gerar_contrato_de_regras
from desenha_ml.desenho import Desenho
from desenha_ml.leitura_quickdraw import ler_desenhos_ndjson
from desenha_ml.normalizacao import normalizar
from desenha_ml.prefixo import prefixo
from desenha_ml.rasterizacao import ESPESSURA_PADRAO, LADO_DA_CAIXA, LADO_DA_IMAGEM, rasterizar
from desenha_ml.resultado import Ok
from desenha_ml.sequencia import MAXIMO_DE_PONTOS, sequenciar
from desenha_ml.simplificacao import EPSILON_PADRAO, preparar_desenho_capturado

FRACAO_DO_PREFIXO = 0.5
DESENHOS_REAIS_NO_CONTRATO = 6
CASOS_OBRIGATORIOS = ("ponto_unico", "traco_unico", "mais_de_130_pontos", "linha_vertical", "denso_capturado")
AMOSTRA_PADRAO = Path(__file__).resolve().parents[2] / "tests" / "amostras" / "quickdraw_amostra.ndjson"

Pontos = list[list[list[float]]]


class PrefixoDoContrato(TypedDict):
    fracao: float
    tracos: Pontos


class CasoDoContrato(TypedDict):
    nome: str
    tracos: Pontos
    normalizado: Pontos
    capturado: Pontos
    prefixo: PrefixoDoContrato
    imagem: list[float]
    sequencia: list[list[float]]


class ContratoDePreProcessamento(TypedDict):
    versao: int
    parametros: dict[str, float]
    casos: list[CasoDoContrato]


def gerar_contrato_de_pre_processamento(
    desenhos_reais: list[tuple[str, Desenho]],
) -> ContratoDePreProcessamento:
    passo = max(len(desenhos_reais) // DESENHOS_REAIS_NO_CONTRATO, 1)
    reais = [(f"quickdraw_{p.replace(' ', '_')}", d) for p, d in desenhos_reais[::passo]]
    casos = [_caso(nome, d) for nome, d in [*_casos_sinteticos(), *reais[:DESENHOS_REAIS_NO_CONTRATO]]]
    parametros = {
        "espessura": ESPESSURA_PADRAO,
        "epsilon": EPSILON_PADRAO,
        "maximo_de_pontos": MAXIMO_DE_PONTOS,
        "lado_da_imagem": LADO_DA_IMAGEM,
        "lado_da_caixa": LADO_DA_CAIXA,
    }
    return {"versao": 1, "parametros": parametros, "casos": casos}


def _casos_sinteticos() -> list[tuple[str, Desenho]]:
    onda = [[i * 1.3, 50 + 40 * math.sin(i / 7)] for i in range(200)]
    circulo = [
        [100 + 100 * math.cos(i / 300 * 2 * math.pi), 100 + 100 * math.sin(i / 300 * 2 * math.pi)]
        for i in range(301)
    ]
    return [
        ("ponto_unico", Desenho.de_arrays([[[40.0, 40.0]]])),
        ("traco_unico", Desenho.de_arrays([[[0.0, 0.0], [80.0, 30.0], [160.0, 90.0], [255.0, 40.0]]])),
        ("mais_de_130_pontos", Desenho.de_arrays([onda])),
        ("linha_vertical", Desenho.de_arrays([[[10.0, 0.0], [10.0, 200.0]]])),
        ("denso_capturado", Desenho.de_arrays([circulo, [[90.0, 90.0], [110.0, 110.0]]])),
    ]


def _caso(nome: str, desenho: Desenho) -> CasoDoContrato:
    parcial = prefixo(desenho, FRACAO_DO_PREFIXO)
    assert isinstance(parcial, Ok), f"prefixo inválido no caso {nome}: {parcial}"
    return {
        "nome": nome,
        "tracos": _pontos(desenho),
        "normalizado": _pontos(normalizar(desenho)),
        "capturado": _pontos(preparar_desenho_capturado(desenho)),
        "prefixo": {"fracao": FRACAO_DO_PREFIXO, "tracos": _pontos(parcial.valor)},
        "imagem": [float(v) for v in rasterizar(desenho).ravel()],
        "sequencia": [[float(v) for v in linha] for linha in sequenciar(desenho)],
    }


def _pontos(desenho: Desenho) -> Pontos:
    return [[[float(x), float(y)] for x, y in traco] for traco in desenho.tracos]


def main() -> None:
    parser = argparse.ArgumentParser(description="Gera os contratos de pré-processamento para o TypeScript.")
    parser.add_argument("pasta", type=Path, help="pasta de saída (ex.: contratos/)")
    parser.add_argument("--amostra", type=Path, default=AMOSTRA_PADRAO, help="ndjson do Quick, Draw!")
    argumentos = parser.parse_args()
    with argumentos.amostra.open(encoding="utf8") as arquivo:
        contrato = gerar_contrato_de_pre_processamento(ler_desenhos_ndjson(arquivo))
    argumentos.pasta.mkdir(parents=True, exist_ok=True)
    _gravar(argumentos.pasta / "pre_processamento.json", contrato)
    _gravar(argumentos.pasta / "regras.json", gerar_contrato_de_regras())


def _gravar(destino: Path, contrato: object) -> None:
    destino.write_text(json.dumps(contrato, ensure_ascii=False) + "\n", encoding="utf8")
    print(f"{destino}: {destino.stat().st_size // 1024} KB")


if __name__ == "__main__":
    main()
