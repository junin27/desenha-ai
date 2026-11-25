# Spec Delta

## Purpose

Ilustrar quem está desenhando com um lápis de cor que acompanha o ponteiro ou o dedo dentro do quadro, se gasta com o uso, solta partículas e faz som, só ali.

## ADDED Requirements

### Requirement: Lápis no lugar do cursor
Dentro do quadro de desenho, o cursor do sistema SHALL ser trocado por um lápis desenhado (corpo sextavado na cor atual, ponta de madeira com grafite, anel prateado e borracha rosa), inclinado, com a ponta do grafite exatamente no ponto onde o traço é feito. Fora do quadro, o cursor SHALL ser o normal. O lápis SHALL ser um desenho próprio do projeto, embutido no build.

#### Scenario: Ponta no traço
- **WHEN** o visitante desenha com o mouse no ponto (200, 300) do quadro
- **THEN** a ponta do grafite do lápis está em (200, 300) e o traço sai dali

#### Scenario: Fora do quadro
- **WHEN** o ponteiro sai do quadro
- **THEN** o lápis some e o cursor normal volta

### Requirement: Lápis mostra a ferramenta
Com a Borracha, o lápis SHALL aparecer virado, com a ponta da borracha exatamente no ponto e um círculo com o raio da borracha; com o Balde e o Conta-gotas, o desenho dessas ferramentas, na cor atual, com a ponta no ponto.

#### Scenario: Borracha escolhida
- **WHEN** a ferramenta borracha é escolhida e o ponteiro está em (300, 330)
- **THEN** a ponta da borracha rosa está em (300, 330), dentro do círculo do raio da borracha

### Requirement: Lápis segue o dedo no modo Mão
No modo Mão, o lápis SHALL acompanhar a ponta do indicador (gesto `lapis`) ou o centro da palma (gestos `borracha` e `mao_aberta`), e SHALL sumir quando nenhuma mão é detectada.

#### Scenario: Mão some
- **WHEN** a mão sai da frente da câmera
- **THEN** o lápis some do quadro

### Requirement: Desgaste do lápis e da borracha
Enquanto desenha, o corpo do lápis SHALL encurtar e a ponta do grafite ficar rombuda, proporcionalmente à distância percorrida; enquanto apaga, a borracha SHALL encolher. Os dois SHALL parar num tamanho mínimo e continuar funcionando. Nenhuma porcentagem de desgaste SHALL aparecer na tela. A cada rodada e no "Limpar", o lápis SHALL voltar inteiro.

#### Scenario: Lápis gasto continua desenhando
- **WHEN** o lápis já está no tamanho mínimo e o visitante faz outro traço
- **THEN** o traço é desenhado e o lápis continua no tamanho mínimo

#### Scenario: Lápis novo
- **WHEN** o visitante aperta "Limpar"
- **THEN** o lápis e a borracha voltam ao tamanho inteiro

### Requirement: Partículas do traço
Ao desenhar, SHALL cair pó, lascas e faíscas na cor do traço; ao apagar, farelos e "minhoquinhas" nos tons da borracha. As partículas SHALL cair com gravidade, quicar no fundo do quadro, assentar paradas e desbotar sem piscar, ficar atrás do lápis e não receber cliques. SHALL haver no máximo 600 partículas ao mesmo tempo; acima disso, as mais antigas desbotam mais depressa.

#### Scenario: Pó na cor do traço
- **WHEN** o visitante desenha em vermelho `#b3261e`
- **THEN** as partículas que saem do traço são em tons de vermelho

#### Scenario: Partícula assentada não pisca
- **WHEN** uma partícula assentou no fundo do quadro
- **THEN** a posição dela não muda até sumir e a opacidade só diminui

### Requirement: Som do desenho
O jogo SHALL gerar, sem arquivo de áudio, um "toque" ao encostar no quadro, um som de arranhado para o lápis e de esfregado para a borracha, com volume proporcional à velocidade do traço e silêncio quando o traço para. Um botão SHALL ligar e desligar esse som, lembrado no navegador do estande.

#### Scenario: Traço parado
- **WHEN** o visitante para de mover o ponteiro sem soltar
- **THEN** o som do traço silencia

#### Scenario: Som desligado
- **WHEN** o som está desligado e o visitante desenha
- **THEN** nenhum som do desenho é tocado

### Requirement: Movimento reduzido
Com `prefers-reduced-motion: reduce`, as partículas e o balanço do lápis SHALL ser desligados; o lápis continua acompanhando o ponteiro.

#### Scenario: Desenho com movimento reduzido
- **WHEN** o sistema pede movimento reduzido e o visitante desenha
- **THEN** nenhuma partícula aparece e o lápis segue a ponta do traço
