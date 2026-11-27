# Spec Delta

## Purpose

Contar, na primeira tela do jogo, como o "Desenha Aí, Sô!" funciona por dentro — redes neurais, SLM, destilação, QLoRA, quantização e engenharia — numa história em capítulos com as redes reais rodando, e levar o visitante à tela de apelido.

## ADDED Requirements

### Requirement: Vitrine como primeira tela
Ao carregar o jogo, a primeira tela SHALL ser a vitrine, que começa no capítulo de abertura (título "Desenha aí, sô!"). A vitrine SHALL ter 11 capítulos nesta ordem: abertura, o jogo, o desenho, a CNN, a LSTM, o Zé (SLM), destilação, QLoRA, quantização GGUF, engenharia e o convite "Sua vez, sô!".

#### Scenario: Jogo recém-aberto
- **WHEN** o jogo termina de carregar
- **THEN** a tela visível é a vitrine, no capítulo de abertura, e não há campo de apelido visível

#### Scenario: Ordem dos capítulos
- **WHEN** a história é percorrida do início ao fim sem voltar
- **THEN** os capítulos aparecem na ordem abertura, o jogo, o desenho, a CNN, a LSTM, o Zé (SLM), destilação, QLoRA, quantização GGUF, engenharia, convite

### Requirement: Sem rolagem e legível
A vitrine SHALL caber em 1366×768 e em 1920×1080 sem barra de rolagem e sem conteúdo fora da tela, e todo texto visível SHALL ter no mínimo 24 px. A página SHALL NOT rolar quando o visitante usa a roda do mouse.

#### Scenario: Telas do estande
- **WHEN** a vitrine é exibida em 1366×768 e em 1920×1080, em cada um dos 11 capítulos
- **THEN** a largura e a altura do documento são iguais às da janela e nenhum texto visível tem menos de 24 px

#### Scenario: Rodinha não rola a página
- **WHEN** o visitante gira a roda do mouse para baixo sobre a vitrine
- **THEN** a posição de rolagem da página continua 0

### Requirement: Avançar e voltar a história
Seta para baixo, PageDown, Espaço e arrastar o dedo para cima SHALL levar a história até a parada do capítulo seguinte, tocando a passagem inteira sem pular quadros; Seta para cima, PageUp e arrastar para baixo SHALL voltar à parada do capítulo anterior. Cada capítulo tem uma parada, logo antes do seu portal. Voltar SHALL restaurar o estado anterior das cenas, sem cena sobreposta nem deslocada.

#### Scenario: Avançar com a tecla
- **WHEN** a vitrine está parada no capítulo de abertura e o visitante aperta Seta para baixo uma vez
- **THEN** a história anda até a parada do capítulo do jogo e para ali

#### Scenario: Voltar por um portal
- **WHEN** a história está no capítulo do desenho e o visitante volta até o capítulo do jogo
- **THEN** só a cena do jogo fica visível, sem transformação nem recorte aplicado a ela

### Requirement: Rodinha acompanha a transição
A roda do mouse SHALL mover a história na medida do giro: girar para cima avança 0,5 s de história a cada 100 px de rolagem, girar para baixo volta na mesma medida, e parar de girar para a história onde ela está, mesmo no meio de um portal. O trecho de um capítulo sem animação, entre o fim das entradas (3 s depois do início do capítulo) e a parada dele, SHALL ser atravessado sem precisar girar por ele. A história SHALL NOT voltar antes da parada da abertura nem passar do fim.

#### Scenario: Meio giro para no meio do portal
- **WHEN** a vitrine está na parada da abertura e o visitante gira a roda 100 px para cima e para
- **THEN** a história fica parada 0,5 s depois da parada da abertura, no meio do portal do "ô"

#### Scenario: Trecho parado é atravessado
- **WHEN** a vitrine está na parada do jogo e o visitante gira a roda 100 px para baixo
- **THEN** a história volta até 3 s depois do início do capítulo do jogo

#### Scenario: Rodinha na abertura
- **WHEN** a vitrine está parada no capítulo de abertura e o visitante gira a roda para baixo
- **THEN** a vitrine continua na abertura com o título inteiro, sem voltar ao quadro vazio do início

### Requirement: História só anda com o visitante
A vitrine SHALL NOT avançar de capítulo sozinha: parada num capítulo, ela fica ali até o visitante fazer um gesto. As animações de entrada do capítulo atual tocam até a parada dele.

#### Scenario: Visitante parado
- **WHEN** ninguém interage com a vitrine por 30 s depois de ela carregar
- **THEN** a vitrine continua no capítulo de abertura

