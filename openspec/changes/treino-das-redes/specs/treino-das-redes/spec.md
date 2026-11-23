# Spec Delta

## Purpose

Produzir de forma reproduzível a CNN e a LSTM que reconhecem os desenhos do jogo, o peso do ensemble e as métricas de teste, junto com os artefatos que o jogo (ONNX, classes) e o dataset do SLM (predições reais) consomem.

## ADDED Requirements

### Requirement: Separação dos dados
Para cada uma das 30 categorias, só desenhos com `recognized = true` SHALL ser usados, na ordem do arquivo, e divididos em blocos fixos: os primeiros N_treino para treino, os N_val seguintes para validação e os N_teste seguintes para teste (padrão 7.000, 1.000 e 1.000). Um mesmo desenho SHALL aparecer em um único conjunto.

#### Scenario: Blocos sem sobreposição
- **WHEN** a separação recebe 9.000 desenhos reconhecidos de uma categoria com os tamanhos padrão
- **THEN** treino tem os índices 0 a 6.999, validação 7.000 a 7.999 e teste 8.000 a 8.999

#### Scenario: Categoria com poucos desenhos
- **WHEN** uma categoria tem menos desenhos reconhecidos que N_treino + N_val + N_teste
- **THEN** a separação falha com o erro `dados_insuficientes`, indicando a categoria e a quantidade encontrada

### Requirement: Exemplos de treino completos e parciais
Cada exemplo de treino SHALL ter a imagem e a sequência do desenho completo e de um prefixo com fração sorteada uniformemente em [0,3; 0,9], usando o pré-processamento da spec `pre-processamento-de-desenho`, e espessura sorteada em [1,2; 2,0]. Com a mesma semente, os exemplos SHALL ser idênticos.

#### Scenario: Reprodutibilidade
- **WHEN** os exemplos são montados duas vezes com a mesma semente
- **THEN** as imagens, as sequências e as frações são idênticas

#### Scenario: Validação e teste sem sorteio
- **WHEN** os exemplos de validação ou teste são montados
- **THEN** usam o desenho completo e a espessura padrão (1,6)

### Requirement: Saídas das redes
A CNN SHALL receber imagens [lote, 1, 28, 28] com valores em [0, 1], e a LSTM, sequências [lote, tempo, 3] de comprimento variável. As duas SHALL devolver 30 probabilidades por exemplo (softmax já aplicado), com soma 1 ± 1e-5.

#### Scenario: Formato e soma
- **WHEN** um lote de 4 exemplos passa por cada rede
- **THEN** a saída tem forma [4, 30] e cada linha soma 1 ± 1e-5

### Requirement: Peso do ensemble escolhido na validação
O peso `w_cnn` SHALL ser escolhido entre 0; 0,05; …; 1 pela maior acurácia do ensemble na **validação**. Em empate, SHALL vencer o peso mais próximo de 0,5. O conjunto de teste não pode influenciar a escolha.

#### Scenario: Empate favorece o equilíbrio
- **WHEN** os pesos 0,3 e 0,55 empatam com a maior acurácia de validação
- **THEN** o peso escolhido é 0,55

### Requirement: Métricas de teste e critério mínimo
No conjunto de teste, SHALL ser calculados, para CNN, LSTM e ensemble: acurácia, F1 macro e acurácia top-3, além da matriz de confusão do ensemble e da acurácia com 20%, 30%, …, 100% do desenho. O treino SHALL ser aceito somente se a acurácia de teste do ensemble for ≥ 0,85 e a de cada rede for ≥ 0,80.

#### Scenario: Métricas conhecidas
- **WHEN** os rótulos são [0, 1, 1, 2] e as previsões são [0, 1, 2, 2]
- **THEN** a acurácia é 0,75 e o F1 macro é 0,7778 (± 1e-4)

#### Scenario: Treino reprovado
- **WHEN** o ensemble atinge 0,83 de acurácia no teste
- **THEN** o relatório marca o treino como reprovado e informa o critério que falhou

### Requirement: Exportação ONNX conferida
Cada rede SHALL ser exportada para ONNX com entrada `imagem` [lote, 1, 28, 28] ou `sequencia` [lote, tempo, 3] (lote e tempo dinâmicos) e saída `probs` [lote, 30]. Para ao menos 50 exemplos de teste, a diferença absoluta máxima entre o ONNX e o PyTorch SHALL ser ≤ 1e-4; caso contrário, a exportação SHALL falhar.

#### Scenario: Comprimentos diferentes na LSTM
- **WHEN** o ONNX da LSTM recebe sequências de 5 e de 130 pontos
- **THEN** devolve 30 probabilidades nos dois casos, iguais às do PyTorch (≤ 1e-4)

### Requirement: Artefatos para o jogo
O treino SHALL gerar `classes.json`, com as 30 categorias na ordem dos índices das redes, o `w_cnn` escolhido e os parâmetros do pré-processamento, e `teste_paridade_redes.json`, com 8 desenhos de teste (traços originais) e as probabilidades que o ONNX de cada rede devolve para eles.

#### Scenario: Classes na ordem das redes
- **WHEN** o treino termina
- **THEN** a posição i de `classes.json` corresponde à saída i das duas redes e à categoria i de `desenha_ml.categorias`

### Requirement: Relatório de métricas
O treino SHALL gerar `metricas_redes.json` com todas as métricas de teste, o resultado do critério mínimo (aprovado ou reprovado, com o motivo), a quantidade de parâmetros de cada rede e a latência mediana de inferência em CPU.

#### Scenario: Relatório de um treino reprovado
- **WHEN** o critério mínimo não é atingido
- **THEN** `metricas_redes.json` registra `aprovado: false` e o motivo, e os demais artefatos são gerados mesmo assim, para análise

### Requirement: Predições reais para o dataset do SLM
O treino SHALL gerar `predicoes_validacao.json` com ao menos 1.200 desenhos de validação, com as frações 0,35, 0,5, 0,7 e 1,0 em partes iguais, cada um com o alvo e o top-5 da CNN, da LSTM e do ensemble, pelos nomes em português.

#### Scenario: Predições para o dataset do SLM
- **WHEN** o treino termina
- **THEN** `predicoes_validacao.json` tem ao menos 1.200 casos, e cada top-5 vem ordenado pela regra de top-k da spec `julgamento-do-desenho`

### Requirement: Ensaio local antes do Colab
Um script SHALL rodar o pipeline completo em CPU com uma amostra pequena (padrão: 300 desenhos por categoria, 2 épocas), gerando todos os artefatos e conferindo o ONNX contra o PyTorch, sem aplicar o critério mínimo de qualidade.

#### Scenario: Ensaio completo
- **WHEN** o ensaio local é executado nesta máquina
- **THEN** termina sem erro, gera os quatro artefatos e os dois arquivos ONNX, e informa o tempo total
