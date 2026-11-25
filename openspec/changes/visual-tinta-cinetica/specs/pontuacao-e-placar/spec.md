# Spec Delta

## MODIFIED Requirements

### Requirement: Ordem do placar
O placar SHALL ordenar as partidas por pontos (decrescente) e, em empate, pela partida terminada primeiro (horário crescente). Essa ordem oficial SHALL numerar todas as partidas gravadas, a partir de 1º. Sem pesquisa, a lista SHALL mostrar no máximo as 10 primeiras; a pesquisa SHALL alcançar todas as partidas, e cada uma é mostrada com a posição desta ordem.

#### Scenario: Empate decidido por quem jogou antes
- **WHEN** Ana fez 200 pontos às 10h05, Bia fez 200 às 10h01 e Caio fez 250 às 10h10
- **THEN** a ordem é Caio, Bia, Ana

#### Scenario: Só as 10 melhores
- **WHEN** existem 12 partidas e ninguém pesquisou nada
- **THEN** a lista mostra as 10 primeiras, numeradas de 1º a 10º

#### Scenario: Pesquisa alcança além das 10
- **WHEN** existem 12 partidas e o visitante pesquisa o apelido da 12ª colocada
- **THEN** a lista mostra essa partida como 12º
