# Continuação do trabalho (handoff entre sessões do Claude Code)

Atualizado em 23/11/2026, no fim da sessão anterior.

## Estado

- Projeto: jogo "Desenha Aí, Sô!" (trabalho final de Redes Neurais + SLM, UniRV; evento em 30/11/2026; cadastro do título até 27/11). Também é projeto de portfólio: TDD, SDD com OpenSpec, arquitetura hexagonal no app e núcleo funcional no Python.
- Regras de trabalho: `CLAUDE.md` e `.claude/rules/`. Decisões: `docs/decisoes.md`. Roteiro: `docs/roteiro.md`.
- Git só local, com 85 commits. Nunca fazer push. Commits pequenos, com o corpo explicando o porquê e terminando com `Co-Authored-By`.
- Verificação completa: `bash scripts/verificar.sh` (329 testes Python e 151 TypeScript, todos verdes).

## Changes

| Change | Estado |
|---|---|
| pre-processamento-de-tracos, regras-da-rodada | arquivadas (specs vivas em `openspec/specs/`) |
| treino-das-redes | 17/17 tarefas; falta o usuário rodar o notebook 1 no Colab; arquivar depois do critério mínimo |
| dataset-do-ze | 18/18; falta rodar o notebook 2 com GEMINI_API_KEY; arquivar depois do volume suficiente |
| fine-tuning-do-ze | 11/11; falta rodar o notebook 3 (ensaio, depois completo); arquivar depois do critério de aprovação |
| **jogo-web** | **proposta APROVADA pelo usuário, 0/18 tarefas — próximo passo: implementar** |
| bancada-do-ze | a propor: voz do Zé (speechSynthesis offline, com botão liga/desliga), Pergunte ao Zé, Zé base × destilado, painel técnico (todos aprovados pelo usuário) |
| demo-offline | a propor: scripts do llama-server (base e destilado), modelos, início com um clique, checklist |

## Armadilhas (também no CLAUDE.md)

- A ferramenta de edição converte `\uXXXX` em caracteres reais. Gere esses textos com `chr()` num script e confira com `grep -rl $'\xc2\xa0' ml app/src app/tests`.
- Use `set -o pipefail` antes de `| tail`, senão uma falha passa despercebida.
- O mypy precisa de `--config-file ml/pyproject.toml`.
- Não nomeie funções do pacote começando com "teste" (o pytest coleta como teste).
- Heredoc do bash com `\n` dentro de strings Python vira quebra de linha real: prefira escrever o script num arquivo.
- Artefatos de ensaio estão em `saida/ensaio` (redes) e `saida/dataset_ensaio` (fora do Git).
