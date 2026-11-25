# Spec Delta

## Purpose

Mostrar o placar do evento como um pódio das 5 melhores partidas e uma lista das 10 primeiras que o visitante pode pesquisar (alcançando todas as partidas) pelo apelido e ordenar, sem mudar a ordem oficial do placar.

## ADDED Requirements

### Requirement: Pódio das 5 melhores
A tela de placar SHALL mostrar um pódio com as até 5 primeiras partidas da ordem oficial (spec `pontuacao-e-placar`), com a posição, o apelido e os pontos, o 1º lugar no degrau mais alto e ao centro. Com menos de 5 partidas, SHALL mostrar só os degraus existentes.

#### Scenario: Pódio com 3 partidas
- **WHEN** o placar tem 3 partidas
- **THEN** o pódio mostra 3 degraus, com a 1ª colocada no mais alto

### Requirement: Posição oficial em todas as listagens
Cada partida SHALL ser mostrada com a posição que tem na ordem oficial, mesmo quando a lista estiver filtrada ou ordenada de outro jeito.

#### Scenario: Pesquisa mantém a posição
- **WHEN** Juninho é o 7º colocado e o visitante pesquisa "jun"
- **THEN** a lista mostra só "7º Juninho" com seus pontos

### Requirement: Pesquisa por apelido
A lista SHALL ter um campo de pesquisa que filtra as partidas cujo apelido contém o texto digitado, sem diferenciar maiúsculas, minúsculas nem acentos. Sem resultado, a lista SHALL mostrar "Ninguém com "<texto>" no placar.".

#### Scenario: Sem acento
- **WHEN** o placar tem "Peão Veloz" e o visitante pesquisa "peao"
- **THEN** "Peão Veloz" aparece na lista

#### Scenario: Pesquisa sem resultado
- **WHEN** o visitante pesquisa "xyz"
- **THEN** a lista mostra "Ninguém com "xyz" no placar."

### Requirement: Ordenar a lista
A lista SHALL poder ser ordenada por "Pontos" (ordem oficial, padrão), "A–Z" (apelido em ordem alfabética, sem diferenciar acentos) ou "Recentes" (horário de término, mais recente primeiro). A opção ativa SHALL ficar destacada.

#### Scenario: Recentes
- **WHEN** Ana terminou às 10h05, Bia às 10h01 e o visitante escolhe "Recentes"
- **THEN** Ana aparece antes de Bia

### Requirement: Partida recém-jogada em destaque
Ao abrir o placar depois de uma partida, a linha dessa partida SHALL aparecer destacada e visível sem o visitante precisar rolar. Se ela estiver fora das 10 primeiras, SHALL aparecer logo abaixo da 10ª, com a sua posição oficial.

#### Scenario: Dentro do top 10
- **WHEN** a partida de Juninho termina em 4º lugar
- **THEN** o placar abre com a linha "4º Juninho" destacada

#### Scenario: Fora do top 10
- **WHEN** a partida de Juninho termina em 12º lugar
- **THEN** o placar mostra as 10 primeiras e, abaixo delas, a linha "12º Juninho" destacada
