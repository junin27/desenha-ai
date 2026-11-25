# Tasks

## 1. Domínio (TDD, funções puras)

- [x] 1.1 `domain/desenho/borracha.ts`: testes de `tracosForaDaBorracha` (apaga a porta e mantém telhado, paredes, janela na ordem; nada sai a 40 px; usa distância ao segmento, não só aos pontos) falhando → implementar. Verifica: `npm --prefix app test -- borracha`
- [x] 1.2 `domain/rodada/pontuacao.ts`: extrair `ordemOficialDoPlacar` (sem corte) e manter `ordenarPlacar` = ordem cortada em 10; teste de contrato e testes atuais continuam verdes, novo teste "12 partidas numeradas de 1º a 12º". Verifica: `npm --prefix app test -- pontuacao contrato-regras`
- [x] 1.3 `domain/rodada/listagem-do-placar.ts`: testes de `listarPlacar` (10 sem busca; busca "peao" acha "Peão Veloz"; busca alcança a 12ª com posição 12º; ordens Pontos/A–Z/Recentes; partida recém-jogada fora do top 10 anexada abaixo da 10ª; sem resultado devolve lista vazia) → implementar. Verifica: `npm --prefix app test -- listagem-do-placar`

## 2. Humor do Zé (TDD)

- [x] 2.1 `presentation/ze/controle-de-humor.ts` (puro): testes dos cenários da spec `personagem-do-ze` (pensando na charada não pronta; torcendo no desenho; assustado com ≤ 5 s; comemorando/coçando-a-cabeça/bravo no veredito; neutro no resto) → implementar. Verifica: `npm --prefix app test -- controle-de-humor`
- [x] 2.2 `presentation/ze/personagem.ts`: cria o SVG do Zé (desenho do protótipo 11, sem recurso externo) com `mudarHumor` e `falar(texto)` que volta ao humor anterior; testes em jsdom: um humor por vez, fala restaura o humor. Verifica: `npm --prefix app test -- personagem`
- [x] 2.3 Temporizador de tédio (30 s, reiniciado por `pointerdown`/`pointermove`/`keydown`, desligado no desenho) com relógio falso do Vitest: entediado aos 30 s, volta ao humor anterior na interação, nunca no desenho. Verifica: `npm --prefix app test -- tedio`

## 3. Borracha na captura

- [x] 3.1 `captura-do-desenho.ts`: modo lápis/borracha; teste em jsdom com Pointer Events simulados: com a borracha sobre um traço, o ouvinte recebe os traços restantes com `terminado = true`; sem traço restante, a tela chama `limparDesenho()`; o cronômetro não é tocado. Verifica: `npm --prefix app test -- captura`
- [x] 3.2 `tela-desenho.ts`: botões Lápis/Borracha/Limpar com a ferramenta ativa destacada e Lápis selecionado no começo da rodada (teste da tela). Verifica: `npm --prefix app test -- tela-desenho`

## 4. Telas

- [x] 4.1 `tela-abertura.ts`: teste (primeira tela ao carregar, sem campo de apelido; "94,7" vindo das métricas; sem métricas não mostra %; "Jogar agora" leva ao apelido; demonstração para fora da abertura) → implementar com a demonstração pré-gravada. Verifica: `npm --prefix app test -- tela-abertura`
- [x] 4.2 `tela-inicio.ts` vira a tela de apelido: sugestões preenchem o campo; "Começar partida" desabilitado com nome inválido; "Ver placar"; Pergunte ao Zé embutido (conversa continua na mesma tela). Testes da tela e os da `pergunte-ao-ze` continuam verdes. Verifica: `npm --prefix app test -- tela-inicio tela-pergunta`
- [x] 4.3 `tela-charada.ts` e `tela-desenho.ts` com o Zé (pensando enquanto gera, só "Pensando…" na tela; torcendo; assustado a 5 s) e cronômetro em anel. O teste de "Charada sem vazamento" continua verde. Verifica: `npm --prefix app test -- tela-charada tela-desenho`
- [x] 4.4 `tela-veredito.ts`: desenho da rodada redesenhado a partir dos traços restantes, selo nas cores da spec, pontos e total, palpite principal de CNN/LSTM/ensemble com % e cor, "—" sem traços, Zé comemorando/coçando/bravo, confete só no ACERTOU e limpo ao terminar. Verifica: `npm --prefix app test -- tela-veredito`
- [x] 4.5 `tela-placar.ts` (substitui `tela-fim.ts`): pódio das 5 primeiras, pesquisa, ordens, posição oficial e partida recém-jogada destacada; "Jogar de novo" volta ao apelido. Verifica: `npm --prefix app test -- tela-placar`
- [x] 4.6 `interface-do-jogo.ts`: abertura → apelido dentro da etapa `inicio`; `fim` mostra o placar; repasse dos traços do desenho ao veredito; teste "Etapa e tela coincidem" atualizado. Verifica: `npm --prefix app test -- interface-do-jogo`

