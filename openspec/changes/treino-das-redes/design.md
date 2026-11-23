# Design

## Context

O núcleo `desenha_ml` já tem o pré-processamento (spec `pre-processamento-de-desenho`), as regras de top-k e veredito (`julgamento-do-desenho`) e a lista de categorias. O rascunho `notebooks/fontes/01_redes_neurais_cnn_lstm.py` tem as arquiteturas e o laço de treino dentro das células, com rasterização OpenCV (que diverge do contrato). Ambiente: Python 3.15 local com torch 2.15 CPU (instalado no venv de teste do scratchpad, ainda não no `ml/.venv`), sem `onnxruntime`; Colab com GPU T4 e o Python dele. Motivação em `proposal.md`.

## Goals / Non-Goals

**Goals:**
- Tudo que decide algo (separação, montagem dos exemplos, métricas, escolha do peso, formato dos artefatos) fica no pacote, com teste.
- O mesmo código roda no ensaio local (CPU) e no Colab (GPU); só muda o tamanho.
- Conferir o ONNX sem `onnxruntime`, usando o `onnx.reference.ReferenceEvaluator` (Python puro).

**Non-Goals:**
- Laço de treino genérico ou framework próprio: o laço é simples e fica em `redes.py`, sem abstrações extras.

## Decisions

### D1 — Módulos novos
| Módulo | Dependências | Responsabilidade |
|---|---|---|
| `dados.py` | numpy | separar por categoria, montar exemplos (completos/parciais), empacotar sequências com padding |
| `avaliacao.py` | numpy | acurácia, F1 macro, top-k, matriz de confusão, escolha de `w_cnn`, curva antecipada, critério mínimo |
| `artefatos.py` | numpy | montar `classes.json`, `metricas_redes.json`, `predicoes_validacao.json`, `teste_paridade_redes.json` |
| `redes.py` | torch, onnx (extra `[treino]`) | arquiteturas, laço de treino, previsão em lote, exportação e conferência ONNX |

`dados`, `avaliacao` e `artefatos` não importam torch: os testes rodam rápido e as regras ficam claras. Só `redes.py` (e o teste dele) exige o extra.

### D2 — Arquiteturas (as mesmas do rascunho, já revisadas)
- `RabiscoNet`: normalização fixa → conv 3×3 (32) → blocos residuais 32, 64 (stride 2), 64, 128 (stride 2), 128 → GAP → Dropout 0,3 → Dense(30). Cerca de 700 mil parâmetros.
- `TracoLSTM`: Conv1D(3→64, k=5) → Conv1D(64→96, k=5) → LSTM bidirecional de 2 camadas (128, dropout 0,3) → estados finais de ida e de volta → Dropout → Dense(30). Treino com `pack_padded_sequence`; exportação sem ele (lote de 1, sem padding).
- **Alternativa descartada:** Transformer sobre os traços (mais lento em CPU no navegador, e a LSTM é o conteúdo da disciplina).

### D3 — Treino
AdamW + OneCycle, *label smoothing* 0,1, *clip* de gradiente 1,0 (protege a LSTM de *exploding gradients*), metade de cada lote com exemplos parciais, aumento geométrico na GPU só para a CNN (rotação ±12°, escala 0,9–1,1, translação ±2 px) e checkpoint pela acurácia de validação. Colab: 15 épocas cada rede. Ensaio local: 2 épocas e 300 desenhos por categoria.

### D4 — Conferência do ONNX sem onnxruntime
`onnx.checker` + `onnx.reference.ReferenceEvaluator` comparando com o PyTorch em ≥ 50 exemplos (≤ 1e-4). Exportador clássico (`dynamo=False`, opset 17, operador `LSTM` nativo) com *fallback* para `dynamo=True` se o clássico não existir na versão do Colab. O app confere de novo no navegador (change `jogo-web`) usando `teste_paridade_redes.json`.
- **Alternativa descartada:** instalar onnxruntime num Python mais antigo só para testar (mais um ambiente para manter).

### D5 — Pacote no Colab via wheel
`python -m build` gera `ml/dist/desenha_ml-0.1.0-py3-none-any.whl`. O usuário envia o wheel junto com o notebook, e a primeira célula roda `pip install desenha_ml-*.whl[treino]`. O torch do Colab já vem instalado e satisfaz o extra.
- **Alternativa descartada:** `pip install git+…` (o repositório só será publicado depois do evento, D-09).

### D6 — Escolha de `w_cnn`
Grade de 0 a 1 com passo 0,05 (21 valores, calculados como `i / 20` para não acumular erro de ponto flutuante). O desempate pelo mais próximo de 0,5 evita confiar só em uma rede por acaso.

## Risks / Trade-offs

- [Acurácia abaixo do critério no Colab] → o critério é checado no próprio notebook; plano B é treinar mais épocas ou aumentar `N_treino` para 10.000 (o download por streaming suporta).
- [Exportador clássico removido no PyTorch do Colab] → *fallback* para o dynamo (D4); o `ReferenceEvaluator` confere o resultado nos dois casos.
- [Ensaio local lento] → amostra e épocas parametrizáveis; meta de até 15 min nesta CPU.
- [Download do Quick, Draw! falha no Colab] → leitura por streaming com novas tentativas; os arrays processados ficam salvos no Drive para reaproveitar.
