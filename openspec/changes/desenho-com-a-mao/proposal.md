# Proposal

## Why

Hoje o visitante desenha só com mouse ou toque. O usuário pediu (25/11/2026) um modo de **desenhar com a mão no ar**, pela webcam, com gestos: é mais atraente no estande e acrescenta ao projeto mais uma rede neural rodando offline no navegador (visão computacional: rastreamento dos pontos da mão). Pediu também um **lápis amarelo** que acompanha o traço dentro do quadro, para ilustrar quem está desenhando.

Disciplina: **Redes Neurais** (uma rede de visão computacional, o MediaPipe Hand Landmarker, transforma a imagem da câmera nos 21 pontos da mão; o desenho resultante segue para a CNN e a LSTM do jogo).

## What Changes

- **Modo de desenho Mouse ou Mão**, escolhido antes da partida (tela de apelido) e trocado a qualquer momento durante o desenho, sem perder os traços nem pausar o cronômetro. A escolha fica salva no navegador do estande.
- **Gestos no modo Mão**, reconhecidos a partir dos pontos da mão:
  - só o **indicador** esticado: **lápis** (a ponta do dedo desenha);
  - **mão fechada**: **borracha** (apaga os traços por onde a mão passa, a mesma borracha por traço de hoje);
  - **mão aberta parada por 3 s**: **limpar tudo**, com um anel mostrando a contagem.
- **Miniatura espelhada da câmera** no canto do desenho, com os pontos da mão por cima e o nome do gesto atual.
- **Lápis de cor desenhado** que substitui o cursor dentro do quadro (no mouse e na mão), na cor atual; vira para mostrar a borracha; **gasta** com o uso (encurta, a ponta fica rombuda, a borracha encolhe) e volta inteiro a cada rodada; solta **partículas** na cor do traço (farelo rosa na borracha) que caem, quicam e assentam; faz **som** gerado na hora (toque, arranhado, esfregado), com botão para desligar. Pedido de 25/11, conferido no protótipo 13.
- **Painel de desenho** no estilo de jogo de desenho on-line: Lápis, Borracha, **Balde** e **Conta-gotas**, três espessuras e 16 cores. A cor e o balde são só visuais: as redes continuam recebendo apenas a sequência de pontos dos traços.
- Tudo **offline**: biblioteca e modelo dentro do build; a imagem da câmera nunca sai do navegador nem é gravada.

### Fora do escopo

- Desenhar com as duas mãos ou com mais de uma pessoa ao mesmo tempo (só a primeira mão detectada vale).
- Gestos fora das telas de desenho (navegar menus pela mão); os botões seguem no mouse ou toque.
- Treinar ou ajustar o modelo de mão: usamos o modelo pronto do MediaPipe.
- Mudanças nas redes do jogo (CNN, LSTM), no pré-processamento, no Zé, no placar ou nas regras.
- Usar a imagem de lápis enviada como referência (tem marca d'água de banco de imagens): o lápis é um desenho próprio.

## Capabilities

### New Capabilities
- `desenho-com-a-mao`: modo Mão pela webcam — câmera, pontos da mão, gestos (lápis, borracha, limpar), miniatura, troca de modo e o que acontece sem câmera.
- `lapis-no-quadro`: o lápis de cor que acompanha o ponteiro ou o dedo dentro do quadro, com desgaste, partículas e som.
- `paleta-de-desenho`: cores, espessuras, balde e conta-gotas, sem mudar o que vai para as redes.

### Modified Capabilities
(nenhuma: as specs vivas não mudam; a borracha por traço e o "Limpar" da change `visual-tinta-cinetica` são reaproveitados como estão)

## Impact

- **Dependências novas:** `@mediapipe/tasks-vision` (npm, Apache 2.0; ~10 MB de wasm) e o modelo `hand_landmarker.task` (~7,8 MB, Apache 2.0), copiados para o build. Download autorizado pelo usuário em 25/11.
- **Código:** porta nova `DetectorDeMao` em `application/` com adaptador MediaPipe em `infrastructure/`; regras puras dos gestos em `domain/`; câmera, miniatura, seletor de modo e lápis em `presentation/`; `main.ts` liga o adaptador.
- **Teste de build offline:** os arquivos do MediaPipe entram na lista do que o build carrega; os endereços de documentação dentro da biblioteca podem precisar entrar na lista fechada de textos de terceiros.
- **Desempenho:** o rastreamento divide a CPU com as redes do jogo e o Zé; medir no notebook do evento (ensaio de 29/11).
- **Banner e pitch:** uma linha nova ("desenhe no ar: visão computacional com MediaPipe, 21 pontos da mão, offline").
