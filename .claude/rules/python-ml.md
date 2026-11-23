---
paths:
  - "ml/**"
  - "notebooks/**"
---

# Regras do pacote `desenha_ml` e dos notebooks

- Layout `ml/src/desenha_ml/` + `ml/tests/`. Python ≥ 3.11 (o Colab usa 3.12/3.13; local é 3.15).
- Núcleo puro: um módulo por responsabilidade (`tracos.py`, `rasterizacao.py`, `sequencia.py`, `veredito.py`, `curadoria.py`, `formato_chat.py`). Nada de `requests`, `torch` ou leitura de arquivo nesses módulos; isso fica nos notebooks/scripts.
- Dependências de runtime mínimas (`numpy`). `torch`, `unsloth` e afins são extras opcionais (`[treino]`), importados só nos notebooks.
- Tipos: `numpy.typing.NDArray[np.float32]` etc.; estruturas com `@dataclass(frozen=True)` ou `TypedDict`, nunca `dict` solto.
- Testes: pytest, um arquivo por módulo, nomes que citam o requisito da spec. Dublês de teste são classes nomeadas (`TeacherFalso`), não `Mock()` inline.
- Notebook não contém regra de negócio: se uma célula decide algo (filtro, regra, formato), essa lógica vai para `desenha_ml` com teste, e a célula só chama a função. A primeira célula instala o pacote (`pip install "git+…"` ou do zip enviado).
- Notebooks são gerados a partir de `notebooks/fontes/*.py` (formato percent `# %%`) por `scripts/gerar_notebooks.py`; edite a fonte, nunca o `.ipynb` à mão.