### Requirement: Transição por portal
O capítulo seguinte SHALL estar escondido num objeto do capítulo atual: parado, o objeto aparece como sempre e nada do capítulo seguinte é visível. No gesto, a câmera mergulha no próprio objeto até a cor dele cobrir a tela, sem recorte nem imagem nova por cima; só então, a partir de 85% do zoom, o capítulo seguinte surge em tela cheia a partir dessa cor, até ocupar a tela inteira.

#### Scenario: Objetos dos portais
- **WHEN** a história passa pelos portais de mergulho, em ordem
- **THEN** os objetos são o buraco do "ô", a janela da casa, a folha do desenho, a grade de pixels, a resposta da LSTM, a cabeça do Zé, o jarro e um peso

#### Scenario: Escondido enquanto parado
- **WHEN** a vitrine está parada no capítulo do jogo, antes de qualquer gesto
- **THEN** o capítulo do desenho não está visível, e a janela da casa aparece como sempre

#### Scenario: Surge de dentro do objeto
- **WHEN** a câmera termina o zoom na janela da casa
- **THEN** o capítulo do desenho está totalmente visível, sem a cor da janela por cima

#### Scenario: Começa na cor do objeto
- **WHEN** a câmera percorreu até 85% do zoom na janela da casa
- **THEN** só a cena do jogo está visível, ampliada na janela, e nada do capítulo do desenho aparece

#### Scenario: Fim do portal
- **WHEN** termina a passagem para qualquer capítulo
- **THEN** o novo capítulo ocupa a tela inteira, sem recorte, sem transformação e sem borda do capítulo anterior visível

### Requirement: Transição por afastamento
As passagens da quantização para a engenharia e da engenharia para o convite SHALL fazer o caminho inverso: o capítulo atual encolhe até caber dentro de um objeto do seguinte (o hexágono do Zé na engenharia e a janela da casa no convite).

#### Scenario: GGUF dentro do hexágono
- **WHEN** termina a passagem da quantização para a engenharia
- **THEN** a cena da quantização deixou de estar visível depois de encolher até o tamanho do hexágono "Zé · llama.cpp"

### Requirement: Desenho real do dataset
Os capítulos do desenho, da CNN e da LSTM SHALL usar o mesmo desenho real do conjunto de teste do Quick, Draw!, escolhido entre os desenhos da vitrine, traçado ponto a ponto na ordem original. A cada volta da história SHALL ser escolhido outro desenho, sem repetir o anterior.

#### Scenario: Mesmo desenho nos três capítulos
- **WHEN** a história passa pelos capítulos do desenho, da CNN e da LSTM
- **THEN** a categoria do desenho é a mesma nos três

#### Scenario: Outro desenho na volta seguinte
- **WHEN** a vitrine recomeça depois de mostrar um desenho de "sol"
- **THEN** o desenho da nova volta é de outro arquivo da lista de desenhos da vitrine

### Requirement: Palpites reais das redes
Os palpites mostrados nos capítulos da CNN e da LSTM SHALL vir das redes do jogo aplicadas ao traço parcial já desenhado, atualizados a cada 25% dos pontos, com as 3 categorias de maior probabilidade. Se as redes não carregarem, esses capítulos SHALL mostrar o desenho sem palpites e sem números inventados.

#### Scenario: Palpite com o desenho completo
- **WHEN** o desenho da vitrine está 100% traçado
- **THEN** os 3 palpites da CNN são os mesmos 3 do top-3 que a CNN do jogo devolve para esse desenho

#### Scenario: Redes indisponíveis
- **WHEN** os arquivos das redes não carregam
- **THEN** os capítulos da CNN e da LSTM não mostram nenhum percentual

### Requirement: Grade 28×28 é a entrada da CNN
O capítulo da CNN SHALL mostrar o desenho como a imagem de 28×28 que a CNN recebe, produzida pelo mesmo pré-processamento do jogo (spec `pre-processamento-de-desenho`).

#### Scenario: Mesma entrada
- **WHEN** a grade do capítulo da CNN é exibida para um desenho da vitrine
- **THEN** cada um dos 784 valores exibidos difere em no máximo 1e-6 da entrada que a CNN recebe para esse desenho

### Requirement: Números lidos das métricas
Todo número técnico da vitrine SHALL vir dos arquivos de métricas carregados pelo jogo: acurácia e top-3 da CNN e da LSTM, acurácia do ensemble, acerto com 50% do desenho, exemplos aprovados do dataset do Zé, rank e percentual treinável do LoRA, tamanho do GGUF e contagens de testes. Valor ausente SHALL ser omitido, nunca inventado.

