# Spec Delta

## Purpose

Permitir que o visitante desenhe com a mão no ar, pela webcam, reconhecendo três gestos (lápis, borracha e limpar), com troca livre entre os modos Mouse e Mão e sem depender de internet.

## ADDED Requirements

### Requirement: Modo de desenho
O jogo SHALL ter dois modos de desenho, "Mouse" (mouse, toque e caneta, como hoje) e "Mão" (webcam), escolhidos por um seletor visível na tela de apelido e na tela de desenho. O modo escolhido SHALL ficar salvo no navegador do estande e valer nas partidas seguintes. O modo inicial, sem escolha salva, SHALL ser "Mouse".

#### Scenario: Escolha antes da partida
- **WHEN** o visitante escolhe "Mão" na tela de apelido e começa a partida
- **THEN** a tela de desenho abre no modo Mão

#### Scenario: Escolha lembrada
- **WHEN** o modo Mão foi escolhido e a página é recarregada
- **THEN** o seletor mostra "Mão"

### Requirement: Troca de modo durante o desenho
Durante o desenho, trocar de modo SHALL valer na hora, sem apagar os traços já feitos, sem reiniciar nem pausar o cronômetro e sem mudar os palpites. Um traço em andamento SHALL terminar no momento da troca.

#### Scenario: Troca no meio da rodada
- **WHEN** faltam 12 s, há 2 traços e o visitante troca de Mouse para Mão
- **THEN** os 2 traços continuam no quadro, o cronômetro segue de 12 s e o próximo traço vem do dedo

### Requirement: Câmera só no modo Mão
A câmera SHALL ser ligada só quando o modo Mão estiver ativo na tela de desenho e SHALL ser desligada ao sair dela ou ao voltar para Mouse. A imagem da câmera SHALL NOT ser gravada nem enviada para fora do navegador.

#### Scenario: Fim do desenho
- **WHEN** a rodada sai da etapa `desenhando` no modo Mão
- **THEN** a câmera é desligada

### Requirement: Sem câmera, o jogo segue no Mouse
Se não houver câmera, se o acesso for negado ou se o modelo da mão não carregar, o jogo SHALL mostrar o aviso "Câmera indisponível: desenhe com o mouse" e voltar para o modo Mouse, sem travar a partida.

#### Scenario: Permissão negada
- **WHEN** o visitante escolhe "Mão" e o navegador nega o acesso à câmera
- **THEN** aparece o aviso, o seletor volta para "Mouse" e o desenho continua com o mouse

### Requirement: Gestos da mão
A cada quadro da câmera, a partir dos 21 pontos da primeira mão detectada, o gesto SHALL ser classificado como: `lapis` (só o indicador esticado), `borracha` (todos os dedos dobrados), `mao_aberta` (os cinco dedos esticados) ou `nenhum` (qualquer outra forma ou nenhuma mão). Um gesto SHALL valer só depois de aparecer em 3 quadros seguidos, para um quadro ruidoso não trocar a ferramenta.

#### Scenario: Indicador esticado
- **WHEN** os pontos mostram o indicador esticado e os outros dedos dobrados em 3 quadros seguidos
- **THEN** o gesto é `lapis`

#### Scenario: Quadro ruidoso
- **WHEN** o gesto é `lapis` e um único quadro é classificado como `mao_aberta`
- **THEN** o gesto continua `lapis`

### Requirement: Lápis pelo dedo
Com o gesto `lapis`, a ponta do indicador SHALL desenhar no quadro, com a imagem espelhada (mover o dedo para a direita desenha para a direita). O traço SHALL começar quando o gesto `lapis` passa a valer e SHALL terminar quando ele deixa de valer ou a mão some. Os traços SHALL ter o mesmo formato dos feitos com o mouse e seguir para as redes da mesma forma.

#### Scenario: Traço com o dedo
- **WHEN** o gesto `lapis` vale e a ponta do indicador anda da esquerda para a direita da câmera espelhada
- **THEN** um traço da esquerda para a direita aparece no quadro e as redes recebem o desenho com esse traço

#### Scenario: Levantar o lápis
- **WHEN** o visitante abre a mão no meio do traço
- **THEN** o traço termina e as redes reclassificam o desenho como depois de um traço terminado

### Requirement: Borracha pela mão fechada
Com o gesto `borracha`, a regra da spec `ferramentas-de-desenho` ("Borracha apaga traços inteiros") SHALL valer no ponto do centro da palma, com os palpites recalculados depois de cada traço removido.

#### Scenario: Mão fechada sobre um traço
- **WHEN** o gesto `borracha` vale e o centro da palma passa sobre um traço
- **THEN** esse traço inteiro sai do quadro

### Requirement: Limpar com a mão aberta parada
Com o gesto `mao_aberta` e o centro da palma movendo menos de 4% da largura do quadro, o jogo SHALL contar 3 s, mostrando um anel que se completa; ao completar, SHALL limpar o desenho como o botão "Limpar". Mexer a mão além do limite ou trocar de gesto SHALL zerar a contagem.

#### Scenario: Três segundos parada
- **WHEN** a mão aberta fica parada por 3 s
- **THEN** o quadro fica vazio, os palpites voltam ao estado vazio e o cronômetro segue

#### Scenario: Mão mexeu
- **WHEN** a mão aberta fica parada 2 s e depois anda 10% da largura do quadro
- **THEN** a contagem recomeça do zero e nada é apagado

### Requirement: Miniatura da câmera
No modo Mão, a tela de desenho SHALL mostrar a imagem da câmera espelhada numa miniatura, com os pontos da mão desenhados por cima e o nome do gesto atual ("LÁPIS", "BORRACHA", "MÃO ABERTA" ou "MOSTRE A MÃO"), sem cobrir o quadro, o cronômetro nem os palpites.

#### Scenario: Gesto na miniatura
- **WHEN** o gesto `borracha` vale
- **THEN** a miniatura mostra "BORRACHA"

### Requirement: Rastreamento offline e fluido
A biblioteca e o modelo da mão SHALL estar dentro do build, sem pedido para fora de `localhost`. No notebook do evento, o rastreamento SHALL processar ao menos 10 quadros por segundo durante o desenho, com as redes do jogo ligadas.

#### Scenario: Build offline com o modelo da mão
- **WHEN** o build é inspecionado
- **THEN** o modelo da mão e os arquivos wasm estão dentro dele e nenhum é carregado de fora
