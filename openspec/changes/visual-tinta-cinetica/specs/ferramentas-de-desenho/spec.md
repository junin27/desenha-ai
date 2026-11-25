# Spec Delta

## Purpose

Permitir que o visitante corrija o desenho sem perder tudo, mantendo a imagem que a CNN vê e a sequência de traços que a LSTM lê sempre coerentes entre si.

## ADDED Requirements

### Requirement: Lápis, borracha e limpar
A tela de desenho SHALL ter três ferramentas: "Lápis" (selecionado no início de cada rodada), "Borracha" e "Limpar". A ferramenta selecionada SHALL ficar visualmente destacada.

#### Scenario: Começo da rodada
- **WHEN** a etapa `desenhando` começa
- **THEN** o "Lápis" está selecionado e destacado

### Requirement: Borracha apaga traços inteiros
Com a "Borracha", passar o ponteiro sobre o desenho SHALL remover por inteiro cada traço que passar a até 18 px (na escala do quadro) do ponteiro. A borracha SHALL NOT cortar um traço ao meio, para que a imagem e a sequência de traços enviadas às redes continuem sendo o mesmo desenho. Os traços restantes SHALL manter a ordem original.

#### Scenario: Apagar a porta da casa
- **WHEN** o desenho tem 4 traços (telhado, paredes, porta, janela) e a borracha passa só sobre a porta
- **THEN** sobram 3 traços, na ordem telhado, paredes, janela

#### Scenario: Borracha longe dos traços
- **WHEN** a borracha passa a 40 px de qualquer traço
- **THEN** nenhum traço é removido

### Requirement: Palpites depois de apagar
Depois que a borracha remove ao menos um traço, os palpites SHALL ser recalculados com os traços restantes, como depois de um traço novo. Se não sobrar nenhum traço, os palpites SHALL voltar ao estado vazio. A borracha SHALL NOT reiniciar nem pausar o cronômetro.

#### Scenario: Apagou o traço que confundia
- **WHEN** a borracha remove um traço e restam 3
- **THEN** as redes recebem os 3 traços restantes e os palpites mostrados mudam para o novo resultado

#### Scenario: Apagou tudo com a borracha
- **WHEN** a borracha remove o único traço
- **THEN** os palpites voltam ao estado vazio e o cronômetro continua correndo

### Requirement: Limpar continua igual
"Limpar" SHALL apagar todos os traços e reiniciar os palpites sem reiniciar o cronômetro, como na spec `interface-do-jogo`.

#### Scenario: Limpar no meio da rodada
- **WHEN** faltam 12 s e o visitante aperta "Limpar"
- **THEN** o quadro fica vazio, os palpites voltam ao estado vazio e o cronômetro segue de 12 s