#### Scenario: Métricas das redes
- **WHEN** as métricas informam acurácia de teste da CNN 0,9241 e do ensemble 0,9470
- **THEN** a vitrine mostra "92,4%" no capítulo da CNN e "94,7%" no da LSTM

#### Scenario: Métrica ausente
- **WHEN** o arquivo de métricas do Zé não tem o número de exemplos aprovados
- **THEN** o capítulo da destilação não mostra contador de exemplos

### Requirement: Convite leva à tela de apelido
O capítulo do convite SHALL mostrar "Sua vez, sô!" e o botão "Jogar!". Apertar "Jogar!", ou "Jogar agora" (visível em todos os capítulos), SHALL abrir a tela de apelido por um portal a partir do botão, em até 2,2 s, com o foco no campo de apelido.

#### Scenario: Jogar pelo convite
- **WHEN** o visitante aperta "Jogar!" no convite
- **THEN** em até 2,2 s a tela de apelido está visível e o foco está no campo de apelido

#### Scenario: Pular a história
- **WHEN** o visitante aperta "Jogar agora" no capítulo da CNN
- **THEN** em até 2,2 s a tela de apelido está visível

### Requirement: Volta da tela de apelido
A tela de apelido aberta pela vitrine SHALL ter "Voltar à história", que desfaz o portal e volta ao capítulo de onde o visitante saiu.

#### Scenario: Voltar ao convite
- **WHEN** o visitante abriu o apelido pelo convite e aperta "Voltar à história"
- **THEN** o capítulo do convite fica visível de novo, sem transformação nem recorte

### Requirement: Movimento reduzido
Com a preferência do sistema "reduzir movimento", a vitrine SHALL trocar de capítulo sem portal nem zoom (corte direto), e SHALL NOT tocar o vídeo de fundo.

#### Scenario: Reduzir movimento ligado
- **WHEN** a preferência "reduzir movimento" está ativa e o visitante avança um capítulo
- **THEN** o capítulo seguinte aparece sem nenhuma escala aplicada às cenas e o vídeo de fundo está pausado

### Requirement: Crédito dos desenhos do dataset
Enquanto um desenho do Quick, Draw! estiver visível na vitrine, ela SHALL mostrar o crédito "Quick, Draw! · CC BY 4.0".

#### Scenario: Crédito no capítulo do desenho
- **WHEN** o capítulo do desenho está visível
- **THEN** há um texto visível com "Quick, Draw!" e "CC BY 4.0"

### Requirement: Volta do placar para a vitrine
Ao apertar "Início" no placar depois de uma partida, o jogo SHALL mostrar a vitrine no capítulo de abertura.

#### Scenario: Início depois da partida
- **WHEN** a partida termina e o visitante aperta "Início" no placar
- **THEN** a vitrine está visível no capítulo de abertura

### Requirement: Degradação em notebook lento
Se a média de quadros por segundo da vitrine ficar abaixo de 30 por 3 s seguidos, ela SHALL trocar de capítulo por corte direto e pausar o vídeo de fundo até o jogo ser recarregado.

#### Scenario: Taxa baixa
- **WHEN** a taxa medida fica em 22 quadros por segundo durante 3 s
- **THEN** a passagem seguinte de capítulo é um corte direto, sem escala aplicada às cenas, e o vídeo de fundo está pausado

#### Scenario: Carregamento lento não conta
- **WHEN** a vitrine roda a 10 quadros por segundo nos 2 s depois de a animação ficar pronta e a 60 depois disso
- **THEN** ela continua no modo normal, com portais e animações

### Requirement: Tudo carregado do próprio build
A biblioteca de animação, as fontes, o vídeo de fundo, os desenhos e as métricas da vitrine SHALL vir do próprio build, sem nenhum carregamento de endereço externo.

#### Scenario: Build sem endereço externo
- **WHEN** o teste de distribuição varre o build
- **THEN** nenhum arquivo carrega algo de fora de localhost e as únicas citações externas são as da lista de textos de terceiros permitidos

### Requirement: Vitrine parada fora da tela
Quando a vitrine deixar de estar visível (tela de apelido ou partida), ela SHALL parar animações, vídeo e chamadas às redes, e SHALL NOT disparar novas classificações até voltar a ser exibida.

#### Scenario: Partida em andamento
- **WHEN** o visitante está na tela de desenho da partida
- **THEN** o vídeo da vitrine está pausado e a vitrine não chamou as redes desde que saiu da tela
