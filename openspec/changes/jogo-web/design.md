# Design

## Context

O `app/` já tem o domínio completo e testado: desenho (pré-processamento), rodada (ensemble, veredito, pontuação, vazamento), ze (conversa e prompt), `resultado.ts` e o teste de arquitetura hexagonal. Ainda não tem `application`, `infrastructure`, `presentation` nem `main.ts`. Os artefatos das redes do ensaio local ficam em `saida/ensaio/` (fora do Git); os do Colab chegam em `modelos_redes.zip`. Motivação em `proposal.md`.

## Goals / Non-Goals

**Goals:**
- A partida inteira testável sem navegador e sem rede (casos de uso + dublês).
- Trocar o Zé real pela reserva, ou as redes reais por um dublê, sem tocar no domínio nem na aplicação.
- Jogo jogável no evento mesmo com o SLM desligado.

**Non-Goals:**
- Framework de UI (React/Vue): uma tela por etapa, DOM direto, com renderizadores pequenos.
- Animações elaboradas.

## Decisions

### D1 — Portas (application) e adaptadores (infrastructure)
| Porta | Adaptador real | Dublê nos testes |
|---|---|---|
| `ClassificadorDeDesenho.classificar(desenho) → Resultado<Palpite>` | `ClassificadorOnnx` (onnxruntime-web; sessões injetadas) | `ClassificadorFalso` (probabilidades programadas) |
| `NarradorDoJogo.falar(entrada, aoLer) → Promise<Resultado<FalaFinal>>` | `NarradorLlamaServer` (fetch + SSE, `AbortController` para o limite de tempo) | `NarradorFalso` (falas e falhas programadas) |
| `RepositorioDePlacar.ler() / gravar(partida)` | `PlacarLocalStorage` (`Storage` injetado) | `PlacarEmMemoria` |
| `Relogio.agora() / aCada(ms, f)` | `RelogioDoNavegador` | `RelogioFalso` (avança o tempo à mão) |
| `Sorteador.embaralhar(lista)` | `SorteadorAleatorio` | `SorteadorFixo` |
| `ReservaDoZe.charada(categoria) / narracao(veredito, ...)` | `ReservaDeArquivo` (`charadas_reserva.json` + narrações-modelo) | o próprio, com JSON de teste |

### D2 — Partida como máquina de estados imutável
`Partida` (application) guarda o estado atual (`etapa`, rodadas, pontos) e expõe comandos (`comecar`, `pedirCharada`, `registrarTraco`, `pronto`, `julgar`, `proximaRodada`). Cada comando devolve o novo estado; a apresentação assina mudanças (`aoMudar`). Isso permite testar sequências completas com o `RelogioFalso`.
- **Alternativa descartada:** lógica nos manipuladores de eventos do DOM (impossível de testar sem navegador).

### D3 — Palpite mais recente vence
O classificador recebe um número de geração a cada traço; resultados de gerações antigas são descartados ao chegar (spec "Palpites não se acumulam"). Durante o traço, o pedido é limitado a 1 a cada 250 ms (`Relogio`).

### D4 — ONNX no navegador
`onnxruntime-web` com o *backend* wasm, 1 thread (`ort.env.wasm.numThreads = 1`, que dispensa *cross-origin isolation*) e os `.wasm` copiados para `public/ort/` no build (`ort.env.wasm.wasmPaths`). Os modelos ficam em `public/modelos/` (fora do Git; o script `scripts/copiar_modelos.sh` traz de `saida/ensaio` ou do zip do Colab). Nos testes do adaptador, a sessão é criada pelo `onnxruntime-node` (mesma API), com os modelos do ensaio local, ou o teste é pulado se eles não existirem.

### D5 — Streaming do llama-server
`POST /completion` com `{prompt, n_predict: 300, stop: ["<|im_end|>"], stream: true, temperature: 0.7, cache_prompt: true}`; a resposta vem em SSE (`data: {"content": ..., "stop": ..., "timings": {...}}`). Os tokens por segundo vêm de `timings.predicted_per_second` do último evento. Um `AbortController` aplica os 25 s. `cache_prompt` reaproveita o prefixo do *system prompt* entre chamadas (menos latência em CPU).

### D6 — Narrações-modelo
Para cada veredito, 6 narrações curtas no estilo do Zé, com o nome do desafio e do 1º palpite (ex.: "Ô trem bão! Era {desafio} e as redes cravaram!"), escolhidas pelo `Sorteador`. Elas ficam em `infrastructure/reserva/narracoes.ts`; no domínio fica só a coerência com o veredito.

### D7 — Testes da apresentação
Os renderizadores recebem o estado e devolvem/atualizam elementos; são testados com `happy-dom` (DOM leve no Vitest) só no essencial (etapa → tela, textos de charada/palpites/pontos). O resto é conferido no navegador: o agente abre o build no painel de navegador e tira capturas a 1366×768 e 1920×1080 (spec "Legibilidade no estande").

### D8 — Decisões tomadas na implementação
- **Nível da charada por rodada:** rodada 1 fácil, 2 médio, 3 difícil (a spec pede "uma charada", sem nível). A partida fica mais desafiadora e usa os três níveis do dataset.
- **Botão "Desenhar" entre a charada e o desenho:** o visitante lê a charada no tempo dele; o comando `desenhar()` só funciona depois que a charada chegou (do Zé ou da reserva).

## Risks / Trade-offs

- [O `onnxruntime-web` aumenta o build em ~10 MB de wasm] → aceitável (offline, local).
- [A LSTM em wasm leva mais que 100 ms em CPUs fracas] → medição no autoteste; se passar, só a CNN roda durante o traço e a LSTM roda ao soltar (degradação documentada).
- [A voz do Windows em pt-BR pode não estar instalada] → isso é da change `bancada-do-ze`; aqui não há áudio.
- [O CORS entre o jogo (porta do Vite/estático) e o `llama-server` (8080)] → o `llama-server` envia `Access-Control-Allow-Origin: *`; se não enviar, a `demo-offline` serve o jogo pelo próprio `llama-server` (`--path`).
