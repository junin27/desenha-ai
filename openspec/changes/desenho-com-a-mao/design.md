# Design

## Context

- A captura atual (`presentation/captura-do-desenho.ts`) recebe Pointer Events, guarda os traços e entrega **o desenho inteiro** a cada mudança; a `TelaDesenho` manda isso para `Partida.registrarTraco` ou chama `limparDesenho`. A borracha por traço (`domain/desenho/borracha.ts`) já existe. Logo, o modo Mão só precisa produzir os mesmos eventos de "começar, continuar, terminar traço" e "apagar aqui" a partir da câmera.
- O jogo roda offline em CPU, junto com as duas redes ONNX e o Zé (llama.cpp). A arquitetura é hexagonal e um teste reprova import proibido.
- A webcam do notebook do evento existe (confirmado pelo usuário). O navegador do evento é o Edge ou o Chrome em tela cheia, em `localhost`, que é um contexto seguro (a câmera é permitida).

## Goals / Non-Goals

**Goals:**
- Regras dos gestos puras e testadas sem câmera (pontos sintéticos).
- O mesmo caminho de traço para mouse e mão, para a CNN e a LSTM não perceberem diferença.
- Cair para o Mouse sem travar quando a câmera faltar.

**Non-Goals:**
- Precisão de caneta: o traço do dedo é suavizado e mais "rabiscado", e isso é aceitável para o jogo.
- Treinar classificador de gestos: os gestos saem de regras geométricas sobre os pontos.

## Decisions

### D1. MediaPipe Hand Landmarker (`@mediapipe/tasks-vision`) em modo vídeo, na CPU
Detecta 21 pontos por mão em tempo real no navegador, com wasm e modelo `float16` de ~7,8 MB. Configurado com `numHands: 1`, `runningMode: "VIDEO"` e `delegate: "CPU"` (o notebook não tem GPU dedicada; o WebGL pode competir com o `onnxruntime-web`). Os arquivos wasm e o `.task` vão para `app/public/mao/` por um passo de cópia, e o adaptador os carrega por caminho local.
- *Alternativa descartada:* TensorFlow.js handpose. Mais pesado, menos mantido e com pior desempenho em CPU.
- *Alternativa descartada:* treinar um detector de mão próprio. Fora do prazo e sem ganho para o jogo.

### D2. Porta `DetectorDeMao` e adaptador
`application/portas.ts` ganha `DetectorDeMao { detectar(quadro, instanteMs): PontosDaMao | undefined }`, com `PontosDaMao` no domínio (21 pontos normalizados 0–1). O adaptador `infrastructure/mao/detector-mediapipe.ts` implementa a porta; os testes usam `DetectorFalso` com pontos prontos. A câmera (getUserMedia) é um adaptador `CameraDoNavegador` atrás da porta `CameraDoEstande` (ligar, desligar, quadro atual), para a apresentação não falar com a API do navegador diretamente.

### D3. Gestos por regras geométricas puras (`domain/mao/gestos.ts`)
Um dedo está **esticado** quando a ponta está mais longe do punho (ponto 0) que a articulação do meio (PIP) do mesmo dedo, com folga de 10%; o polegar usa a distância da ponta ao indicador. `lapis` = só o indicador esticado (o polegar é ignorado, porque muita gente aponta com ele solto); `borracha` = nenhum dedo esticado; `mao_aberta` = os cinco esticados; resto = `nenhum`. Um filtro de estabilidade (`EstabilizadorDeGesto`) só troca o gesto depois de 3 quadros iguais. Tudo puro e testado com pontos sintéticos.

### D4. Ponto de desenho: ponta do indicador, espelhada e suavizada
Ponto 8 (ponta do indicador) com o X espelhado (`1 − x`), convertido para as coordenadas internas do quadro (560 × 560) pela área central da câmera que corresponde ao quadro (margem de 15% em cada borda, para o dedo alcançar os cantos sem sair do vídeo). Suavização exponencial (α = 0,5) contra tremor. Borracha e mão aberta usam o centro da palma (média dos pontos 0, 5, 9, 13 e 17).

