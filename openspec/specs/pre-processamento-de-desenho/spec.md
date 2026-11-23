# pre-processamento-de-desenho Specification

## Purpose

Transformar um desenho feito à mão (lista de traços) nas entradas da CNN (imagem 28×28) e da LSTM (sequência stroke-3), de forma idêntica no treino (Python) e no jogo (TypeScript).

## Requirements

### Requirement: Formato do desenho
Um desenho SHALL ser uma lista ordenada de traços; cada traço SHALL ser uma lista ordenada de pontos (x, y) em números reais, na ordem em que foram desenhados. Um desenho sem nenhum ponto SHALL ser recusado com o erro `desenho_vazio`, devolvido como valor (sem exceção).

#### Scenario: Desenho vazio é recusado
- **WHEN** o pré-processamento recebe um desenho sem traços, ou só com traços sem pontos
- **THEN** o resultado é o erro `desenho_vazio` e nenhuma imagem ou sequência é produzida

#### Scenario: Traços vazios são ignorados
- **WHEN** o desenho tem um traço com pontos e outro traço sem pontos
- **THEN** o resultado é igual ao do desenho só com o traço que tem pontos

### Requirement: Normalização
A normalização SHALL subtrair de todos os pontos o menor x e o menor y do desenho e multiplicar as coordenadas por 255 dividido pela maior dimensão (largura ou altura). Se a maior dimensão for 0, o fator SHALL ser 255 dividido por 1, para não haver divisão por zero.

#### Scenario: Desenho mais largo que alto
- **WHEN** o desenho tem pontos (10, 20), (110, 20) e (60, 70)
- **THEN** os pontos normalizados são (0, 0), (255, 0) e (127,5; 127,5)

#### Scenario: Desenho de um único ponto
- **WHEN** o desenho tem apenas o ponto (40, 40)
- **THEN** o ponto normalizado é (0, 0)

### Requirement: Simplificação de traços capturados
Desenhos capturados no jogo SHALL ser normalizados e, depois, ter cada traço simplificado pelo algoritmo Ramer–Douglas–Peucker com ε = 2,0 (nas coordenadas normalizadas). O primeiro e o último ponto de cada traço SHALL ser sempre mantidos. Desenhos do dataset Quick, Draw! (já simplificados) não passam por essa etapa.

#### Scenario: Pontos colineares são removidos
- **WHEN** um traço normalizado tem os pontos (0, 0), (50, 0,5), (100, 0) e (255, 0)
- **THEN** o traço simplificado tem apenas (0, 0) e (255, 0)

#### Scenario: Canto do traço é preservado
- **WHEN** um traço normalizado tem os pontos (0, 0), (255, 0) e (255, 255)
- **THEN** os três pontos são mantidos

### Requirement: Prefixo do desenho
O prefixo de fração p (0 < p ≤ 1) SHALL manter os primeiros ⌈p × N⌉ pontos do desenho (N = total de pontos), percorrendo os traços em ordem e cortando o último traço no meio se preciso, com no mínimo 2 pontos (ou N, se N < 2). O prefixo SHALL ser normalizado de novo. Fração fora de (0, 1] SHALL gerar o erro `fracao_invalida`.

#### Scenario: Prefixo corta no meio do segundo traço
- **WHEN** o desenho tem um traço de 4 pontos e outro de 6 pontos, e p = 0,5
- **THEN** o prefixo tem o primeiro traço inteiro e o primeiro ponto do segundo traço (5 pontos)

#### Scenario: Prefixo mínimo
- **WHEN** o desenho tem 10 pontos e p = 0,05
- **THEN** o prefixo tem 2 pontos

#### Scenario: Fração inválida
- **WHEN** p = 0 ou p = 1,2
- **THEN** o resultado é o erro `fracao_invalida`

