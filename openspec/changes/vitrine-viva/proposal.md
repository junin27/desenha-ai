# Proposal

## Why

A abertura atual explica o jogo em uma frase e numa demonstração ilustrativa (uma casa pré-desenhada, palpites inventados). No estande da feira (30/11/2026) e no portfólio, o visitante não chega a ver **o trabalho técnico** — CNN, LSTM, destilação, QLoRA, quantização — que é justamente o que as duas disciplinas avaliam. O protótipo `prototipos_visual/16_landing_viva.html`, aprovado pelo usuário em 26/11/2026, mostrou como contar isso como uma história contínua; agora ela precisa virar parte do jogo, com as redes **de verdade** palpitando sobre desenhos reais do dataset, e números lidos das métricas, não escritos à mão.

Contribui para **as duas disciplinas**: Redes Neurais (CNN e LSTM classificando traços reais ao vivo, curva de palpite antecipado) e Small Language Models (destilação, QLoRA, GGUF Q8_0 explicados com os números das métricas do treino).

## What Changes

- Nova **vitrine em capítulos** como primeira tela do jogo: abertura, o jogo, o desenho, a CNN, a LSTM, o Zé (SLM), destilação, QLoRA, GGUF, engenharia e o convite "Sua vez, sô!" — 11 capítulos, sem rolar a página.
- **Avanço da história**: roda do mouse, setas/PageDown/espaço e toque avançam e voltam; parado por 4 s, a história anda sozinha; no fim, recomeça depois de 10 s parada (modo vitrine do estande).
- **Transições por portal**: cada capítulo termina com a câmera entrando num objeto da cena (a letra "ô", a janela da casa, o sol desenhado, a grade de pixels, a cabeça do Zé, o jarro, um peso…) em que o capítulo seguinte já aparece; dois capítulos fazem o caminho inverso (afastamento). O "Jogar!" do convite abre a tela de apelido pelo mesmo efeito.
- **Redes reais na vitrine**: os capítulos do desenho, da CNN e da LSTM usam um desenho real do conjunto de teste do Quick, Draw!, traçado ponto a ponto; os palpites mostrados vêm da CNN e da LSTM em ONNX rodando no navegador sobre o traço parcial; a grade 28×28 mostrada é a mesma entrada que a CNN recebe.
- **Números das métricas**: acurácias, top-3, curva antecipada, tamanho do dataset do Zé, parâmetros LoRA, tamanho do GGUF e contagem de testes vêm de arquivos carregados pelo jogo; ausentes, o número é omitido.
- Novo arquivo de dados **`vitrine_tracos.json`** (um desenho de teste por categoria escolhida), gerado por função pura do `desenha_ml` e verificado por fixture em `contratos/`.
- **BREAKING (comportamento da abertura)**: a demonstração ilustrativa da casa sai; o tempo de "Jogar" até o apelido passa de ≤ 1,2 s para ≤ 2,2 s (duração do portal).
- **Desempenho no estande**: se a vitrine cair abaixo de 30 fps por 3 s, as transições viram corte direto e o vídeo pausa, mas a história continua andando sozinha.
- **Crédito do dataset** ("Quick, Draw! · CC BY 4.0") sempre que um desenho dele está na tela; "Início" no placar volta à vitrine.
- Dependência **GSAP 3.15.1** (licença "no charge" da GSAP) empacotada localmente no build.

## Capabilities

### New Capabilities
- `vitrine-da-abertura`: a história em capítulos da primeira tela — navegação (rodinha, teclas, toque, autoplay, recomeço), transições por portal, conteúdo de cada capítulo, redes reais sobre traços do dataset, números lidos das métricas e passagem para a tela de apelido.

### Modified Capabilities
<!-- Nenhuma spec viva muda: a abertura atual está na spec `tela-de-abertura`, que ainda vive dentro da change `visual-tinta-cinetica` (não arquivada). Ver "Impacto" e o design (D9). -->

## Fora do escopo

- O modo Mão controlando a história (só rodinha, teclado, toque e mouse); fica para outra change.
- Vídeo novo gerado por IA: usa só o fundo da roça já gerado (`fundo-roca-toon.mp4`, Veo 3.1 Lite, 1,56 MB).
- Narração em voz do Zé durante a vitrine.
- Mudanças nas telas da partida (charada, desenho, veredito, placar) e na tela de apelido, além de ela ser aberta pelo portal.
- Tradução para outros idiomas e versão para celular (o alvo é 1366×768 e 1920×1080, paisagem).
- Os vídeos realistas do protótipo 14 (`14_midia/acerto.mp4`, `trans-*.mp4`): não entram.

## Impact

- **app/**: nova tela `presentation/telas/tela-vitrine.ts` e módulos de apresentação (câmera/portal, capítulos, partículas); `interface-do-jogo.ts` passa a abrir a vitrine em vez da abertura atual; `tela-abertura.ts` é removida ou reduzida. Novo caso de uso na `application` para "palpites do traço parcial" reaproveitando `ClassificadorDeDesenho`.
- **Domínio**: função pura que monta o traço parcial (n primeiros pontos) e a curva de palpites; regra de recorte do portal (geometria) testável sem DOM.
- **ml/**: função pura que escolhe e exporta os desenhos da vitrine; script/notebook que baixa as categorias do Quick, Draw! (download com OK do usuário).
- **contratos/**: fixture que garante que Python e TypeScript produzem a mesma entrada 28×28 para os desenhos da vitrine.
- **Dependências**: `gsap@3.15.1` (≈ 6 MB em `node_modules`; até ≈ 130 KB minificados no build com núcleo + DrawSVG, MotionPath e SplitText — medir na tarefa do build). Sem CDN: o teste do build continua reprovando endereços externos.
- **Specs**: nova `vitrine-da-abertura`. Ao arquivar, os requisitos "Demonstração em loop" e o limite de 1,2 s da spec `tela-de-abertura` precisam ser removidos/ajustados (D9).