## 5. Identidade visual

- [x] 5.1 Reescrever `app/src/estilo.css` com os tokens da paleta, contornos irregulares, sombras chapadas, manchas e rabiscos de fundo com `pointer-events: none`, pincelada e bloco `prefers-reduced-motion`. Teste que lê o CSS: cores de texto só da paleta, contraste ≥ 4,5:1 em cada par texto/fundo usado, fonte do jogo ≥ 24 px. Verifica: `npm --prefix app test -- estilo`
- [x] 5.2 Pincelada entre telas (≤ 1,2 s, imediata com movimento reduzido) e rabiscos de fundo limitados a 6 por vez; teste com relógio falso. Verifica: `npm --prefix app test -- transicao`
- [x] 5.3 Teste de build offline continua verde (nenhum endereço externo novo). Verifica: `npm --prefix app run build && npm --prefix app test -- build`

## 6. Conferência no navegador

- [x] 6.1 Rodar `npm --prefix app run dev` com os modelos de `copiar_modelos.sh` (Zé de reserva) e jogar uma partida inteira a 1366×768 e a 1920×1080: nenhuma tela com rolagem, humores no momento certo, borracha reclassificando, veredito com o desenho certo, placar com pesquisa. Registrar capturas em `docs/capturas/`.
- [x] 6.2 Mesma partida com movimento reduzido ligado (emulação do navegador): sem pincelada nem confete, partida completa.

## 7. Verificação

- [x] 7.1 `bash scripts/verificar.sh` verde (pytest, mypy, ruff, vitest, lint, typecheck, build e `openspec validate --all --strict`).

## 8. Fontes, maiúsculas e ícones (pedido de 25/11)

- [ ] 8.1 Instalar `@fontsource/gochi-hand` e `@fontsource/patrick-hand` em `app/` (download autorizado); teste que lê o CSS falhando: títulos com Gochi Hand, texto com Patrick Hand, `text-transform: uppercase` em títulos e botões e não em campos → implementar no `estilo.css`. Verifica: `npm --prefix app test -- estilo`
- [ ] 8.2 Teste de build offline: os `.woff2` das duas fontes estão no `dist` e nenhum `@font-face` aponta para fora → implementar a importação no `main.ts`. Verifica: `npm --prefix app run build && npm --prefix app test -- build`
- [ ] 8.3 `presentation/icones.ts`: testes de `criarIcone` (SVG com `aria-hidden`, traço na cor do texto, nome desconhecido não existe pelo tipo) → implementar com os 14 ícones; o botão com ícone mantém o texto como nome. Verifica: `npm --prefix app test -- icones`
- [ ] 8.4 Pôr os ícones nos títulos e botões das telas (no lugar dos emojis do desenho); teste da tela de desenho: os 4 botões têm ícone e o nome continua "Lápis", "Borracha", "Limpar", "Pronto!". Verifica: `npm --prefix app test -- tela-desenho`
- [ ] 8.5 Refazer as capturas nas duas resoluções e com movimento reduzido (`scripts/capturar_telas.mjs`): nenhuma tela com rolagem; `bash scripts/verificar.sh` verde.

## Workflow follow-up

- Arquivar as 6 changes concluídas (`treino-das-redes`, `dataset-do-ze`, `fine-tuning-do-ze`, `jogo-web`, `bancada-do-ze`, `demo-offline`) **antes** de arquivar esta; depois ajustar na spec viva `interface-do-jogo` os requisitos "Telas da partida" (abertura, apelido, placar no fim) e "Captura do desenho" (borracha), e em `pergunte-ao-ze` o "Abrir e voltar" (conversa embutida na tela de apelido).
- Corrigir o `openspec/config.yaml` ("nunca git push" na aplicação) para refletir o pedido do usuário: push depois de cada commit com a verificação verde.
- Ensaio de 29/11 no notebook do evento: medir FPS das animações; abaixo de 30 FPS, desligar os rabiscos de fundo.
