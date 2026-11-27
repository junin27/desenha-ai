# Design

## Context

- A abertura atual (`app/src/presentation/telas/tela-abertura.ts`, spec `tela-de-abertura` dentro da change `visual-tinta-cinetica`, ainda não arquivada) é uma tela fixa com demonstração ilustrativa. `interface-do-jogo.ts` escolhe entre `abertura | inicio | placar` enquanto a partida está na etapa `inicio`.
- O protótipo aprovado é `prototipos_visual/16_landing_viva.html` + `16_landing/landing.{js,css}`. Ele prova o visual, a navegação virtual e os portais, mas tem palpites e números escritos à mão.
- O domínio já tem o que a vitrine precisa: `prefixo(desenho, fracao)`, `rasterizar`, `sequenciar`, `normalizar`; a porta `ClassificadorDeDesenho` roda CNN e LSTM em ONNX no navegador (≈ 5 ms cada em CPU). `metricas_redes.json` e `metricas_slm.json` já são carregados pelo jogo.
- Não há desenhos variados do dataset no app: `teste_paridade_redes.json` tem 8 desenhos, todos "vaca". `desenha_ml.fonte_quickdraw` já sabe ler o formato *simplified* do Quick, Draw!.
- Restrições do projeto: offline, sem CDN (teste do build reprova endereços externos), sem rolagem em 1366×768 e 1920×1080, texto ≥ 24 px, hexagonal com teste de arquitetura, TDD.

## Goals / Non-Goals

**Goals:**
- Levar o protótipo 16 para o app mantendo as camadas: regras puras (portal, linha do tempo, palpites parciais) testáveis sem DOM; GSAP só na apresentação.
- Palpites reais e grade 28×28 idêntica à entrada da CNN.
- 60 fps entre transições e ≥ 30 fps durante um portal em 1366×768 no notebook do evento (medido no ensaio de 29/11).

**Non-Goals:**
- Reaproveitar o código do protótipo como está (é JS sem tipos, com números fixos e funções longas).
- Animar com WebGL/Three.js.

## Decisions

**D1 — Linha do tempo pausada, dirigida por um "alvo".** Uma `gsap.timeline({ paused: true })` descreve a história inteira (≈ 75 s). Rodinha/teclas/toque movem um alvo em segundos; a cada quadro o tempo da linha se aproxima do alvo (fração 0,08 com interação, 1,0 em autoplay). *Alternativas*: ScrollTrigger com rolagem real (descartada: quebra a regra "sem rolagem" e no estande ninguém rola); capítulos discretos com botão "próximo" (descartada: perde a sensação de plano contínuo pedida pelo usuário).

**D1b — Paradas por capítulo, sem andar sozinha (27/11, pedido do usuário).** O avanço automático atropelava quem estava lendo e a rolagem livre pulava pedaços do portal ("trava e já volta na próxima tela"). Agora cada capítulo tem uma parada logo antes do seu portal; cada gesto (um giro da roda, agrupando os eventos a menos de 400 ms; uma tecla; um arrasto de 50 px) leva à parada seguinte ou anterior, e o tempo anda até ela a 2 s de história por segundo (2,5 para trás), com quadro limitado a 1/60 s, então a passagem toca inteira, sem saltos. A prévia do portal deixou de "acender" na hora da passagem: a cena seguinte aparece dentro do objeto 1 s depois do começo do capítulo e acompanha o objeto (geometria medida a cada quadro na prévia, fixa no zoom). **Foco (27/11):** a prévia mostra o elemento principal da cena seguinte preenchendo o objeto (geometria com foco: P(u) vai de "foco sobre o objeto" a "tela sobre o objeto", e o fim continua sendo a identidade). Elementos de foco que entravam invisíveis ficam prontos na prévia e são refeitos depois do zoom (desenho e traços da LSTM retraçados, jarro esvazia e enche). Quando o objeto é o próprio conteúdo do capítulo (folha, grade, resposta da LSTM, jarro), a prévia só surge no fim, antes da parada. **Desempenho:** o `will-change` nas cenas piorou o portal (pior quadro 545 ms) e foi retirado; o culpado era o vídeo da roça ampliado ~24x (pior quadro 362–545 ms e corte direto no build). Durante o zoom, o vídeo das duas cenas vira imagem parada (`CongeladorDeVideo`): no build, a história inteira passou sem corte direto, 80 fps em média e pior quadro de 263 ms (nesta máquina, painel do app a 1366×768).

