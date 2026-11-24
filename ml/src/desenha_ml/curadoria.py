"""Curadoria verificável do dataset do Zé: reparos, filtros com códigos e desduplicação (spec dataset-do-ze).

Reaproveita as regras já especificadas: leitura da fala (`conversa`), vazamento da palavra secreta
(`vazamento`) e veredito (`veredito`), sem cópias.

Exemplo:
    >>> reparar("<pensamento>x</pensamento><resposta>**oi**</resposta>")[1]
    ['markdown']
"""

import re
from collections import Counter
from collections.abc import Sequence
from dataclasses import dataclass, field

from desenha_ml.conversa import Fala, ler_charada, ler_fala, ler_veredito
from desenha_ml.ficha_tecnica import numeros_da_ficha
from desenha_ml.resultado import Erro
from desenha_ml.teacher import RegistroBruto
from desenha_ml.vazamento import forma_comparavel, vaza

LIMITE_DE_SEMELHANCA = 0.7
PALAVRAS_DO_PENSAMENTO = (12, 90)
PALAVRAS_DA_CHARADA = (6, 45)
PALAVRAS_DA_PERGUNTA = (10, 95)

_MARKDOWN = re.compile(r"\*\*|__|^#+[ \t]*|^[ \t]*[-*•][ \t]+", flags=re.MULTILINE)
_EMOJI = re.compile(
    "[\U0001f300-\U0001faff\u2600-\u27bf]" + "\ufe0f?"
)  # pictogramas, símbolos e o seletor de variação
_RECUSA = re.compile(
    r"como (uma|um) (ia|modelo)|n[ãa]o posso|sou apenas um|as an ai|i cannot", flags=re.IGNORECASE
)
_NUMERO = re.compile(r"\d+(?:[.,]\d+)?")
_RESPOSTA_ANTES_DE_FECHAR_PENSAMENTO = re.compile(r"</resposta>(\s*</pensamento>)")
_PENSAMENTO_FECHADO_COM_RESPOSTA = re.compile(r"</resposta>(\s*<resposta>)")
_ABRE_RESPOSTA_DUPLICADA = re.compile(r"<resposta>\s*<resposta>")
_FECHA_RESPOSTA_DUPLICADA = re.compile(r"</resposta>\s*</resposta>")
_BARRA_N_LITERAL = "\\n"  # duas letras: barra invertida e n, como o Teacher às vezes escreve


@dataclass
class ResultadoDaCuradoria:
    aprovadas: list[RegistroBruto] = field(default_factory=list)
    rejeicoes_por_amostra: list[str | None] = field(default_factory=list)
    reparos: Counter[str] = field(default_factory=Counter)

    @property
    def rejeicoes(self) -> Counter[str]:
        return Counter(codigo for codigo in self.rejeicoes_por_amostra if codigo is not None)


def reparar(saida: str) -> tuple[str, list[str]]:
    """Remove Markdown e emojis e conserta erros mecânicos de marcação; devolve o texto e os reparos."""
    reparos = []
    sem_markdown = _MARKDOWN.sub("", saida)
    if sem_markdown != saida:
        reparos.append("markdown")
    sem_emoji = _EMOJI.sub("", sem_markdown)
    if sem_emoji != sem_markdown:
        reparos.append("emoji")
    texto = re.sub(r"[ \t]{2,}", " ", sem_emoji)
    for nome, conserto in _CONSERTOS_DE_MARCACAO:
        consertado = conserto(texto)
        if consertado != texto:
            reparos.append(nome)
            texto = consertado
    return texto, reparos


def _pensamento_fechado_com_tag_de_resposta(texto: str) -> str:
    """O Teacher às vezes fecha o pensamento com `</resposta>` (achado no Colab: ~50 amostras)."""
    if _RESPOSTA_ANTES_DE_FECHAR_PENSAMENTO.search(texto):
        return _RESPOSTA_ANTES_DE_FECHAR_PENSAMENTO.sub(r"\1", texto, count=1)
    if "</pensamento>" in texto or texto.count("<pensamento>") != 1:
        return texto
    return _PENSAMENTO_FECHADO_COM_RESPOSTA.sub(r"</pensamento>\1", texto, count=1)


def _tag_de_resposta_duplicada(texto: str) -> str:
    return _FECHA_RESPOSTA_DUPLICADA.sub("</resposta>", _ABRE_RESPOSTA_DUPLICADA.sub("<resposta>", texto))


def _quebra_de_linha_literal_no_veredito(texto: str) -> str:
    """`VEREDITO: X\\nNARRAÇÃO:` com barra-n literal não é lido pela regra do veredito; só mexe nesse caso."""
    if "VEREDITO:" in texto and "NARRAÇÃO:" in texto:
        return texto.replace(_BARRA_N_LITERAL, "\n")
    return texto


