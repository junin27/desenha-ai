# Proposal

## Why

A CNN e a LSTM são treinadas no Colab (Python) e executadas no navegador durante o jogo (TypeScript). Se o desenho do visitante for transformado de modo diferente do treino (escala, espessura do traço, antialias, ordem dos pontos), as redes erram sem que nenhum teste perceba. Isso precisa estar resolvido **antes** do treino (change 3) e do app (change 6), porque ambos dependem do mesmo formato de entrada.

**Disciplina:** Redes Neurais (entrada da CNN e da LSTM), com efeito no SLM, que recebe as probabilidades dessas redes.

## What Changes

- Define o formato canônico de um **desenho** (lista de traços com coordenadas x/y) e a **normalização** (alinhar ao canto superior esquerdo e escalar a maior dimensão para 255, como no Quick, Draw! *simplified*).
- Define a **simplificação** RDP (ε = 2) para desenhos capturados no navegador, que chegam com muito mais pontos que os do dataset.
- Define o **prefixo** de um desenho (os primeiros *p*% dos pontos, renormalizado), usado no aumento de dados e na avaliação de "quem adivinha mais cedo".
- Define a **imagem 28×28** da CNN por uma rasterização própria (cobertura por distância ao segmento, supersample 4×4), idêntica nas duas linguagens.
- Define a **sequência stroke-3** da LSTM (Δx/255, Δy/255, fim do traço; no máximo 130 pontos).
- Implementa tudo no pacote Python `desenha_ml` e no domínio do app TypeScript, com **fixtures de contrato** em `contratos/` geradas pelo Python e verificadas pelos testes do TypeScript.

### Fora do escopo

- Treino, exportação ONNX e inferência das redes (change `treino-das-redes`).
- Captura de eventos do mouse/toque no canvas e a interface do jogo (change `jogo-web`).
- Aumento de dados geométrico (rotação, escala, translação), que fica no notebook de treino.
- Download do dataset Quick, Draw!.

## Capabilities

### New Capabilities

- `pre-processamento-de-desenho`: transforma um desenho (traços) nas entradas das redes neurais — normalização, simplificação, prefixo, imagem 28×28 e sequência stroke-3 — com resultado idêntico em Python e TypeScript, garantido por contrato.

### Modified Capabilities

(nenhuma)

## Impact

- **Novo código:** `ml/` (pacote `desenha_ml`, pyproject, pytest, mypy, ruff) e `app/` (projeto Vite + TypeScript + Vitest, só a camada `domain` nesta change).
- **Novo diretório:** `contratos/` com as fixtures JSON versionadas.
- **Dependências:** Python `numpy` (runtime), `pytest`, `mypy`, `ruff` (dev); Node `typescript`, `vite`, `vitest`, `eslint`, `prettier` (dev).
- **Notebook 1** passa a importar o pré-processamento do pacote; o rascunho atual usa OpenCV e será ajustado na change `treino-das-redes`.
