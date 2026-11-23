# Roteiro de changes (OpenSpec)

Ordem pensada no caminho crítico até o evento (30/11/2026). Cada linha vira uma change em `openspec/changes/`, aprovada antes de ser implementada.

| # | Change | Disciplina | Desbloqueia | Prazo-alvo |
|---|---|---|---|---|
| 1 | `pre-processamento-de-tracos` — contrato Python ↔ TypeScript (normalização, prefixo, rasterização 28×28, sequência stroke-3) | Redes Neurais | treino das redes e o app | 24/11 |
| 2 | `regras-da-rodada` — veredito (ACERTOU/QUASE/ERROU), pontuação e vazamento da palavra secreta | ambas | curadoria do dataset e o app | 24/11 |
| 3 | `treino-das-redes` — notebook 1 com o pacote: CNN, LSTM, ensemble, ONNX e métricas | Redes Neurais | o app real e o dataset (predições reais) | 25/11 |
| 4 | `dataset-do-ze` — Evol-Instruct, Teacher com CoT, curadoria verificável, ShareGPT/ChatML | SLM | o fine-tuning | 25/11 |
| 5 | `fine-tuning-do-ze` — QLoRA no Unsloth, avaliação base × destilado, GGUF Q4_K_M | SLM | o narrador real no app | 26/11 |
| 6 | `jogo-web` — app hexagonal: rodada, canvas, palpites ao vivo, Zé por streaming, placar | ambas | a demo | 27/11 |
| 7 | `demo-offline` — scripts do llama.cpp, modo contingência, autoteste e painel técnico | ambas | o evento | 28/11 |

Em paralelo (fora do OpenSpec, porque não é comportamento do sistema): cadastro do título até 27/11, banner (`docs/banner.md`), pitch (`docs/pitch.md`) e ensaio em 29/11.
