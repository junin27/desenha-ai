# CLAUDE.md — Desenha Aí, Sô!

Jogo interativo para o 5º Workshop de IA da FASOFT/UniRV (30/11/2026) e projeto de portfólio. O visitante resolve uma charada criada por um SLM e desenha a resposta; uma CNN e uma LSTM tentam reconhecer o desenho em tempo real; o SLM "Zé do Rabisco" (Qwen3 destilado, QLoRA sobre o modelo em 4 bits, GGUF Q8_0 de 8 bits no evento) julga e narra. Tudo roda **offline em CPU**; o treino roda no Google Colab.

Regras por área ficam em `.claude/rules/` e carregam sozinhas quando você mexe naquela pasta.

> **Continuando o trabalho?** Leia primeiro `docs/continuacao.md` (estado das changes, preferências do usuário e como configurar outra máquina).

## Mapa

| Pasta | O que é |
|---|---|
| `openspec/` | **Fonte da verdade do comportamento.** `specs/` = o que o sistema faz hoje; `changes/` = mudanças em andamento. |
| `ml/` | Pacote Python `desenha_ml`: núcleo puro e testado (pré-processamento, regras, curadoria do dataset, formatos). |
| `notebooks/` | Notebooks do Colab. Só orquestram: baixar, treinar, exportar. Toda regra vem de `desenha_ml`. |
| `app/` | Jogo web em TypeScript (Vite), arquitetura hexagonal. Gera arquivos estáticos que rodam offline. |
| `contratos/` | Fixtures geradas pelo Python e verificadas pelo TypeScript (o mesmo desenho tem de dar a mesma entrada de rede nas duas linguagens). |
| `scripts/` | Preparação e inicialização da demo (llama.cpp, modelos). |
| `docs/` | Banner, pitch e decisões de arquitetura (`docs/decisoes.md`). |

## Como trabalhamos (inegociável)

1. **Spec antes do código (OpenSpec).** Comportamento novo ou alterado começa em `/openspec-propose`: `proposal.md` (o porquê e o que NÃO entra), deltas em `specs/` com cenários `#### Scenario:` (WHEN/THEN), `design.md` e `tasks.md`. **Só implemente change aprovada pelo usuário.** Ao terminar, `/openspec-archive-change` para a spec viva refletir o código. `openspec validate --strict` tem de passar.
2. **TDD.** Cada cenário da spec vira ao menos um teste, que cita o requisito no nome (`test_veredito_quase_quando_alvo_no_top3`). Primeiro o teste falhando, depois o código mínimo, depois a refatoração. "Funciona" só com teste que prova.
3. **Confirme o entendimento em 2–3 linhas antes de implementar.** Lacuna ou ambiguidade na spec → pergunte com opções concretas; nunca decida em silêncio. Decisão tomada → registre no `design.md` da change ou em `docs/decisoes.md`.
4. **Uma responsabilidade por commit**, mensagem `tipo(escopo): descrição` (Conventional Commits) citando a change. O corpo diz **por que**. Remoto: `https://github.com/junin27/desenha-ai` (branch `main`); **o usuário pediu (23/11/2026) que o GitHub fique sempre atualizado: depois de cada commit com a verificação verde, `git push origin main`**; nunca `--force`. Nunca restaure arquivos via Git sem pedir.
5. **Opinião técnica franca.** Abordagem ruim → diga que é ruim e por quê. Problema não documentado (API que mudou, dependência estranha) → avise e proponha registrar em "Armadilhas" abaixo.

## Arquitetura (resumo; detalhes em `docs/decisoes.md`)

- **`ml/` — núcleo funcional, casca imperativa.** `desenha_ml` só tem funções puras e tipadas (sem I/O de rede, sem GPU obrigatória). Notebooks e scripts são a casca: leem arquivos, chamam APIs, treinam.
- **`app/` — hexagonal (portas e adaptadores).** `domain` ← `application` ← `infrastructure` / `presentation`; dependências só apontam para dentro. Só `src/main.ts` (raiz de composição) conhece todas as camadas. Um teste de arquitetura reprova import proibido.
- **Contrato entre linguagens:** pré-processamento e regra do veredito existem em Python e em TypeScript. Mudou um lado → regenere `contratos/` e rode os testes dos dois lados.

