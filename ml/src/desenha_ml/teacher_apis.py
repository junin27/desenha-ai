"""Adaptadores das APIs do Teacher (Gemini e Groq) para a porta `ChamadaDeApi` de `desenha_ml.teacher`.

As bibliotecas são importadas só quando o adaptador é criado: o pacote funciona sem o extra `[teacher]`,
que só o notebook 2 instala. Os adaptadores pedem resposta em JSON e devolvem o texto bruto.

Exemplo (exige chave e o extra):
    >>> chamar = chamada_gemini("gemini-3.5-flash-lite", chave=os.environ["GEMINI_API_KEY"])  # doctest: +SKIP
    >>> TeacherComCuidados(chamar).gerar('Responda {"ok": true}', 0.2)  # doctest: +SKIP
"""

import importlib
from types import ModuleType

from desenha_ml.teacher import ChamadaDeApi

TOKENS_MAXIMOS_DA_RESPOSTA = 8192
INSTALACAO = 'pip install "desenha-ml[teacher]"'


def _importar(modulo: str) -> ModuleType:
    try:
        return importlib.import_module(modulo)
    except ImportError as erro:
        raise RuntimeError(f"a biblioteca {modulo!r} não está instalada; rode {INSTALACAO}") from erro


def _exigir_chave(chave: str, variavel: str) -> None:
    if not chave.strip():
        raise ValueError(
            f"chave da API vazia; defina {variavel} (Colab: Secrets; local: variável de ambiente)"
        )


def chamada_gemini(modelo: str, chave: str) -> ChamadaDeApi:
    _exigir_chave(chave, "GEMINI_API_KEY")
    genai = _importar("google.genai")
    tipos = _importar("google.genai.types")
    cliente = genai.Client(api_key=chave)

    def chamar(prompt: str, temperatura: float) -> str:
        configuracao = tipos.GenerateContentConfig(
            temperature=temperatura,
            max_output_tokens=TOKENS_MAXIMOS_DA_RESPOSTA,
            response_mime_type="application/json",
        )
        resposta = cliente.models.generate_content(model=modelo, contents=prompt, config=configuracao)
        return str(resposta.text)

    return chamar


def chamada_groq(modelo: str, chave: str) -> ChamadaDeApi:
    _exigir_chave(chave, "GROQ_API_KEY")
    groq = _importar("groq")
    cliente = groq.Groq(api_key=chave)

    def chamar(prompt: str, temperatura: float) -> str:
        resposta = cliente.chat.completions.create(
            model=modelo,
            temperature=temperatura,
            max_tokens=TOKENS_MAXIMOS_DA_RESPOSTA,
            messages=[{"role": "user", "content": prompt}],
            response_format={"type": "json_object"},
        )
        return str(resposta.choices[0].message.content)

    return chamar
