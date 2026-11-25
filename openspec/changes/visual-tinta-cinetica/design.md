# Design

## Context

- A interface atual (`app/src/presentation/`) tem cinco telas (`inicio`, `charada`, `desenho`, `veredito`, `fim`) e a tela do Pergunte ao Zé aberta por botão. `InterfaceDoJogo` mostra a tela da etapa da partida (`TELA_DA_ETAPA`) e cada tela implementa `Tela.atualizar(estado)`. O estilo inteiro está em `app/src/estilo.css`.
- A captura (`captura-do-desenho.ts`) guarda os traços e entrega **o desenho inteiro** a cada mudança; `Partida.registrarTraco(desenho)` reclassifica tudo e `Partida.limparDesenho()` zera o palpite sem mexer no cronômetro. Isso torna a borracha uma questão da apresentação: basta entregar o desenho que sobrou.
- O `EstadoDaPartida` já traz as probabilidades da CNN, da LSTM e do ensemble do último palpite, a charada e o resultado de cada rodada; não guarda os traços.
- O protótipo aprovado (`prototipos_visual/9_jogavel_tinta_cores.html`) é um HTML único com regras e dados simulados. Ele serve de referência visual e de comportamento, **não** de código: as regras de veredito, pontos e placar continuam as do domínio.
- Restrições que valem: offline, fonte ≥ 24 px, sem rolagem a 1366×768 e 1920×1080, só "Pensando…" enquanto o Zé gera, arquitetura hexagonal com teste de arquitetura.

## Goals / Non-Goals

**Goals:**
- Reproduzir no jogo o visual e o fluxo do protótipo 9, ligados aos dados reais da partida.
- Manter o domínio e a aplicação como estão, salvo funções puras novas (borracha e listagem do placar).
- Cada comportamento das specs novas coberto por teste no Vitest (jsdom), sem depender de animação.

**Non-Goals:**
- Reescrever a máquina de etapas da partida ou o narrador.
- Biblioteca de animação, framework de UI ou fonte nova.
- Mudar o painel técnico além de herdar a paleta.

## Decisions

### D1. Abertura é uma tela da apresentação, não uma etapa da partida
A abertura e a tela de apelido aparecem enquanto a partida está em `inicio`. `InterfaceDoJogo` ganha um estado próprio da apresentação ("abertura" ou "apelido") só para `inicio`; as outras etapas continuam mapeadas por `TELA_DA_ETAPA`. Ao fim da partida (etapa `fim`) a tela é o **placar** (a tela de fim atual é substituída), e "Jogar de novo" volta ao apelido.
- *Alternativa descartada:* criar uma etapa `abertura` na `Partida`. Mudaria a spec `partida` e os testes da máquina de etapas por algo que é só apresentação.

### D2. Pergunte ao Zé embutido na tela de apelido
A conversa (`TelaPergunta`) deixa de ser uma tela sobreposta e passa a ser um painel dentro da tela de apelido, usando os mesmos `ComandosDaConversa`. O comportamento da spec `pergunte-ao-ze` (pergunta válida, resposta ao vivo, reserva, bloqueio) não muda.
- *Alternativa descartada:* manter o botão que abre a conversa. O usuário pediu explicitamente as duas coisas na mesma tela.

### D3. Borracha remove traços inteiros (função pura no domínio)
Função pura `tracosForaDaBorracha(tracos, ponto, raio)` em `domain/desenho/`: devolve os traços cujo **segmento** mais próximo do ponto está a mais de `RAIO_DA_BORRACHA` (18 px na escala do quadro), na ordem original. A captura chama essa função a cada movimento com a borracha; se algo saiu, entrega o desenho restante com `tracoTerminado = true` (reclassifica) ou, se não sobrou nada, chama `limparDesenho()`.
- *Alternativa descartada:* borracha de pixels (`destination-out`, como no protótipo). A CNN veria a imagem apagada, mas a LSTM continuaria lendo os traços originais: as duas redes julgariam desenhos diferentes. Cortar traços ao meio também foi descartado: cria traços novos que o visitante não fez e complica a sequência.

### D4. O desenho do veredito vem da captura
A `TelaDesenho` expõe os traços atuais (já sem os apagados) e `InterfaceDoJogo` os repassa à `TelaVeredito` quando a etapa vira `julgando`. O desenho é redesenhado num canvas do veredito com o mesmo traço; "nenhum traço" é o que decide o humor `bravo` e o "—" das redes.
- *Alternativa descartada:* guardar os traços no `EstadoDaPartida`. Aumentaria o estado e a spec `partida` só para exibir.

