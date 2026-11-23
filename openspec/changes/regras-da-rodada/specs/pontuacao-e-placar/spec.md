# Spec Delta

## Purpose

Transformar o veredito de cada rodada em pontos, somar a partida e ordenar o placar de forma justa e previsível, já que o placar aparece para o público durante a votação popular.

## ADDED Requirements

### Requirement: Pontos da rodada
A rodada SHALL valer 100 pontos mais um bônus de tempo quando o veredito for `ACERTOU`, 30 pontos quando for `QUASE` e 0 quando for `ERROU`. O bônus SHALL ser ⌊50 × segundos restantes ÷ 20⌋ (arredondado para baixo), com os segundos restantes limitados ao intervalo [0, 20]. A pontuação da rodada vem desta regra, e não da fala do Zé (decisão D-08).

#### Scenario: Acertou com 10 segundos sobrando
- **WHEN** o veredito é `ACERTOU` e restam 10,0 segundos
- **THEN** a rodada vale 125 pontos

#### Scenario: Bônus arredondado para baixo
- **WHEN** o veredito é `ACERTOU` e restam 0,7 segundo
- **THEN** a rodada vale 101 pontos (⌊1,75⌋ = 1)

#### Scenario: Quase vale 30 sem bônus
- **WHEN** o veredito é `QUASE` e restam 15 segundos
- **THEN** a rodada vale 30 pontos

#### Scenario: Errou vale zero
- **WHEN** o veredito é `ERROU` e restam 15 segundos
- **THEN** a rodada vale 0 pontos

#### Scenario: Tempo restante negativo
- **WHEN** o veredito é `ACERTOU` e os segundos restantes são −3
- **THEN** a rodada vale 100 pontos

#### Scenario: Tempo restante acima do limite
- **WHEN** o veredito é `ACERTOU` e os segundos restantes são 25
- **THEN** a rodada vale 150 pontos

### Requirement: Pontos da partida
Uma partida SHALL ter 3 rodadas, e o total SHALL ser a soma dos pontos das rodadas jogadas.

#### Scenario: Soma das rodadas
- **WHEN** as rodadas valem 125, 30 e 0
- **THEN** o total da partida é 155

### Requirement: Nome no placar
O nome do jogador SHALL ter os espaços das pontas removidos e os espaços repetidos reduzidos a um. Depois disso, ele SHALL ter de 1 a 16 caracteres; caso contrário, o resultado SHALL ser o erro `nome_invalido`.

#### Scenario: Nome limpo
- **WHEN** o nome digitado é "  Zé   da  Roça "
- **THEN** o nome no placar é "Zé da Roça"

#### Scenario: Nome vazio ou longo demais
- **WHEN** o nome tem só espaços, ou 17 caracteres ou mais depois da limpeza
- **THEN** o resultado é o erro `nome_invalido`

### Requirement: Ordem do placar
O placar SHALL ordenar as partidas por pontos (decrescente) e, em empate, pela partida terminada primeiro (horário crescente), mostrando no máximo as 10 primeiras.

#### Scenario: Empate decidido por quem jogou antes
- **WHEN** Ana fez 200 pontos às 10h05, Bia fez 200 às 10h01 e Caio fez 250 às 10h10
- **THEN** a ordem é Caio, Bia, Ana

#### Scenario: Só as 10 melhores
- **WHEN** existem 12 partidas
- **THEN** o placar mostra 10

### Requirement: Contrato de pontuação
`contratos/regras.json` SHALL conter os casos de pontos da rodada, limpeza de nome e ordem do placar, e o TypeScript SHALL reproduzir exatamente as mesmas saídas.

#### Scenario: TypeScript reproduz o contrato de pontuação
- **WHEN** os testes do app rodam sobre `contratos/regras.json`
- **THEN** todos os casos de pontuação e placar dão o mesmo resultado nas duas linguagens
