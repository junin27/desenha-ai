"""Ficha técnica do projeto: única fonte de fatos (e de números) que o Zé pode usar ao responder visitantes.

Exemplo:
    >>> "Qwen3" in montar_ficha(None)
    True
"""

import re
from collections.abc import Mapping

_NUMERO = re.compile(r"\d+(?:[.,]\d+)?")

_FATOS = (
    "Jogo: Desenha Aí, Sô!, feito por Gilberto Aparecido Dias Junior (Engenharia de Software, UniRV, Rio Verde-GO) "
    "para as disciplinas de Redes Neurais e Small Language Models do professor Sandro Moreira.",
    "Como funciona: o Zé do Rabisco (o SLM) cria uma charada, o visitante desenha a resposta em 20 segundos e duas "
    "redes neurais tentam adivinhar o desenho enquanto ele é feito.",
    "Dados: Google Quick, Draw!, 30 categorias (animais da roça, trator, caminhonete, violão, chapéu, frutas, clima).",
    "CNN (rede neural convolucional): enxerga o desenho como uma imagem de 28 por 28 pixels; usa filtros "
    "convolucionais e blocos residuais.",
    "LSTM (rede neural recorrente): lê o desenho como uma sequência de traços, ponto a ponto, na ordem em que foi "
    "feito; tem memória (portas de esquecer, entrada e saída), por isso consegue adivinhar antes do desenho terminar.",
    "Ensemble: média ponderada das probabilidades da CNN e da LSTM.",
    "As redes rodam no navegador (formato ONNX), sem internet.",
    "Zé do Rabisco: modelo Qwen3 de 1,7 bilhão de parâmetros (família Qwen3 da Alibaba, código aberto), ajustado com "
    "QLoRA usando a biblioteca Unsloth.",
    "Destilação: um modelo professor grande (Teacher) gerou exemplos com raciocínio passo a passo; o Zé (Student) "
    "aprendeu imitando esses exemplos.",
    "Quantização: os pesos do Zé foram comprimidos para 4 bits (formato GGUF). Em 16 bits o modelo ocupa cerca de "
    "3,4 GB; em 4 bits, cerca de 1,1 GB, por isso roda num notebook comum, sem placa de vídeo e sem internet.",
    "LoRA: em vez de treinar todos os pesos, treina pequenas matrizes adaptadoras (menos de 2% dos parâmetros).",
    "Regra do veredito: ACERTOU se o palpite principal do ensemble é o desenho pedido; QUASE se o desenho pedido "
    "está entre os 3 primeiros palpites; ERROU nos outros casos.",
)


def montar_ficha(metricas_redes: Mapping[str, object] | None) -> str:
    """Fatos fixos + acurácias e parâmetros reais de `metricas_redes.json`, se existir."""
    fatos = list(_FATOS)
    if metricas_redes is not None:
        fatos.append(_fato_das_metricas(metricas_redes))
    return "\n".join(f"- {fato}" for fato in fatos)


def numeros_da_ficha(ficha: str) -> frozenset[str]:
    """Números que podem aparecer nas respostas de PERGUNTA (o resto é alucinação)."""
    return frozenset(_NUMERO.findall(ficha))


def _fato_das_metricas(metricas: Mapping[str, object]) -> str:
    teste = _secao(metricas, "teste")
    parametros = _secao(metricas, "parametros")
    acuracias = {nome: _secao(teste, nome).get("acuracia") for nome in ("CNN", "LSTM", "Ensemble")}
    return (
        f"No teste, a CNN acertou {_porcento(acuracias['CNN'])} dos desenhos, a LSTM {_porcento(acuracias['LSTM'])} "
        f"e o ensemble {_porcento(acuracias['Ensemble'])}. A CNN tem {_milhar(parametros.get('cnn'))} parâmetros "
        f"e a LSTM {_milhar(parametros.get('lstm'))}."
    )


def _secao(dados: Mapping[str, object], chave: str) -> Mapping[str, object]:
    valor = dados.get(chave)
    if not isinstance(valor, Mapping):
        raise ValueError(f"metricas_redes.json sem a seção {chave!r} no formato esperado; recebido {valor!r}")
    return valor


def _porcento(valor: object) -> str:
    if not isinstance(valor, int | float):
        raise ValueError(f"acurácia {valor!r} inválida; esperado número entre 0 e 1")
    return f"{100 * valor:.1f}%".replace(".", ",")


def _milhar(valor: object) -> str:
    if not isinstance(valor, int):
        raise ValueError(f"quantidade de parâmetros {valor!r} inválida; esperado inteiro")
    return f"{valor:,}".replace(",", ".")
