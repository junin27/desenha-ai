# Spec Delta

## Purpose

Deixar o visitante colorir o desenho como num jogo de desenho on-line (cores, espessuras, balde e conta-gotas), sem mudar o que as redes neurais recebem: elas continuam vendo só os traços.

## ADDED Requirements

### Requirement: Painel de desenho
A tela de desenho SHALL ter um painel com as ferramentas Lápis, Borracha, Balde e Conta-gotas, três espessuras (fina, média e grossa), uma paleta de 16 cores e a indicação da cor atual. No começo de cada rodada SHALL valer o Lápis, a espessura média e a cor tinta `#2b1a0a`.

#### Scenario: Começo da rodada
- **WHEN** a etapa `desenhando` começa
- **THEN** o Lápis, a espessura média e a cor `#2b1a0a` estão selecionados e destacados

### Requirement: Cor e espessura de cada traço
Cada traço SHALL ser desenhado na cor e na espessura escolhidas quando ele começou; trocar de cor ou de espessura SHALL valer só para os traços seguintes. A cor e a espessura SHALL NOT mudar o desenho enviado às redes (a mesma sequência de pontos, como na spec `ferramentas-de-desenho`).

#### Scenario: Traço vermelho
- **WHEN** o visitante escolhe o vermelho e faz um traço
- **THEN** o traço aparece vermelho e as redes recebem os mesmos pontos que receberiam de um traço preto

### Requirement: Balde
Com o Balde, tocar no quadro SHALL pintar com a cor atual a área contínua de mesma cor ao redor do ponto, limitada pelos traços. A pintura SHALL ser só visual: SHALL NOT ir para as redes, SHALL NOT ser removida pela borracha (que apaga traços) e SHALL sumir com o "Limpar".

#### Scenario: Pintar o interior da casa
- **WHEN** a casa está desenhada com traços fechados e o visitante usa o Balde azul dentro dela
- **THEN** o interior fica azul, o lado de fora continua branco e os palpites não mudam

#### Scenario: Borracha não apaga a pintura
- **WHEN** a borracha remove um traço que limitava uma área pintada
- **THEN** o traço some e a pintura continua

### Requirement: Conta-gotas
Com o Conta-gotas, tocar no quadro SHALL tornar a cor atual igual à cor visível naquele ponto (traço, pintura ou fundo) e SHALL voltar para o Lápis.

#### Scenario: Pegar o vermelho da porta
- **WHEN** a porta é um traço vermelho `#b3261e` e o visitante usa o Conta-gotas sobre ela
- **THEN** a cor atual passa a ser `#b3261e` e a ferramenta volta a ser o Lápis
