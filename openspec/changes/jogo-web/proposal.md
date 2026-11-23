# Proposal

## Why

Tudo o que foi construído até agora (pré-processamento, regras, formato da conversa e prompt do Qwen3) é domínio puro, sem tela. O visitante da feira precisa de um jogo que abra no navegador, funcione **offline** no notebook do estande, reconheça o desenho a cada traço e traga o Zé narrando. Esse jogo também precisa continuar jogável se o SLM travar ou demorar, porque a votação popular acontece ao vivo.

**Disciplinas:** ambas. As redes neurais rodam no navegador (ONNX) com palpites ao vivo, e o SLM cria a charada e dá o veredito por *streaming*.

## What Changes

- **Partida** (camada `application`): máquina de estados da partida (apelido → 3 rodadas de charada, desenho e veredito → placar), temporizador de 20 s, vitória antecipada e pontos pela regra (D-08). Tudo por casos de uso e portas, testado com dublês.
- **Palpites ao vivo** (adaptador ONNX): a CNN e a LSTM rodam no navegador com `onnxruntime-web` empacotado no build (sem CDN), com autoteste de paridade ao abrir.
- **Narrador do Zé** (adaptador llama.cpp): chamada ao `llama-server` com o prompt do contrato, leitura progressiva do *streaming*, limite de tempo e **reserva automática**: charadas de reserva e narrações-modelo quando o SLM falha, demora ou a charada vaza a palavra.
- **Placar local**: as partidas ficam no `localStorage`, sobrevivem a recarregar a página e há um comando para a organização zerar o placar.
- **Interface**: telas de início, charada, desenho (canvas com mouse, toque ou caneta), veredito e placar, legível a 1,5 m de distância numa tela de notebook.

### Fora do escopo (change `bancada-do-ze`, em seguida)

- Voz do Zé (síntese de voz offline com botão liga/desliga).
- "Pergunte ao Zé" (tarefa PERGUNTA).
- Alternância Zé base × destilado.
- Painel técnico (tokens/s, latências, tamanhos).

### Fora do escopo (change `demo-offline`)

- Scripts que sobem o `llama-server` e baixam os modelos; inicialização com um clique.

### Fora do escopo do projeto

- Câmera, microfone, contas de usuário, ranking online, celular como controle.

## Capabilities

### New Capabilities

- `partida`: o fluxo de uma partida (estados, tempo, rodadas, pontos e reserva quando o Zé falha), independente de tela.
- `palpites-ao-vivo`: reconhecimento do desenho no navegador a cada traço, com as redes exportadas e conferidas.
- `narrador-do-ze`: conversa com o SLM local por *streaming*, com limite de tempo e reserva.
- `placar-local`: persistência e manutenção do placar no navegador do estande.
- `interface-do-jogo`: telas, captura do desenho e requisitos de uso no evento (offline, legibilidade, resoluções).

### Modified Capabilities

(nenhuma)

## Impact

- **Novo código TypeScript:** `app/src/application/` (casos de uso e portas), `app/src/infrastructure/` (ONNX, llama-server, localStorage, relógio), `app/src/presentation/` (telas e canvas) e `app/src/main.ts` (composição).
- **Dependência nova:** `onnxruntime-web` (empacotado pelo Vite junto com os arquivos `.wasm`).
- **Artefatos usados em tempo de execução**, fora do Git: `cnn.onnx`, `lstm.onnx`, `classes.json` e `teste_paridade_redes.json` (change `treino-das-redes`), `charadas_reserva.json` (change `dataset-do-ze`) e o `llama-server` em `localhost` (change `demo-offline`). Para desenvolver, o jogo usa os artefatos do ensaio local.
