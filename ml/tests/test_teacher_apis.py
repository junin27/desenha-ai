"""Adaptadores do Teacher: o pacote importa sem o extra [teacher], e a falta da biblioteca é explicada."""

import importlib.util

import pytest

from desenha_ml.teacher_apis import chamada_gemini, chamada_groq


@pytest.mark.skipif(importlib.util.find_spec("google.genai") is not None, reason="google-genai instalado")
def test_gemini_sem_biblioteca_explica_como_instalar() -> None:
    with pytest.raises(RuntimeError, match=r"desenha-ml\[teacher\]"):
        chamada_gemini(modelo="gemini-3.5-flash-lite", chave="chave-de-teste")


@pytest.mark.skipif(importlib.util.find_spec("groq") is not None, reason="groq instalado")
def test_groq_sem_biblioteca_explica_como_instalar() -> None:
    with pytest.raises(RuntimeError, match=r"desenha-ml\[teacher\]"):
        chamada_groq(modelo="llama-3.3-70b-versatile", chave="chave-de-teste")


def test_chave_vazia_e_recusada_antes_de_qualquer_importacao() -> None:
    with pytest.raises(ValueError, match="GEMINI_API_KEY"):
        chamada_gemini(modelo="gemini-3.5-flash-lite", chave="")