_CONSERTOS_DE_MARCACAO = (
    ("tags_trocadas", _pensamento_fechado_com_tag_de_resposta),
    ("tag_duplicada", _tag_de_resposta_duplicada),
    ("quebra_literal", _quebra_de_linha_literal_no_veredito),
)


def curar(registros: Sequence[RegistroBruto], ficha: str) -> ResultadoDaCuradoria:
    """Aplica reparos e filtros a cada amostra, na ordem, e descarta quase-duplicatas da mesma tarefa."""
    resultado = ResultadoDaCuradoria()
    numeros_permitidos = numeros_da_ficha(ficha)
    respostas_aprovadas: dict[str, list[str]] = {}
    for registro in registros:
        codigo, reparado, reparos = _avaliar(registro, numeros_permitidos)
        if codigo is None and _duplicata(reparado, respostas_aprovadas.setdefault(registro["tarefa"], [])):
            codigo = "duplicata"
        resultado.rejeicoes_por_amostra.append(codigo)
        if codigo is None and reparado is not None:
            resultado.reparos.update(reparos)
            resultado.aprovadas.append({**registro, "saida": _texto_canonico(reparado)})
            respostas_aprovadas[registro["tarefa"]].append(reparado.resposta)
    return resultado


def _avaliar(
    registro: RegistroBruto, numeros_permitidos: frozenset[str]
) -> tuple[str | None, Fala | None, list[str]]:
    if registro["saida"] is None:
        return "vazia", None, []
    texto, reparos = reparar(registro["saida"])
    fala = ler_fala(texto)
    if isinstance(fala, Erro):
        return "formato_invalido", None, reparos
    codigo = _filtro_comum(texto, fala.valor) or filtro_da_tarefa(registro, fala.valor, numeros_permitidos)
    return codigo, fala.valor, reparos


def _filtro_comum(texto: str, fala: Fala) -> str | None:
    if _RECUSA.search(texto):
        return "recusa"
    if not _dentro(fala.pensamento, PALAVRAS_DO_PENSAMENTO):
        return "tamanho_pensamento"
    return None


def filtro_da_tarefa(registro: RegistroBruto, fala: Fala, numeros_permitidos: frozenset[str]) -> str | None:
    if registro["tarefa"] == "CHARADA":
        return filtro_da_charada(fala, str(registro["meta"]["palavra"]))
    if registro["tarefa"] == "VEREDITO":
        return filtro_do_veredito(fala, registro["meta"]["regra"])
    return filtro_da_pergunta(fala, numeros_permitidos | frozenset(_NUMERO.findall(registro["entrada"])))


def filtro_da_charada(fala: Fala, palavra: str) -> str | None:
    charada = ler_charada(fala.resposta)
    if isinstance(charada, Erro):
        return "formato_invalido"
    if not _dentro(fala.resposta, PALAVRAS_DA_CHARADA):
        return "tamanho_resposta"
    return "vazou" if vaza(palavra, charada.valor) else None


def filtro_do_veredito(fala: Fala, regra: object) -> str | None:
    veredito = ler_veredito(fala.resposta)
    if isinstance(veredito, Erro):
        return "formato_invalido"
    return "veredito_errado" if veredito.valor[0] != regra else None


def filtro_da_pergunta(fala: Fala, numeros_permitidos: frozenset[str]) -> str | None:
    if not _dentro(fala.resposta, PALAVRAS_DA_PERGUNTA):
        return "tamanho_resposta"
    citados = set(_NUMERO.findall(fala.resposta)) - numeros_permitidos
    return "numero_alucinado" if citados else None


def _dentro(texto: str, limites: tuple[int, int]) -> bool:
    return limites[0] <= len(texto.split()) <= limites[1]


def _duplicata(fala: Fala | None, aprovadas_da_tarefa: list[str]) -> bool:
    if fala is None:
        return False
    return any(
        jaccard_de_trigramas(fala.resposta, outra) > LIMITE_DE_SEMELHANCA for outra in aprovadas_da_tarefa
    )


def jaccard_de_trigramas(a: str, b: str) -> float:
    """Semelhança entre os conjuntos de trigramas de palavras (na forma comparável, sem acento)."""
    trigramas_a, trigramas_b = _trigramas(a), _trigramas(b)
    uniao = trigramas_a | trigramas_b
    return len(trigramas_a & trigramas_b) / len(uniao) if uniao else 1.0


def _trigramas(texto: str) -> set[tuple[str, ...]]:
    palavras = forma_comparavel(texto)
    return {tuple(palavras[i : i + 3]) for i in range(len(palavras) - 2)}


def _texto_canonico(fala: Fala) -> str:
    return f"<pensamento>{fala.pensamento}</pensamento>\n<resposta>{fala.resposta}</resposta>"
