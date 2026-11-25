# Spec Delta

## Purpose

Dar rosto ao Zé do Rabisco: um personagem desenhado, original, cujo humor animado mostra ao público o que o SLM está fazendo em cada momento do jogo.

## ADDED Requirements

### Requirement: Personagem original
O Zé SHALL ser um desenho vetorial próprio do projeto (chapéu de palha com faixa e remendo, cabelo espetado, sardas, camisa xadrez com suspensório, capim no canto da boca e lápis na orelha), embutido no build. O desenho SHALL NOT reproduzir personagem de terceiros.

#### Scenario: Zé no build offline
- **WHEN** o build é inspecionado
- **THEN** o desenho do Zé está dentro do build e nenhum recurso do personagem é carregado de fora

### Requirement: Humores do Zé
O Zé SHALL ter exatamente um humor por vez entre: `neutro`, `falando`, `pensando`, `torcendo`, `assustado`, `comemorando`, `coçando-a-cabeça`, `bravo` e `entediado`, cada um com expressão e animação próprias e distinguíveis (olhos, boca, sobrancelhas, braços e efeitos como balões de pensamento, estrelas, fumaça ou "zzz").

#### Scenario: Um humor por vez
- **WHEN** o humor muda de `torcendo` para `assustado`
- **THEN** o Zé mostra só a expressão de `assustado`

### Requirement: Quando cada humor aparece
O humor do Zé SHALL seguir o jogo: `pensando` enquanto o SLM gera a charada ou a resposta do Pergunte ao Zé; `falando` enquanto uma fala dele aparece na tela; `torcendo` durante o desenho; `assustado` quando faltam 5 s ou menos; no veredito, `comemorando` em ACERTOU, `coçando-a-cabeça` em QUASE ou ERROU e `bravo` quando a rodada termina sem nenhum traço; `neutro` nos demais casos. Ao terminar uma fala, o Zé SHALL voltar ao humor que tinha antes dela.

#### Scenario: Gerando a charada
- **WHEN** a etapa é `charada` e a charada ainda não está pronta
- **THEN** o Zé está `pensando` e a tela mostra só "Pensando…"

#### Scenario: Tempo acabando
- **WHEN** o cronômetro do desenho chega a 5 s
- **THEN** o Zé fica `assustado`

#### Scenario: Pronto sem desenhar
- **WHEN** o visitante aperta "Pronto" sem ter feito nenhum traço
- **THEN** o veredito é ERROU pela regra da spec `partida` e o Zé fica `bravo`

#### Scenario: Acerto
- **WHEN** o veredito da rodada é ACERTOU
- **THEN** o Zé fica `comemorando` depois de terminar a narração

### Requirement: Tédio sem interação
Fora da tela de desenho, se ninguém tocar, mover o mouse ou usar o teclado por 30 s, todo Zé visível SHALL ficar `entediado`; a primeira interação SHALL devolvê-lo ao humor anterior. Na tela de desenho o Zé SHALL NOT ficar entediado.

#### Scenario: Estande parado
- **WHEN** a abertura fica 30 s sem interação
- **THEN** o Zé da abertura fica `entediado`

#### Scenario: Visitante volta
- **WHEN** o Zé está `entediado` e alguém toca a tela
- **THEN** o Zé volta ao humor que tinha antes do tédio

### Requirement: Movimento reduzido
Com `prefers-reduced-motion: reduce`, o Zé SHALL continuar mostrando a expressão de cada humor (olhos, boca, sobrancelhas, braços), sem animações repetitivas.

#### Scenario: Sistema com movimento reduzido
- **WHEN** o sistema pede movimento reduzido e o Zé está `comemorando`
- **THEN** o Zé aparece com a expressão de comemoração e sem pular