### D5. Fonte de entrada única para a captura
A `CapturaDoDesenho` ganha uma interface interna de "fonte" (`comecarTraco`, `continuarTraco`, `terminarTraco`, `apagarEm`), usada pelos Pointer Events (como hoje) e pelo novo `ControleDaMao` em `presentation/`, que a cada quadro transforma (gesto estável, ponto) em chamadas dessa interface. Trocar de modo termina o traço em andamento e liga ou desliga a fonte; os traços já feitos ficam.

### D6. Contagem do "limpar tudo" pura
`domain/mao/limpeza.ts`: uma função de estado recebe (gesto, ponto da palma, instante) e devolve a fração da contagem (0 a 1) e se disparou. Zera ao mudar de gesto ou ao andar mais de 4% da largura. O anel na miniatura e no lápis mostra a fração.

### D7. Lápis desenhado em SVG, sobre o quadro
Um SVG próprio (gradientes para dar volume: amarelo `#f2c14e`→`#d99a1e` nas faces, madeira, grafite, anel prateado e borracha rosa) posicionado por `transform` com a ponta no ponto do traço; `cursor: none` só no quadro. Para a borracha, o mesmo lápis rotacionado 180° com o círculo do raio. A imagem enviada pelo usuário serviu só de referência de estilo: tem marca d'água de banco de imagens e não entra no projeto.

### D8. Desempenho
O laço da câmera usa `requestVideoFrameCallback` (ou `requestAnimationFrame`), pula quadro se a detecção anterior não terminou e limita a ~20 detecções por segundo. Os palpites das redes continuam limitados pela `FilaDePalpites` atual. Meta da spec: ≥ 10 quadros por segundo no notebook do evento; medir no ensaio de 29/11 e baixar o limite se o Zé ficar lento.

### D9. Cor e pintura em camadas separadas dos traços
Cada traço guarda junto (só na apresentação) a cor e a espessura com que começou; o domínio e as redes continuam recebendo só os pontos. O quadro vira três canvas empilhados: **pintura** (o que o balde pinta, embaixo), **traços** (redesenhados a partir da lista, então a borracha por traço continua exata) e **partículas** (em cima, sem cliques). O balde faz um preenchimento por inundação (pilha de pixels, tolerância para a borda suavizada) sobre a imagem visível (pintura + traços) e grava o resultado só na camada de pintura; o conta-gotas lê a cor da imagem visível. Função pura `preencherArea(pixels, largura, altura, x, y, cor)` testada com imagens pequenas.
- *Alternativa descartada:* pintar o balde na mesma camada dos traços. A borracha por traço precisaria apagar pixels, e a imagem deixaria de ser reconstruível a partir dos traços.

### D10. Lápis, partículas e som (protótipo 13)
O lápis é um SVG próprio montado em código (o comprimento do corpo e da borracha muda com o desgaste); a âncora do SVG é o ponto de contato, então o lápis e a borracha caem exatamente no ponto. As partículas rodam num laço de `requestAnimationFrame` com passo em tempo real (`dt`), assentam e travam no fundo (sem tremer) e desbotam; limite de 600. O som usa Web Audio: ruído branco num filtro passa-banda (agudo para o lápis, grave para a borracha) com volume pela velocidade, e um oscilador curto para o toque e o balde. Nada de arquivo de áudio. A física das partículas e o desgaste são funções puras testadas; o desenho no canvas e o áudio são conferidos no navegador.

## Risks / Trade-offs

- [CPU disputada entre rastreamento, redes e Zé] → limite de detecções, `numHands: 1`, câmera só no desenho; medir no ensaio; se ficar pesado, baixar a resolução da câmera para 320 × 240.
- [Iluminação ruim no estande] → a miniatura mostra se a mão está sendo vista ("MOSTRE A MÃO"); o modo Mouse continua disponível a qualquer momento.
- [Prazo: evento em 30/11] → as tarefas deixam o modo Mouse intacto o tempo todo; o modo Mão só aparece no seletor quando estiver completo.
- [Teste de build offline] → a biblioteca contém endereços de documentação em texto; entram na lista fechada de textos de terceiros, conferidos um a um.
- [Partículas e som pesam junto com as redes] → limite de 600 partículas, nada quando o movimento é reduzido, som opcional; medir no ensaio.
- [A câmera pede permissão no navegador] → no ensaio de 29/11, liberar a câmera para `localhost` no navegador do evento (anotar no checklist da demo).
