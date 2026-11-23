"""Métricas de avaliação, escolha do peso do ensemble e critério mínimo (spec treino-das-redes).

Sem scikit-learn: as mesmas funções rodam nos testes locais e no Colab.

Exemplo:
    >>> import numpy as np
    >>> round(f1_macro(np.array([0, 1, 1, 2]), np.array([0, 1, 2, 2])), 4)
    0.7778
"""

from collections.abc import Mapping, Sequence
from dataclasses import dataclass, field

import numpy as np
from numpy.typing import NDArray

PASSOS_DA_GRADE_DO_PESO = 20  # pesos i / 20: 0; 0,05; ...; 1 (sem acumular erro de ponto flutuante)
ACURACIA_MINIMA_DO_ENSEMBLE = 0.85
ACURACIA_MINIMA_DE_CADA_REDE = 0.80

Rotulos = NDArray[np.integer]
Probabilidades = NDArray[np.floating]


@dataclass(frozen=True)
class ResultadoDoCriterio:
    aprovado: bool
    motivos: list[str] = field(default_factory=list)


def previsoes(probabilidades: Probabilidades) -> NDArray[np.int64]:
    """Classe mais provável; em empate, o menor índice (mesma regra do top-k)."""
    return np.asarray(np.argmax(probabilidades, axis=1), dtype=np.int64)


def acuracia(rotulos: Rotulos, previstos: Rotulos) -> float:
    return float(np.mean(rotulos == previstos))


def f1_macro(rotulos: Rotulos, previstos: Rotulos) -> float:
    """Média do F1 das classes que aparecem nos rótulos ou nas previsões (igual ao padrão do sklearn)."""
    classes = np.union1d(rotulos, previstos)
    return float(np.mean([_f1_da_classe(rotulos, previstos, int(c)) for c in classes]))


def _f1_da_classe(rotulos: Rotulos, previstos: Rotulos, classe: int) -> float:
    verdadeiros_positivos = int(np.sum((previstos == classe) & (rotulos == classe)))
    previstos_da_classe = int(np.sum(previstos == classe))
    reais_da_classe = int(np.sum(rotulos == classe))
    if verdadeiros_positivos == 0:
        return 0.0
    precisao = verdadeiros_positivos / previstos_da_classe
    revocacao = verdadeiros_positivos / reais_da_classe
    return 2 * precisao * revocacao / (precisao + revocacao)


def acuracia_top_k(rotulos: Rotulos, probabilidades: Probabilidades, k: int) -> float:
    """Fração em que o rótulo está entre os k primeiros (ordenação estável, empate pelo menor índice)."""
    ordem = np.argsort(-probabilidades, axis=1, kind="stable")[:, :k]
    return float(np.mean(np.any(ordem == rotulos[:, None], axis=1)))


def matriz_de_confusao(rotulos: Rotulos, previstos: Rotulos, numero_de_classes: int) -> NDArray[np.int64]:
    """Linhas = classe real, colunas = classe prevista."""
    matriz = np.zeros((numero_de_classes, numero_de_classes), dtype=np.int64)
    np.add.at(matriz, (rotulos, previstos), 1)
    return matriz


def escolher_peso_do_ensemble(rotulos: Rotulos, p_cnn: Probabilidades, p_lstm: Probabilidades) -> float:
    """Maior acurácia na VALIDAÇÃO; empate fica com o peso mais próximo de 0,5."""
    pesos = [i / PASSOS_DA_GRADE_DO_PESO for i in range(PASSOS_DA_GRADE_DO_PESO + 1)]
    acuracias = [acuracia(rotulos, previsoes(w * p_cnn + (1 - w) * p_lstm)) for w in pesos]
    melhor = max(acuracias)
    return peso_mais_proximo_de_meio([w for w, a in zip(pesos, acuracias, strict=True) if a == melhor])


def peso_mais_proximo_de_meio(pesos: Sequence[float]) -> float:
    """Distância medida em passos inteiros da grade; equidistantes ficam com o menor peso."""
    meio = PASSOS_DA_GRADE_DO_PESO // 2
    return min(pesos, key=lambda w: (abs(round(w * PASSOS_DA_GRADE_DO_PESO) - meio), w))


def curva_antecipada(
    rotulos: Rotulos, probabilidades_por_fracao: Mapping[float, Probabilidades]
) -> dict[float, float]:
    """Acurácia para cada fração do desenho já feita (20%, 30%, ..., 100%)."""
    return {f: acuracia(rotulos, previsoes(p)) for f, p in probabilidades_por_fracao.items()}


def avaliar_criterio_minimo(acuracias_de_teste: Mapping[str, float]) -> ResultadoDoCriterio:
    """Ensemble >= 0,85 e cada rede >= 0,80 no TESTE; os motivos dizem o que faltou."""
    motivos = []
    for nome, valor in acuracias_de_teste.items():
        minimo = ACURACIA_MINIMA_DO_ENSEMBLE if nome == "Ensemble" else ACURACIA_MINIMA_DE_CADA_REDE
        if valor < minimo:
            motivos.append(f"{nome}: acurácia {valor:.4f} < {minimo:.2f}")
    return ResultadoDoCriterio(aprovado=not motivos, motivos=motivos)