**D2 — Portal como função pura de geometria.** O domínio de apresentação recebe o retângulo do objeto (medido sem a transformação da cena) e o tamanho da tela e devolve: escala inicial `s0 = max(objeto.w/W, objeto.h/H)`, as duas matrizes da "câmera" para um progresso `u ∈ [0,1]` (fora: escala `s0^-u`; dentro: `s0^(1-u)`, ambas levando o centro do objeto ao centro da tela) e o recorte `inset(...) round r` que vai do formato do objeto (círculo = canto de meio lado) até a tela. Em `u = 1` a cena de dentro tem matriz identidade e recorte nenhum. Isso é testado com números (Vitest), sem DOM. *Alternativas*: zoom num ponto + círculo de outra cor (versão anterior do protótipo, reprovada pelo usuário: "do nada a tela muda de cor"); âncora parcial (encaixar o sol na grade): descartada porque deixa a borda da cena nova visível durante o zoom.

**D3 — Medição preguiçosa.** O retângulo do objeto é medido na primeira vez que a linha do tempo chega ao portal (quando as animações de entrada já terminaram), zerando só a transformação da cena. Medir antes erra (o título muda de largura depois do SplitText; elementos com `from()` estão deslocados). Mudança de tamanho de janela remonta a vitrine.

**D4 — Palpites reais por prefixo.** Caso de uso na `application`: dado o desenho da vitrine, devolve, para frações 0,25/0,5/0,75/1,0, o top-3 da CNN, da LSTM e do ensemble usando `prefixo` + `ClassificadorDeDesenho` + regras de `julgamento-do-desenho`. Calcula tudo uma vez quando a vitrine monta (8 chamadas, ≈ 80 ms) e guarda; a linha do tempo só mostra. *Alternativa*: classificar a cada quadro durante o traçado (descartada: CPU desnecessária e resultado igual).

**D5 — Desenhos da vitrine.** Função pura em `desenha_ml` escolhe, por categoria, o primeiro desenho do conjunto de teste (mesma divisão do treino) que o ensemble acerta com probabilidade ≥ 0,8 no desenho completo e que tem 2 a 8 traços; exporta `vitrine_tracos.json` com 8 desenhos (sol, casa, peixe, árvore, flor, gato, violão, bicicleta). Contrato em `contratos/`: para cada desenho, a entrada 28×28 calculada em Python e em TypeScript coincide (1e-6). A exportação roda no **Colab**, numa célula nova do notebook das redes, que já baixa as 30 categorias para o treino (cada `.ndjson` *simplified* tem dezenas de MB, de `storage.googleapis.com/quickdraw_dataset`). O notebook só orquestra: a regra fica em `desenha_ml`. **Atualização (26/11):** com o OK do usuário, a exportação passou a rodar localmente em `scripts/gerar_desenhos_da_vitrine.py`: baixa por streaming só as 8 categorias (≈ 80 MB de tráfego, nada salvo) e roda os mesmos `cnn.onnx`/`lstm.onnx` do jogo no avaliador de referência do pacote `onnx` (≈ 0,9 s por desenho), parando no primeiro desenho que serve em cada categoria. *Alternativa*: reaproveitar `teste_paridade_redes.json` (descartada: só "vaca").

**D6 — Números das métricas.** Um leitor na `application` monta um `ResumoDaVitrine` a partir de `metricas_redes.json`, `metricas_slm.json` e de um novo `ficha_da_vitrine.json` (contagem de testes e tamanho do GGUF, gerado pelo script de verificação); cada campo é opcional e a apresentação omite o que faltar.

**D7 — GSAP local.** `gsap@3.15.1` como dependência do app, importado por módulo (Vite empacota). Plugins: DrawSVG, MotionPath, SplitText (MorphSVG só se a gota da abertura precisar; senão, path interpolado à mão). O teste de distribuição já tem lista de exceções para URLs em comentários de licença: entra `https://gsap.com/standard-license` com o motivo, após conferir que é só texto de comentário.

**D8 — Fundo da roça.** `fundo-roca-toon.mp4` (1280×720, 24 fps, 1,56 MB) vai para `app/public/vitrine/`. Com "reduzir movimento", não toca. O loop usa `loop` nativo (o `vite preview` aceita Range); o truque de recarregar a fonte do protótipo era só para o `http.server` do Python.