### Requirement: Imagem 28×28 para a CNN
A imagem SHALL ter 28×28 pixels com valores em [0, 1] (fundo 0, traço 1). O desenho normalizado SHALL ser escalado por 22/255 (caixa de 22 pixels) e centralizado na grade. Cada pixel SHALL valer a fração de seus 16 subpontos (grade 4×4, nos centros de cada sub-célula) cuja distância ao traço mais próximo seja menor ou igual à metade da espessura. A espessura padrão SHALL ser 1,6 pixel e SHALL poder ser alterada. Um traço de um único ponto SHALL ser desenhado como um disco.

#### Scenario: Valores possíveis de um pixel
- **WHEN** qualquer desenho válido é rasterizado
- **THEN** todo pixel tem valor k/16, com k inteiro de 0 a 16

#### Scenario: Linha horizontal centralizada
- **WHEN** o desenho é um único traço de (0, 0) a (255, 0), rasterizado com espessura 1,6 (a linha fica em y = 14, na divisa entre as linhas de pixel 13 e 14, contando de 0, e vai de x = 3 a x = 25)
- **THEN** as linhas 13 e 14 valem 12/16 nas colunas 3 a 24, e as linhas 0 a 12 e 15 a 27 são totalmente 0

#### Scenario: Ponto isolado vira disco
- **WHEN** o desenho tem um único ponto, rasterizado com espessura 1,6 (disco de raio 0,8 centrado em (14, 14))
- **THEN** os pixels das linhas 13–14 e colunas 13–14 valem 8/16 cada um, e todos os outros valem 0

#### Scenario: Espessura maior pinta mais pixels
- **WHEN** o mesmo desenho é rasterizado com espessura 1,2 e com espessura 2,0
- **THEN** a soma dos pixels com espessura 2,0 é maior que a soma com espessura 1,2

### Requirement: Sequência stroke-3 para a LSTM
A sequência SHALL ter uma linha por ponto do desenho normalizado, na ordem de desenho, com três valores: Δx/255, Δy/255 e fim do traço (1 no último ponto de cada traço, 0 nos demais). O primeiro ponto SHALL usar a posição absoluta dividida por 255. A sequência SHALL ser cortada nos primeiros 130 pontos.

#### Scenario: Dois traços
- **WHEN** o desenho normalizado tem os traços [(0, 0), (255, 0)] e [(255, 255)]
- **THEN** a sequência é [(0, 0, 0), (1, 0, 1), (0, 1, 1)]

#### Scenario: Desenho longo é cortado
- **WHEN** o desenho tem 200 pontos
- **THEN** a sequência tem 130 linhas

### Requirement: Contrato entre Python e TypeScript
O Python SHALL gerar arquivos de contrato com desenhos de exemplo e as saídas esperadas de normalização, simplificação, prefixo, imagem e sequência, cobrindo ao menos: desenho real do Quick, Draw!, ponto único, traço único, desenho com mais de 130 pontos, desenho degenerado (linha vertical) e prefixo. A implementação TypeScript SHALL reproduzir as saídas: sequências com diferença absoluta máxima de 1e-5, e imagens com no máximo 2 pixels diferentes por imagem, cada um diferindo no máximo 1/16.

#### Scenario: TypeScript reproduz o contrato
- **WHEN** os testes do app rodam sobre os arquivos de `contratos/`
- **THEN** todos os casos ficam dentro das tolerâncias definidas

#### Scenario: Contrato desatualizado é detectado
- **WHEN** o pré-processamento do Python muda e o contrato não é regenerado
- **THEN** um teste do Python que regenera as saídas e compara com o arquivo versionado falha

### Requirement: Desempenho no navegador
O pré-processamento completo em TypeScript (normalização, simplificação, imagem e sequência) de um desenho com 130 pontos SHALL levar no máximo 15 ms (mediana de 50 execuções) no ambiente de testes, para permitir palpites a cada traço durante o jogo.

#### Scenario: Medição de desempenho
- **WHEN** o teste de desempenho pré-processa 50 vezes um desenho com 130 pontos
- **THEN** a mediana do tempo é menor ou igual a 15 ms
