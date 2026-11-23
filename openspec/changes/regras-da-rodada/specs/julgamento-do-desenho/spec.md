# Spec Delta

## Purpose

Combinar as probabilidades da CNN e da LSTM num único palpite e decidir, de forma determinística, se o visitante acertou, quase acertou ou errou o desenho pedido.

## ADDED Requirements

### Requirement: Combinação no ensemble
O ensemble SHALL calcular, para cada categoria, `w_cnn × p_cnn + (1 − w_cnn) × p_lstm`. As duas listas de probabilidades SHALL ter o mesmo tamanho (o número de categorias), valores entre 0 e 1 e soma entre 0,999 e 1,001; caso contrário, o resultado SHALL ser o erro `probabilidades_invalidas`. `w_cnn` fora de [0, 1] SHALL gerar o erro `peso_invalido`.

#### Scenario: Média ponderada
- **WHEN** p_cnn = [0,6; 0,4], p_lstm = [0,2; 0,8] e w_cnn = 0,75
- **THEN** o ensemble é [0,5; 0,5]

#### Scenario: Tamanhos diferentes
- **WHEN** p_cnn tem 30 valores e p_lstm tem 29
- **THEN** o resultado é o erro `probabilidades_invalidas`

#### Scenario: Peso inválido
- **WHEN** w_cnn = 1,2
- **THEN** o resultado é o erro `peso_invalido`

### Requirement: Palpites ordenados (top-k)
Os palpites SHALL ser ordenados por probabilidade decrescente; em empate exato, a categoria de menor índice SHALL vir primeiro. O top-k SHALL devolver os k primeiros pares (categoria, probabilidade), com k entre 1 e o número de categorias; k fora desse intervalo SHALL gerar o erro `k_invalido`.

#### Scenario: Empate decidido pelo índice
- **WHEN** as probabilidades são [0,1; 0,45; 0,45]
- **THEN** o top-3 é [(1; 0,45), (2; 0,45), (0; 0,1)]

#### Scenario: k fora do intervalo
- **WHEN** há 3 categorias e k = 0 ou k = 4
- **THEN** o resultado é o erro `k_invalido`

### Requirement: Veredito
Dado o índice do desenho pedido (alvo) e as probabilidades do ensemble, o veredito SHALL ser `ACERTOU` se o 1º palpite for o alvo, `QUASE` se o alvo estiver na 2ª ou 3ª posição, e `ERROU` nos outros casos. Alvo fora do intervalo de categorias SHALL gerar o erro `alvo_invalido`.

#### Scenario: Acertou
- **WHEN** o alvo é 2 e o ensemble é [0,1; 0,3; 0,6]
- **THEN** o veredito é `ACERTOU`

#### Scenario: Quase
- **WHEN** o alvo é 0 e o ensemble é [0,25; 0,45; 0,3]
- **THEN** o veredito é `QUASE`

#### Scenario: Errou
- **WHEN** o alvo é 0 e o ensemble de 4 categorias é [0,05; 0,5; 0,3; 0,15]
- **THEN** o veredito é `ERROU`

#### Scenario: Empate no primeiro lugar
- **WHEN** o alvo é 2 e o ensemble é [0,1; 0,45; 0,45]
- **THEN** o veredito é `QUASE`, porque o empate coloca a categoria 1 em primeiro

### Requirement: Vitória antecipada
Durante o desenho, a rodada SHALL ser encerrada antes do tempo quando, ao mesmo tempo: o 1º palpite do ensemble for o alvo, a probabilidade do alvo for maior ou igual a 0,80 e tiverem se passado pelo menos 2,0 segundos desde o início do desenho. O mínimo de tempo evita vitória por ruído no primeiro traço.

#### Scenario: Reconheceu cedo com confiança
- **WHEN** o alvo é o 1º palpite com probabilidade 0,85 e passaram 6,0 segundos
- **THEN** a rodada é encerrada antes do tempo

#### Scenario: Confiança insuficiente
- **WHEN** o alvo é o 1º palpite com probabilidade 0,79 e passaram 10 segundos
- **THEN** a rodada continua

#### Scenario: Cedo demais
- **WHEN** o alvo é o 1º palpite com probabilidade 0,95 e passaram 1,5 segundo
- **THEN** a rodada continua

### Requirement: Contrato entre Python e TypeScript
O Python SHALL gerar `contratos/regras.json` com casos de ensemble, top-k, veredito e vitória antecipada (incluindo os cenários desta spec e casos de erro), e o TypeScript SHALL reproduzir exatamente as mesmas saídas (probabilidades com diferença máxima de 1e-12).

#### Scenario: TypeScript reproduz o contrato de julgamento
- **WHEN** os testes do app rodam sobre `contratos/regras.json`
- **THEN** todos os casos de julgamento dão o mesmo resultado nas duas linguagens