**D9 — Relação com a spec `tela-de-abertura`.** A vitrine substitui a "Demonstração em loop" e muda o limite "Jogar agora → apelido" de 1,2 s para 2,2 s. Como `tela-de-abertura` ainda não é spec viva, esta change cria a capacidade `vitrine-da-abertura`. Antes de arquivar esta change, `visual-tinta-cinetica` precisa estar arquivada (decisão do usuário) e então esta change ganha um delta `MODIFIED`/`REMOVED` em `tela-de-abertura` (tarefa 9.1).

**D10 — Onde mora cada coisa (hexagonal).**
- `domain/vitrine/`: geometria do portal, lista e ordem dos capítulos, escolha do próximo desenho sem repetir.
- `application/`: palpites por prefixo (D4), resumo das métricas (D6).
- `infrastructure/`: leitura de `vitrine_tracos.json` e `ficha_da_vitrine.json`.
- `presentation/vitrine/`: GSAP, cenas, partículas, controle de entrada; `tela-vitrine.ts` entra no lugar de `tela-abertura.ts` em `interface-do-jogo.ts`.

**D11 — Degradação automática.** Um medidor de quadros (janela de 3 s) na apresentação liga, abaixo de 30 fps, o mesmo caminho do movimento reduzido para transições e vídeo, mas mantém o avanço automático, porque no estande ninguém interage o tempo todo. Vale até recarregar o jogo (sem oscilar entre os modos). *Alternativas*: só medir no ensaio e ajustar à mão (descartada: se o notebook do evento for mais fraco, a vitrine trava na frente do público); baixar a qualidade aos poucos (descartada: mais estados para testar, a 4 dias do evento).

**D12 — Junção das duas propostas.** Esta change foi escrita por duas sessões ao mesmo tempo. Ficou a capability `vitrine-da-abertura`; da outra versão (`vitrine-viva`, removida) entraram os requisitos de crédito do Quick, Draw!, volta do placar, degradação em notebook lento e "tudo carregado do próprio build".

## Risks / Trade-offs

- [Portal pela janela amplia a cena da roça ≈ 25×; pode cair abaixo de 30 fps no notebook do evento] → medir no ensaio; se cair, usar um quadro estático (poster) da roça durante o portal em vez do vídeo.
- [GSAP traz URL no comentário de licença e o teste do build reprova] → exceção explícita e justificada (D7), com teste que garante que é só comentário.
- [Download do Quick, Draw! depende de rede e do OK do usuário] → o JSON gerado é versionado; o jogo nunca baixa nada.
- [Palpites reais podem errar o desenho escolhido] → D5 só escolhe desenhos que o ensemble acerta com ≥ 0,8; mesmo assim a vitrine mostra o que as redes devolvem, nunca um valor fixo.
- [Duas fontes da verdade sobre a abertura até o arquivamento] → D9 e a tarefa 9.1.
- [Linha do tempo longa num arquivo só] → um módulo por capítulo (≤ 300 linhas cada), montados por uma lista.

## Migration Plan

1. Entrar com a vitrine atrás de `?vitrine=0` desligável durante o desenvolvimento; a abertura antiga continua até a tarefa de troca.
2. Trocar a primeira tela em `interface-do-jogo.ts`; remover `tela-abertura.ts` e seus testes no mesmo commit em que os testes da vitrine cobrem os cenários equivalentes.
3. Rollback: reverter o commit da troca (a abertura antiga volta inteira).

## Open Questions

- Ordem final dos 8 desenhos da vitrine (qualquer ordem satisfaz a spec); decidir olhando os desenhos exportados.

### D1c. Capítulo seguinte escondido no objeto (27/11/2026)

O usuário recusou a prévia visível (miniatura "colada" no cenário) e o véu de cor. Agora, parado, o objeto aparece como sempre e a cena seguinte tem opacidade 0; no gesto ela surge de dentro do objeto durante a primeira metade do zoom (`opacidadeDaCenaNova`). No "ô" o objeto é o buraco da letra e a câmera entra pela estradinha de terra da roça (`focoNaTela`), que combina com o marrom da abertura. O medidor de quadros só mede 2 s depois de a animação ficar pronta (o carregamento derrubava a taxa e ligava o corte direto).