## Padrões de código

- Funções de 4 a 20 linhas (acima de 50: pare e quebre). Arquivos abaixo de 300 linhas (sinalize) e nunca acima de 500.
- Nomes específicos e sem abreviação; nada de `data`, `handler`, `manager`, `utils` genérico.
- Tipagem explícita: Python com type hints em tudo (`mypy --strict`); TypeScript `strict`, sem `any`.
- Sem número mágico: constante nomeada (ex.: `ESPESSURA_DO_TRACO`).
- Erro esperado é valor (`Resultado`), não exceção. Mensagem de erro inclui o valor recebido e o formato esperado. Nunca engula exceção.
- Comentário explica o **porquê**. Mantenha os comentários existentes ao refatorar.
- Sem duplicação: lógica repetida vira função/módulo.

## Comandos (rodar a partir de `projeto_final/`)

- Python: `ml/.venv/Scripts/python -m pytest ml` · `… -m mypy --config-file ml/pyproject.toml ml/src ml/tests` · `… -m ruff check ml` · `… -m ruff format ml`
- Tudo de uma vez: `bash scripts/verificar.sh`
- Contratos: `ml/.venv/Scripts/python -m desenha_ml.contratos contratos/`
- App: `npm --prefix app test` · `npm --prefix app run lint` · `npm --prefix app run typecheck` · `npm --prefix app run build`
- Specs: `openspec validate --all --strict` · `openspec list`
- **Pronto para commit** = pytest, mypy, ruff, vitest, lint, typecheck e `openspec validate` verdes.

## Armadilhas conhecidas

- `mypy` rodado da raiz não acha `ml/pyproject.toml` e roda **sem** `--strict` sem avisar: sempre passe `--config-file ml/pyproject.toml`.
- O Python local é 3.15: não há `onnxruntime` para ele. A conferência do ONNX roda no Colab (Python do Colab) e no navegador (`onnxruntime-web`).
- Treino só no Colab (T4/L4; a RTX 3050 de 4 GB da máquina de casa não comporta o fine-tuning). A demo roda em CPU.
- As ferramentas de escrita/edição do agente convertem escapes como ` ` em caracteres reais e invisíveis. Para caracteres especiais em código, gere o texto com `chr()` num script ou use escapes que não sejam `\uXXXX` (ex.: `\xa0` em regex JS); confira com `grep -rl $'\xc2\xa0' ml app/src app/tests`.
- O pytest coleta como teste qualquer função cujo nome comece com `test`, inclusive `teste_...` em português dentro do pacote (`--doctest-modules` importa `src/`). Não nomeie funções do pacote começando com "teste".
- Script Python que reescreve arquivo no Windows grava CRLF: abra com `open(p, 'w', encoding='utf8', newline='')` (ou rode o Prettier depois) e confira com `git diff --stat` antes do commit.
- O `.gitignore` ignora qualquer pasta `build/` (inclusive `app/tests/build`): use outro nome para pastas versionadas.
- `openspec validate --strict` reprova requisito com mais de 500 caracteres; separe em requisitos menores. Nunca faça commit e push encadeados depois de um `verificar.sh` que falhou.
- A máquina de casa tem RTX 3050 (4 GB): não serve para o QLoRA do Qwen3-1.7B; o fine-tuning é só no Colab (T4/L4). `core.autocrlf` deve ficar `false` (o Prettier reprova CRLF).
- O Claude Code carrega também o CLAUDE.md da pasta pai: não coloque regras de outros projetos em `n3sandro/` (as antigas estão em `n3sandro/_referencia_regras_terram/`).
