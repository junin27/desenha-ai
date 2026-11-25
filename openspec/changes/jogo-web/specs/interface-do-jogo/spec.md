# Spec Delta

## Purpose

Apresentar o jogo no estande de forma legível e direta para o público, com captura de desenho por mouse, toque ou caneta, funcionando inteiramente offline.

## ADDED Requirements

### Requirement: Telas da partida
O jogo SHALL ter uma tela para cada etapa da spec `partida`: início (apelido, placar e botão Jogar), charada (com "Pensando…" enquanto o Zé gera), desenho (canvas, cronômetro, charada e os 3 primeiros palpites ao vivo), veredito (narração, veredito e pontos) e fim (total e posição no placar).

#### Scenario: Etapa e tela coincidem
- **WHEN** a partida muda de etapa
- **THEN** a tela correspondente é exibida em até 100 ms

### Requirement: Charada sem vazamento durante a geração
Enquanto o Zé gera a charada, a tela SHALL mostrar só "Pensando…", sem o raciocínio nem a resposta parciais, porque o raciocínio costuma citar a palavra secreta e a resposta ainda não passou pelo filtro de vazamento. A charada SHALL aparecer só depois de validada (do Zé ou de reserva).

#### Scenario: Pensamento cita a palavra
- **WHEN** a fala parcial do Zé na etapa charada é "<pensamento>A palavra é melancia"
- **THEN** a tela mostra "Pensando…" e o texto "melancia" não aparece

### Requirement: Captura do desenho
O canvas SHALL aceitar mouse, toque e caneta (Pointer Events), registrar cada traço como a sequência de pontos (x, y) e ter um botão "Limpar" que apaga o desenho e reinicia os palpites sem reiniciar o cronômetro.

#### Scenario: Desenho por toque
- **WHEN** o visitante desenha com o dedo numa tela sensível ao toque
- **THEN** os traços são capturados como com o mouse, sem rolar a página

### Requirement: Legibilidade no estande
Charada, palpites, cronômetro e narração SHALL usar fonte de no mínimo 24 px, e a interface SHALL caber sem rolagem em 1366×768 e em 1920×1080.

#### Scenario: Notebook do estande
- **WHEN** o jogo é aberto em tela cheia a 1366×768
- **THEN** a tela de desenho mostra canvas, cronômetro, charada e palpites sem rolagem

### Requirement: Funcionamento offline
O build do jogo SHALL conter todos os recursos (scripts, estilos, fontes, modelos e runtime), sem CDN e sem fontes externas. Nenhum recurso SHALL ser carregado de fora de `localhost`/`127.0.0.1` e o código do próprio jogo SHALL NOT conter endereços externos. Endereços que aparecem só como texto dentro de bibliotecas de terceiros (links de documentação, mensagens de erro) SHALL estar numa lista fechada conferida pelo teste, que reprova qualquer endereço novo.

#### Scenario: Build sem endereços externos
- **WHEN** o build é inspecionado
- **THEN** nenhum `src`, `href`, `url()` ou `import` aponta para fora de `localhost`/`127.0.0.1`, e os únicos endereços externos são os da lista fechada de textos de terceiros

#### Scenario: Endereço externo novo
- **WHEN** uma dependência atualizada ou o código do jogo passa a conter um endereço externo fora da lista
- **THEN** a verificação do build falha mostrando o endereço e o arquivo
