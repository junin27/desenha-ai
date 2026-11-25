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
`POST /completion` com `{prompt, n_predict: 300, stop: ["<|im_end|>"], stream: true, temperature: 0.3, repeat_penalty: 1.0, cache_prompt: true}`; a resposta vem em SSE (`data: {"content": ..., "stop": ..., "timings": {...}}`). Os tokens por segundo vêm de `timings.predicted_per_second` do último evento. Um `AbortController` aplica os 25 s. `cache_prompt` reaproveita o prefixo do *system prompt* entre chamadas (menos latência em CPU).

### D6 — Narrações-modelo
Para cada veredito, 6 narrações curtas no estilo do Zé, com o nome do desafio e do 1º palpite (ex.: "Ô trem bão! Era {desafio} e as redes cravaram!"), escolhidas pelo `Sorteador`. Elas ficam em `infrastructure/reserva/narracoes.ts`; no domínio fica só a coerência com o veredito.

### D7 — Testes da apresentação
Os renderizadores recebem o estado e devolvem/atualizam elementos; são testados com `happy-dom` (DOM leve no Vitest) só no essencial (etapa → tela, textos de charada/palpites/pontos). O resto é conferido no navegador: o agente abre o build no painel de navegador e tira capturas a 1366×768 e 1920×1080 (spec "Legibilidade no estande").

### D8 — Decisões tomadas na implementação
- **Nível da charada por rodada:** rodada 1 fácil, 2 médio, 3 difícil (a spec pede "uma charada", sem nível). A partida fica mais desafiadora e usa os três níveis do dataset.
- **Botão "Desenhar" entre a charada e o desenho:** o visitante lê a charada no tempo dele; o comando `desenhar()` só funciona depois que a charada chegou (do Zé ou da reserva).
- **"Desenho concluído" na entrada VEREDITO:** 100% quando a rodada acaba pelo Pronto ou pelo tempo; na vitória antecipada, a fração dos 20 s já usada (aos 6 s, 30%). É a forma mais próxima do "prefixo do desenho" usado no dataset, que o jogo não tem como medir.
- **Palpites na entrada VEREDITO:** top-5 de cada rede, como no dataset do Zé.
- **Rodada sem traço:** vale ERROU e usa a narração-modelo direto, sem chamar o Zé (não há palpites para ele narrar).
- **Runtime do ONNX no build (ajuste do D4):** em vez de copiar os `.wasm` para `public/ort/`, o jogo importa `onnxruntime-web/wasm` e o arquivo `ort-wasm-simd-threaded.wasm` com `?url`; o Vite o emite em `dist/assets/` com hash e `ort.env.wasm.wasmPaths` aponta para ele. Mesmo resultado offline, sem script de cópia nem arquivo esquecido.
- **Endereço do Zé:** padrão `http://127.0.0.1:8080`; o parâmetro `?ze=` na URL troca sem rebuild (útil para o Zé base × destilado da `bancada-do-ze`).
- **Arquivos ausentes:** sem `classes.json` ou sem os `.onnx`, o jogo mostra uma tela de erro dizendo o que rodar; sem `charadas_reserva.json`, segue com uma charada genérica de reserva e avisa no console.
- **Temperatura 0,3 e `repeat_penalty` 1,1 (ajuste do D5, 24/11/2026, aprovado pelo usuário):** medido com o GGUF do Zé da rodada v3 no `llama-server` local, nas 46 entradas de teste e com a régua do notebook 3. Com 0,7: formato 100%, CHARADA 44%, VEREDITO 27%. Com gulosa + 1,15: 98%, 44%, 68%. Com 0,3 + 1,1: 100%, 62%, 77%, sem laço e no máximo 9,8 s por fala. A penalidade corta o laço da geração gulosa ("o que é, o que é…"); a temperatura baixa mantém o rótulo do veredito.
- **Sem penalidade de repetição (25/11/2026, rodada v7):** com o raciocínio do veredito pela regra, o pensamento termina em "o veredito é ERROU" e a penalidade 1,1 fazia o Zé trocar o rótulo ("VEREDITO: PELADO", 4 de 22 no teste). A v7 tirou dos dados o "o que é, o que é" que causava o laço. Na validação, com o GGUF Q8_0 e temperatura 0,3: com 1,1, formato 100%, CHARADA 87,5%, VEREDITO 100%, PERGUNTA 87,5%; com 1,0, 100%, 93,8%, 95,5% e 100%, máximo de 21 s por fala.
- **Discordância do Zé:** só conta quando a fala está no formato e traz outro veredito; fala fora do formato ou falha do narrador usam a narração-modelo sem marcar discordância.

## Risks / Trade-offs

- [O `onnxruntime-web` aumenta o build em ~10 MB de wasm] → aceitável (offline, local).
- [A LSTM em wasm leva mais que 100 ms em CPUs fracas] → medição no autoteste; se passar, só a CNN roda durante o traço e a LSTM roda ao soltar (degradação documentada).
- [A voz do Windows em pt-BR pode não estar instalada] → isso é da change `bancada-do-ze`; aqui não há áudio.
- [O CORS entre o jogo (porta do Vite/estático) e o `llama-server` (8080)] → o `llama-server` envia `Access-Control-Allow-Origin: *`; se não enviar, a `demo-offline` serve o jogo pelo próprio `llama-server` (`--path`).
