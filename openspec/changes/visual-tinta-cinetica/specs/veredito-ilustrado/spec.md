# Spec Delta

## Purpose

Mostrar no veredito o que aconteceu de verdade na rodada: o desenho do visitante, o resultado pela regra, o que cada rede neural achou e uma comemoração no acerto.

## ADDED Requirements

### Requirement: Desenho do visitante no veredito
A tela de veredito SHALL mostrar o desenho da rodada exatamente com os traços que foram julgados (depois de borracha e limpar), com a legenda "Era: <categoria>".

#### Scenario: Desenho com borracha
- **WHEN** o visitante fez 4 traços, apagou 1 e apertou "Pronto"
- **THEN** o veredito mostra só os 3 traços que sobraram

### Requirement: Selo do resultado
Sobre o desenho SHALL aparecer o selo do veredito da regra (spec `julgamento-do-desenho`): "ACERTOU!" em verde `#2f7d32`, "QUASE!" em mostarda escura `#8a5c00` ou "ERROU" em vermelho `#b3261e`, escrito e circulado como à mão. Os pontos da rodada (spec `pontuacao-e-placar`) e o total da partida SHALL aparecer ao lado.

#### Scenario: Selo de QUASE
- **WHEN** a regra dá QUASE
- **THEN** o selo mostra "QUASE!" em `#8a5c00` e os pontos são os de QUASE

### Requirement: O que cada rede achou
O veredito SHALL mostrar o palpite principal (maior probabilidade) da CNN, da LSTM e do ensemble no último palpite da rodada, com o nome da categoria e a probabilidade em %. O palpite igual à categoria pedida SHALL ser destacado em verde e o diferente em vermelho. Rodada sem nenhum traço SHALL mostrar "—" nas três redes.

#### Scenario: Redes discordam
- **WHEN** a categoria pedida é casa, a CNN dá celeiro 52%, a LSTM dá casa 61% e o ensemble dá casa 55%
- **THEN** o veredito mostra CNN "celeiro 52%" em vermelho, LSTM "casa 61%" e ensemble "casa 55%" em verde

#### Scenario: Nenhum traço
- **WHEN** a rodada termina sem traços
- **THEN** as três redes mostram "—"

### Requirement: Comemoração no acerto
No veredito ACERTOU SHALL disparar confete nas cores da paleta, que termina sozinho em até 4 s e não deixa resto na tela. QUASE e ERROU SHALL NOT disparar confete.

#### Scenario: Confete some
- **WHEN** o veredito é ACERTOU e se passam 4 s
- **THEN** não há confete visível

#### Scenario: Errou não comemora
- **WHEN** o veredito é ERROU logo depois de uma rodada ACERTOU
- **THEN** nenhum confete aparece na tela