### D5. Zé em SVG com humores por classe
O desenho do Zé (do protótipo 11) vira um módulo `presentation/ze/` que cria o SVG e expõe `mudarHumor(humor)`; cada humor é uma classe CSS no SVG. Um `controle-de-humor` puro decide o humor a partir de (etapa, charada pronta?, segundos restantes, veredito, nenhum traço?) e é testado sem DOM. A fala usa "falando" e volta ao humor anterior ao terminar. O tédio é um temporizador de 30 s reiniciado por `pointerdown`, `pointermove` e `keydown`, desligado na tela de desenho.
- *Alternativa descartada:* animações em Lottie ou Rive. Seriam dependência nova, arquivo binário e ferramenta de autoria; SVG com CSS basta para 9 humores e fica no build.

### D6. Placar: listagem pura sobre a ordem oficial
Em `domain/rodada/` (junto de `ordenarPlacar`), uma função pura `listarPlacar(partidas, { busca, ordem, limite })` devolve linhas com a posição oficial. A busca compara sem acento e sem caixa (`normalize("NFD")` sem marcas). A linha da partida recém-jogada é anexada abaixo da 10ª quando estiver fora do top 10. O pódio usa as 5 primeiras da ordem oficial.
A ordem sem corte vira `ordemOficialDoPlacar` e `ordenarPlacar` passa a ser essa ordem cortada nas 10, com o mesmo resultado de hoje: o contrato Python ↔ TypeScript de pontuação (`contratos/`, `ordenar_placar` no `desenha_ml`) não muda.
- *Alternativa descartada:* filtrar no DOM. Deixaria a regra de posição sem teste.

### D7. Abertura com números reais
A acurácia vem das métricas que o painel técnico já lê (`metricas_redes.json`, via `InformacoesDoJogo`); ausente, o número some. A demonstração usa traços pré-gravados de uma casa e palpites fixos, marcados no código como ilustração (não passam pelas redes).

### D8. CSS em camadas, tokens da paleta
`estilo.css` é reescrito com variáveis da paleta (`--papel`, `--tinta`, `--terracota`, `--mostarda`, `--mostarda-texto: #8a5c00`, `--verde`, `--vermelho`), contornos irregulares por `border-radius` assimétrico e sombras chapadas. Animações só com `transform` e `opacity`; tudo sob `@media (prefers-reduced-motion: reduce)` é desligado. Um teste lê o CSS e reprova cor de texto fora da paleta e contraste abaixo de 4,5:1 (contas com a fórmula de luminância da WCAG).
- *Alternativa descartada:* Tailwind ou CSS-in-JS. Dependência nova sem ganho para um app deste tamanho.

### D9. Transição por pincelada sem atrasar a lógica
A pincelada é um SVG por cima de tudo, com `pointer-events: none`, que cobre (≈ 550 ms), troca a tela e descobre. A troca de tela continua síncrona em relação ao estado; o atraso é só visual e limitado a 1,2 s. Com movimento reduzido a troca é imediata.

## Risks / Trade-offs

- [Animações pesam no notebook do estande (CPU, sem GPU dedicada)] → só `transform`/`opacity`; o fundo de rabiscos é limitado a ~6 rabiscos ao mesmo tempo; medir FPS no ensaio de 29/11 e desligar o fundo se cair abaixo de 30 FPS.
- [Prazo curto: evento em 30/11] → as tarefas estão ordenadas para que cada grupo deixe o jogo jogável; se faltar tempo, o placar novo e o tédio são os últimos e podem ficar de fora sem quebrar nada.
- [Telas mais cheias estourarem 1366×768] → teste de layout por tela nas duas resoluções (Playwright não é usado; conferência no navegador do app a cada tela, como nas sessões anteriores, e teste de unidade que confere tamanhos mínimos de fonte no CSS).
- [Specs das changes `jogo-web` e `bancada-do-ze` ainda não arquivadas ficam desatualizadas ("Telas da partida", "Captura do desenho", Pergunte ao Zé como tela)] → arquivar as 6 changes concluídas antes de arquivar esta e, em seguida, ajustar esses requisitos (tarefa 8).
- [O `openspec/config.yaml` diz "nunca git push" na aplicação, mas o CLAUDE.md e o usuário pedem push depois de cada commit verde] → vale o pedido do usuário (push após verificação verde); registrar a divergência para corrigir o config.
