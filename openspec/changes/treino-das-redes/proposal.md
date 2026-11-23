# Proposal

## Why

O jogo precisa de duas redes treinadas (CNN e LSTM) exportadas para o navegador, e o dataset do SLM precisa das **saídas reais** dessas redes para ensinar o Zé a julgar. Hoje só existe o rascunho do notebook 1, que tem a lógica dentro das células, sem testes, e usa um pré-processamento (OpenCV) diferente do contrato aprovado. Treinar no Colab com esse rascunho arriscaria horas de GPU num pipeline nunca executado, a 7 dias do evento.

**Disciplina:** Redes Neurais (arquiteturas, treino, avaliação e exportação), com a entrega de dados para a parte de SLM.

## What Changes

- Novo módulo de **dados**: separação treino/validação/teste por categoria (determinística) e montagem dos exemplos (imagem 28×28 + sequência stroke-3, completos e parciais) usando o pré-processamento já especificado.
- Novos módulos de **redes** (PyTorch, extra opcional `[treino]`): `RabiscoNet` (CNN residual) e `TracoLSTM` (Conv1D + LSTM bidirecional), mais a exportação ONNX com softmax incluído.
- Novo módulo de **avaliação** (numpy): acurácia, F1 macro, top-3, matriz de confusão, escolha do peso do ensemble na validação e curva de reconhecimento antecipado.
- Novo módulo de **artefatos**: `classes.json`, `metricas_redes.json`, `predicoes_validacao.json` (top-5 reais para o dataset do SLM) e `teste_paridade_redes.json` (desenho → probabilidades esperadas do ONNX, para o adaptador do app).
- **Ensaio local** (`scripts/ensaio_treino_local.py`): roda o pipeline inteiro em CPU com amostra pequena e confere o ONNX contra o PyTorch, antes do Colab.
- **Notebook 1** regenerado: instala o pacote (wheel) e só orquestra download, treino na GPU, gráficos e download dos artefatos.

### Fora do escopo

- Inferência das redes no navegador (adaptador `onnxruntime-web`): change `jogo-web`.
- Busca de hiperparâmetros além do peso do ensemble.
- Treinar com as 345 categorias do Quick, Draw!.
- Publicar os pesos ou o dataset processado.

## Capabilities

### New Capabilities

- `treino-das-redes`: produz, de forma reproduzível, a CNN e a LSTM treinadas, o peso do ensemble, as métricas de teste e os artefatos consumidos pelo jogo e pelo dataset do SLM, com critérios mínimos de qualidade.

### Modified Capabilities

(nenhuma)

## Impact

- **Novo código:** `ml/src/desenha_ml/{dados,redes,avaliacao,artefatos}.py`, `scripts/ensaio_treino_local.py`, `notebooks/fontes/01_redes_neurais_cnn_lstm.py` reescrito.
- **Dependências:** extra opcional `treino = ["torch>=2.4", "onnx>=1.16"]` (o núcleo continua só com `numpy`); `onnxscript` no Colab se o exportador clássico do PyTorch não estiver disponível.
- **Uso de rede:** o ensaio local e o notebook baixam parte do Quick, Draw! (CC BY 4.0) direto do Google Cloud Storage público.
- **Entregáveis para o usuário:** `ml/dist/desenha_ml-*.whl` (enviado ao Colab junto com o notebook).
