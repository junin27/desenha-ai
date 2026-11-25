# Spec Delta

## Purpose

Atrair quem passa pelo estande e explicar o jogo antes da partida, com uma demonstração rodando sozinha, e levar à tela de apelido, onde também fica o Pergunte ao Zé.

## ADDED Requirements

### Requirement: Abertura antes da partida
Ao carregar o jogo, a primeira tela SHALL ser a abertura, com o título do jogo, uma frase explicando que duas redes neurais adivinham o desenho enquanto ele é feito e que o Zé julga sem internet, os três passos do jogo (charada, desenho em 20 s, redes adivinham) e o botão "Jogar agora". A abertura SHALL NOT pedir apelido.

#### Scenario: Jogo recém-aberto
- **WHEN** o jogo termina de carregar
- **THEN** a tela visível é a abertura, com o botão "Jogar agora" e sem campo de apelido

#### Scenario: Jogar agora
- **WHEN** o visitante aperta "Jogar agora"
- **THEN** a tela de apelido aparece em até 1,2 s (incluindo a transição)

### Requirement: Números reais na abertura
A abertura SHALL mostrar a acurácia de teste do ensemble lida das métricas carregadas pelo jogo (formatada com uma casa decimal e vírgula), o número de categorias e a duração do desenho em segundos. Se as métricas não estiverem disponíveis, o número da acurácia SHALL ser omitido, sem mostrar valor inventado.

#### Scenario: Métricas carregadas
- **WHEN** as métricas informam acurácia de teste do ensemble 0,947
- **THEN** a abertura mostra "94,7" ao lado de "% de acerto", "30" categorias e "20" segundos

#### Scenario: Métricas ausentes
- **WHEN** o arquivo de métricas não existe
- **THEN** a abertura mostra as categorias e os segundos e não mostra percentual de acerto

### Requirement: Demonstração em loop
Enquanto a abertura estiver visível, uma demonstração SHALL repetir em loop um desenho pré-gravado sendo traçado traço a traço, com 3 palpites em barras que mudam a cada traço até o palpite certo liderar. A demonstração SHALL ser só ilustrativa (sem chamar as redes) e SHALL parar quando a abertura deixar de estar visível.

#### Scenario: Demonstração rodando
- **WHEN** a abertura fica visível por 6 s
- **THEN** pelo menos 2 traços da demonstração foram desenhados e as barras de palpite mudaram ao menos uma vez

#### Scenario: Demonstração para fora da abertura
- **WHEN** o visitante vai para a tela de apelido
- **THEN** a demonstração deixa de desenhar novos traços

### Requirement: Apelido e Pergunte ao Zé na mesma tela
A tela de apelido SHALL ter o campo de apelido, sugestões de apelido que preenchem o campo ao serem tocadas, o botão "Começar partida" (desabilitado enquanto o nome não for válido pela spec `pontuacao-e-placar`), o botão "Ver placar" e, ao lado, a conversa do Pergunte ao Zé com perguntas prontas e campo livre, com o mesmo comportamento da spec `pergunte-ao-ze`.

#### Scenario: Sugestão de apelido
- **WHEN** o visitante toca na sugestão "Peão Veloz"
- **THEN** o campo passa a conter "Peão Veloz" e "Começar partida" fica habilitado

#### Scenario: Nome inválido
- **WHEN** o campo de apelido está vazio
- **THEN** "Começar partida" fica desabilitado

#### Scenario: Pergunta sem sair da tela
- **WHEN** o visitante toca na pergunta pronta "Como as redes adivinham?"
- **THEN** a pergunta e a resposta do Zé aparecem na conversa e a tela de apelido continua visível
