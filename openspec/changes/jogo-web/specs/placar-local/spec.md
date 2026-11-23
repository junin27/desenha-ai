# Spec Delta

## Purpose

Guardar as partidas no navegador do estande durante o evento, para o placar sobreviver a recarregamentos e ser zerado pela organização quando preciso.

## ADDED Requirements

### Requirement: Persistência no navegador
Cada partida terminada SHALL ser gravada no `localStorage` do jogo e o placar exibido SHALL ser lido de lá, ordenado pela spec `pontuacao-e-placar`. Dados corrompidos ou de outro formato SHALL ser ignorados, começando um placar vazio, sem travar o jogo.

#### Scenario: Recarregar a página
- **WHEN** há 5 partidas gravadas e a página é recarregada
- **THEN** o placar mostra as mesmas 5 partidas

#### Scenario: Dados corrompidos
- **WHEN** o valor guardado não é um JSON válido
- **THEN** o placar começa vazio e o jogo continua

### Requirement: Zerar o placar
A organização SHALL poder zerar o placar pela tela de início com o atalho Ctrl+Shift+Z seguido de confirmação, sem afetar outras configurações.

#### Scenario: Placar zerado
- **WHEN** o atalho é usado e a confirmação é aceita
- **THEN** o placar fica vazio
