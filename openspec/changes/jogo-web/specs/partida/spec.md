# Spec Delta

## Purpose

Conduzir uma partida do Desenha Aí, Sô! do apelido ao placar — charada, desenho com tempo, veredito e pontos — de forma determinística e independente de tela, continuando jogável mesmo quando o Zé (SLM) falha.

## ADDED Requirements

### Requirement: Etapas da partida
Uma partida SHALL passar pelas etapas, nesta ordem: `inicio` → (para cada uma das 3 rodadas: `charada` → `desenhando` → `julgando` → `resultado`) → `fim`. Só um nome válido pela spec `pontuacao-e-placar` SHALL permitir sair de `inicio`.

#### Scenario: Partida completa
- **WHEN** o jogador informa um nome válido e joga as 3 rodadas até o fim
- **THEN** as etapas percorridas são inicio, 3 vezes (charada, desenhando, julgando, resultado) e fim

#### Scenario: Nome inválido
- **WHEN** o jogador tenta começar com o nome vazio
- **THEN** a partida continua em `inicio` e informa o erro `nome_invalido`

### Requirement: Categorias sorteadas sem repetição
Cada rodada SHALL ter uma das 30 categorias, sorteada de forma que não se repita dentro da mesma partida. O sorteador SHALL ser injetável, para os testes serem determinísticos.

#### Scenario: Três categorias diferentes
- **WHEN** uma partida tem 3 rodadas
- **THEN** as 3 categorias são distintas

### Requirement: Charada com reserva
Na etapa `charada`, a partida SHALL pedir uma charada ao narrador. Se o narrador falhar, passar do limite de tempo, devolver fala fora do formato ou uma charada que vaza a palavra (spec `vazamento-da-palavra-secreta`), a partida SHALL usar uma charada de reserva da categoria e registrar a origem `reserva`.

#### Scenario: Charada do Zé que vaza
- **WHEN** o narrador devolve "Charada: Quem é a vaquinha?" para a categoria vaca
- **THEN** a rodada mostra uma charada de reserva da vaca, com origem `reserva`

### Requirement: Tempo do desenho e vitória antecipada
A etapa `desenhando` SHALL durar no máximo 20 s, contados do primeiro traço. A cada palpite das redes, se a regra de vitória antecipada da spec `julgamento-do-desenho` for satisfeita, a rodada SHALL ir para `julgando` imediatamente. O jogador SHALL poder encerrar antes do tempo com o botão "Pronto". Uma rodada sem nenhum traço até 20 s depois do início da etapa SHALL ser julgada como `ERROU`.

#### Scenario: Vitória antecipada
- **WHEN** aos 6 s o ensemble dá 85% para a categoria pedida
- **THEN** a rodada vai para `julgando` com 14 s restantes

#### Scenario: Tempo esgotado
- **WHEN** chegam os 20 s sem vitória antecipada
- **THEN** a rodada vai para `julgando` com 0 s restantes e o último palpite das redes

### Requirement: Veredito e pontos pela regra
Em `julgando`, o veredito e os pontos da rodada SHALL vir das regras das specs `julgamento-do-desenho` e `pontuacao-e-placar`, aplicadas ao último palpite do ensemble. A narração SHALL ser pedida ao narrador com a entrada VEREDITO da spec `conversa-com-o-ze`. Se o narrador falhar, ou se o veredito da fala do Zé discordar da regra, a narração SHALL ser uma narração-modelo coerente com a regra, e a discordância SHALL ser registrada.

#### Scenario: Zé discorda da regra
- **WHEN** a regra dá QUASE e o Zé responde VEREDITO: ACERTOU
- **THEN** a rodada vale os pontos de QUASE, mostra uma narração-modelo de QUASE e registra a discordância

#### Scenario: Pontos de um acerto rápido
- **WHEN** o veredito é ACERTOU com 14 s restantes
- **THEN** a rodada vale 135 pontos

### Requirement: Fim da partida e placar
Ao fim da 3ª rodada, a partida SHALL somar os pontos e gravar no placar o nome, o total e o horário de término.

#### Scenario: Partida gravada
- **WHEN** as rodadas valem 135, 30 e 0
- **THEN** o placar recebe uma partida de 165 pontos com o nome do jogador
