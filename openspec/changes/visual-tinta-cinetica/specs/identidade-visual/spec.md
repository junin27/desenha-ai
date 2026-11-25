# Spec Delta

## Purpose

Definir a aparência "Tinta cinética" do jogo (paleta, traço e movimento) e as garantias de legibilidade, de funcionamento offline e de movimento reduzido que ela tem de respeitar no estande.

## ADDED Requirements

### Requirement: Paleta do jogo
As cores da interface SHALL vir de uma paleta única: papel `#f7ecd4`, papel escuro `#ead7ad`, quadro `#fffdf6`, tinta `#2b1a0a`, tinta suave `#6b4f2e`, terracota `#b5401f`, mostarda `#c98a00`, verde `#2f7d32`, vermelho `#b3261e` e mostarda escura `#8a5c00` (só para texto, porque a mostarda tem contraste 2,9:1 sobre o quadro), além de tons claros derivados delas para fundos. Cor fora da paleta SHALL NOT ser usada em texto, e texto sobre mostarda `#c98a00` SHALL ser em tinta `#2b1a0a`.

#### Scenario: Botão principal
- **WHEN** a abertura é exibida
- **THEN** o botão "Jogar agora" tem fundo terracota `#b5401f` e texto claro

### Requirement: Contraste do texto
Todo texto do jogo SHALL ter contraste de pelo menos 4,5:1 com o fundo onde aparece.

#### Scenario: Texto suave sobre papel
- **WHEN** o texto em tinta suave `#6b4f2e` aparece sobre o papel `#f7ecd4`
- **THEN** o contraste medido é de pelo menos 4,5:1

#### Scenario: Selo de QUASE legível
- **WHEN** o selo "QUASE!" aparece sobre o quadro `#fffdf6`
- **THEN** o texto usa a mostarda escura `#8a5c00` e o contraste medido é de pelo menos 4,5:1

### Requirement: Estilo de traço
Cartões, botões, quadro de desenho e campos SHALL ter contorno de caneta em tinta com cantos irregulares e sombra chapada deslocada. O fundo SHALL ter manchas de aquarela e rabiscos que se desenham e somem, atrás de todo o conteúdo e sem receber cliques.

#### Scenario: Fundo não atrapalha
- **WHEN** o visitante toca num rabisco do fundo atrás de um botão
- **THEN** o toque vai para o botão

### Requirement: Transição entre telas
A troca de tela SHALL usar uma pincelada terracota que cobre e descobre a tela em até 1,2 s, e a tela nova SHALL estar visível ao fim da transição.

#### Scenario: Ir para o veredito
- **WHEN** a rodada passa de `julgando` para `resultado`
- **THEN** a tela de veredito está visível em até 1,2 s

### Requirement: Movimento reduzido
Com `prefers-reduced-motion: reduce`, a pincelada, os rabiscos do fundo, o confete e as animações repetitivas SHALL ser desligados, e o jogo SHALL continuar completo e jogável.

#### Scenario: Partida com movimento reduzido
- **WHEN** o sistema pede movimento reduzido e o visitante joga uma partida inteira
- **THEN** todas as telas aparecem sem pincelada nem confete e a partida termina no placar

### Requirement: Legibilidade e offline mantidos
O visual novo SHALL manter os requisitos da spec `interface-do-jogo`: fonte de pelo menos 24 px no texto do jogo, nenhuma rolagem a 1366×768 e a 1920×1080 em nenhuma tela, e nenhum recurso de fora (as fontes são as do sistema).

#### Scenario: Todas as telas a 1366×768
- **WHEN** cada tela (abertura, apelido, charada, desenho, veredito, placar) é aberta a 1366×768
- **THEN** nenhuma delas tem rolagem vertical ou horizontal
