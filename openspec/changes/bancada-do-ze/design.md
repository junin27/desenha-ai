# Design

## Context

A `jogo-web` deixou a partida inteira na aplicação (`Partida`, máquina de estados imutável) com portas para classificador, narrador, placar, relógio, sorteador e reserva, e uma `InterfaceDoJogo` que mostra uma tela por etapa. O narrador real (`NarradorLlamaServer`) já mede tokens e tokens/s a partir do `llama-server`; o classificador ONNX ainda não mede tempo. O domínio já tem `entradaPergunta` (contrato com o Python) e `formaComparavel` (sem acento, usada no vazamento). Motivação em `proposal.md`.

## Goals / Non-Goals

**Goals:**
- Acrescentar voz, pergunta, alternância de modelo e painel **sem mudar as regras da partida** nem os testes da `jogo-web`.
- Medir tempos por decoradores das portas, para a partida não saber que está sendo medida.
- Tudo testável sem navegador (dublês para voz, preferências e medições).

**Non-Goals:**
- Escolher voz, velocidade ou tom pela tela: uma configuração fixa e documentada.
- Gráficos no painel: só números e tabelas curtas, legíveis a 1,5 m.

## Decisions

### D1 — Medições por decoradores na aplicação
`ClassificadorMedido` e `NarradorMedido` implementam as mesmas portas, envolvem o adaptador real e publicam em `MedicoesDaSessao` (retrato imutável + ouvintes, como a `Partida`). O tempo até o 1º token é o instante da primeira leitura parcial menos o do pedido; os tempos vêm da porta `Relogio` (no navegador, `performance.now()` dá precisão abaixo de 1 ms; `Date.now()` continua no placar).
- **Alternativa descartada:** medir dentro da `Partida` (misturaria regra de jogo com telemetria e mudaria os testes dela).
- **Alternativa descartada:** medir só nos adaptadores (o painel dependeria de detalhes da infraestrutura).

O `RelogioDoNavegador` ganha `instante()` (monotônico, `performance.now()`) ao lado de `agora()` (horário, `Date.now()`); a porta `Relogio` passa a ter os dois.

### D2 — Narrador alternável
`NarradorAlternavel` implementa `NarradorDoJogo` sobre dois narradores (destilado e base). A escolha é lida **no início** de cada `falar()`, então um pedido em andamento termina no modelo que o começou. A `FalaFinal` ganha o campo opcional `modelo` ("destilado" | "base"), e a `Partida` o guarda junto da charada e da narração (`modeloDaFala`), para o selo mostrar quem falou. Origem `reserva` continua valendo mais que o modelo no selo.
- **Alternativa descartada:** recriar a `Partida` ao trocar o modelo (perderia a partida em andamento).

### D3 — Voz: porta `VozDoZe` e caso de uso `LeitorEmVoz`
- Porta `VozDoZe { disponivel(): boolean; falar(texto): void; calar(): void }`. Adaptador `VozDoNavegador` sobre `speechSynthesis`: filtra `localService === true` e `lang` começando por `pt`, prefere `pt-BR`; as vozes chegam de forma assíncrona (`voiceschanged`), então `disponivel()` é reavaliado quando elas chegam.
- `LeitorEmVoz` (aplicação) assina a `Partida` e a conversa do "Pergunte ao Zé" e decide **o que** falar comparando o retrato anterior com o novo: charada passou de ausente a presente; um resultado novo entrou; a resposta da pergunta ficou pronta. Mudou a etapa (ou a tela da pergunta abriu/fechou) → `calar()` antes de qualquer fala nova.
- Preferência liga/desliga pela porta `PreferenciasDoEstande` (adaptador `localStorage`, chave `desenha-ai-so:voz:v1`), com a mesma leitura tolerante do placar.
- **Alternativa descartada:** voz neural baixada (Piper/ONNX) no navegador: dezenas de MB a mais no build e latência alta em CPU; fica para depois do evento.

### D4 — "Pergunte ao Zé" como caso de uso separado
`ConversaComOZe` (aplicação) tem estado próprio (`aberta`, `respondendo`, `falaAoVivo`, `resposta`, `origem`, `modeloDaFala`, `erro`) e comandos `abrir`, `perguntar`, `voltar`. Só abre com a partida em `inicio`. A `InterfaceDoJogo` mostra a tela da pergunta quando a conversa está aberta.
- **Bloqueio:** regra de domínio `perguntaBloqueada(texto)` em `domain/ze/bloqueio.ts`, que compara as palavras de `formaComparavel` (sem acento, minúsculas) com uma lista curta de palavrões e ofensas comuns em português. Falso positivo só troca a resposta por uma educada.
- **Reserva:** a porta `ReservaDoZe` ganha `resposta()` e `respostaBloqueada()`; a `ReservaDeArquivo` usa 6 respostas-modelo fixas (não há respostas de reserva no dataset).
- **Alternativa descartada:** pergunta como uma etapa da `Partida` (misturaria o placar com uma conversa que não pontua).

### D5 — Painel técnico
`PainelTecnico` (apresentação) é uma camada sobreposta à direita, alternada pelo botão "Bastidores" e por F2, que lê `MedicoesDaSessao`, o resultado do autoteste de paridade e as métricas do treino. A chave base × destilado fica nele e chama `NarradorAlternavel.escolher()`.
- **Métricas do treino:** `lerMetricasDasRedes` e `lerMetricasDoSlm` (infraestrutura) validam só os campos exibidos; ausente ou inválido vira `undefined` e a tela mostra "—". `copiar_modelos.sh` passa a copiar `metricas_redes.json` e, se for informado, `metricas_slm.json`.
- **Atalho F2:** Ctrl+Shift+B abre a barra de favoritos no Chrome e no Edge; F2 não tem função no navegador.

### D6 — Endereços
`?ze=` (destilado, padrão `http://127.0.0.1:8080`) e `?zebase=` (base, padrão `http://127.0.0.1:8081`). A `demo-offline` sobe os servidores nessas portas.

## Risks / Trade-offs

- [O Windows do estande pode não ter voz pt-BR local] → o botão mostra "Voz pt-BR não instalada" e o jogo segue mudo; a instalação da voz "Microsoft Maria" entra no checklist da `demo-offline`.
- [Dois `llama-server` (base e destilado, Q4_K_M ~1,1 GB cada) somam ~2,2 GB dos 2,8 GB livres] → a `demo-offline` decide se o base sobe junto ou só quando a chave for trocada; aqui o jogo só precisa tolerar o base desligado (reserva + contador no painel).
- [A síntese de voz do Chrome às vezes para sozinha em falas longas] → as falas do Zé são curtas (narração de até ~60 palavras); se parar, o texto continua na tela.
- [Lista de bloqueio deixa passar ofensas criativas] → aceitável para uma feira acadêmica com mediador no estande; a resposta do Zé também é conferida quanto ao formato.
- [`performance.now()` tem resolução reduzida em alguns navegadores (~0,1 ms)] → suficiente para tempos de 1 a 100 ms.
