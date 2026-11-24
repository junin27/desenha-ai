# Continuação do trabalho (handoff entre sessões do Claude Code)

Atualizado em 23/11/2026, ao fim da sessão que implementou a `demo-offline` (depois da `jogo-web` e da `bancada-do-ze`). Esta é a fonte para continuar em **outra máquina**: leia antes de qualquer coisa, junto com `CLAUDE.md`, `.claude/rules/`, `docs/roteiro.md` e `docs/decisoes.md`.

## Quem é o usuário e o que ele espera (antes só na memória local do Claude)

- Trabalho final de **Redes Neurais + Small Language Models** (Engenharia de Software, UniRV, prof. Sandro). Exposição no 5º Workshop de IA da FASOFT em **30/11/2026**, com votação popular. O cadastro do título e do escopo fecha em **27/11/2026**.
- Também é **projeto de portfólio** (LinkedIn): precisa parecer profissional. Ele quer nota alta nas duas matérias, principalmente em SLM.
- Exige: **SDD com OpenSpec** (spec aprovada por ele antes do código), **TDD** (teste falhando antes do código), arquitetura **hexagonal** no app e **núcleo funcional** testado no Python, contratos Python ↔ TypeScript e commits pequenos com o porquê no corpo. Ele interrompeu uma sessão que foi direto ao código sem spec, então **nunca pule a aprovação**.
- Antes de implementar, confirme o entendimento em 2 a 3 linhas. Converse em **português**.
- Remoto: `https://github.com/junin27/desenha-ai` (branch `main`). **Push só quando ele pedir.**

## Estado das changes (OpenSpec)

| Change | Estado | Próximo passo |
|---|---|---|
| pre-processamento-de-tracos, regras-da-rodada | arquivadas (specs vivas em `openspec/specs/`) | — |
| treino-das-redes | 17/17, **notebook 1 rodado no Colab em 24/11/2026**: CNN 92,4%, LSTM 92,8%, Ensemble 94,7% (top-3 99,3%), critério mínimo aprovado; resultados em `notebooks/resultados/modelos_redes/` | arquivar (critério batido) |
| dataset-do-ze | 18/18 | rodar o notebook 2 com `GEMINI_API_KEY`; arquivar quando o volume for suficiente |
| fine-tuning-do-ze | 11/11 | rodar o notebook 3 (ensaio, depois completo); arquivar quando bater o critério |
| jogo-web | **18/18**, conferida no navegador e com o `llama-server` real (ensaio 23/11) | arquivar depois do ensaio com o Zé treinado |
| bancada-do-ze | **17/17**, conferida no navegador e com os dois `llama-server` | arquivar depois do ensaio com o Zé treinado |
| **demo-offline** | **11/11**, aprovada e implementada; ensaio real com o Qwen3 base (modo ensaio), ver `docs/capturas/README.md` | repetir o ensaio com o GGUF do Zé treinado (`preparar_demo.py --gguf-do-ze`), voltar o formato do Zé a ✗ e arquivar |

Para retomar, a próxima sessão deve: ler os arquivos acima, rodar `git log --oneline | head -30` e `bash scripts/verificar.sh` e confirmar o estado em 2 a 3 linhas. O que falta: rodar os notebooks 1, 2 e 3 no Colab (os `.ipynb` abrem menu de upload e botão "Salvar como"), preparar a demo com o GGUF do Zé, ensaio final, arquivar as changes, banner e pitch (`docs/banner.md` e `docs/pitch.md` ainda não existem) e cadastro do título até 27/11.

## Configurar outra máquina

```bash
git clone https://github.com/junin27/desenha-ai.git && cd desenha-ai
python -m venv ml/.venv            # Python >= 3.11
ml/.venv/Scripts/python -m pip install -e "ml[dev]"        # Linux/macOS: ml/.venv/bin/python
npm --prefix app install
npm install -g @fission-ai/openspec   # CLI do OpenSpec (openspec validate/list/instructions)
bash scripts/verificar.sh             # tem de terminar com "OK: verificação completa passou."
```

- **Fora do Git** (são gerados ou baixados): `saida/` (artefatos de ensaio), `app/public/modelos/`, `app/dist/`, `*.gguf`, `*.zip` e `demo/`. Sem `saida/ensaio`, os testes de paridade ONNX são **pulados** (e não reprovados). Para recriar:
  - redes de ensaio: `ml/.venv/Scripts/python -m pip install -e "ml[dev,treino]"` e `ml/.venv/Scripts/python scripts/ensaio_treino_local.py` (ver o README);
  - dataset de ensaio: `ml/.venv/Scripts/python scripts/ensaio_dataset_local.py --redes saida/ensaio --saida saida/dataset_ensaio`.
- **Jogar localmente:** `bash scripts/copiar_modelos.sh` (ensaio ou o zip do Colab), `npm --prefix app run build` e `npm --prefix app run preview` (porta 4173). `?ze=` troca o endereço do Zé destilado (padrão 8080) e `?zebase=` o do Qwen3 base (padrão 8081). O painel técnico abre com F2. Ctrl+Shift+Z zera o placar na tela de início.
- As skills do OpenSpec estão em `.claude/skills/` e `.agents/skills/`, versionadas. Se o Claude Code não as listar, siga o `SKILL.md` à mão, como foi feito nesta sessão.

## O que foi feito nesta sessão (resumo)

- **jogo-web:** partida (máquina de estados imutável), palpites ao vivo com ONNX no navegador, narrador por *streaming* com reserva, placar no `localStorage`, telas, autoteste de paridade e build sem endereços externos (lista fechada de textos de terceiros, aprovada pelo usuário). Um bug achado jogando foi corrigido: a narração dizia "n" em vez de "nada".
- **bancada-do-ze:** voz local pt-BR com botão, "Pergunte ao Zé" com bloqueio de ofensas, narrador alternável base × destilado com selo e painel técnico (F2) com medições e métricas do treino.
- Capturas e o que foi conferido em `docs/capturas/README.md`.

## Pendências e observações

- **Voz:** o Windows desta máquina só tem a "Microsoft Zira" (en-US). Para o Zé falar, instale "Português (Brasil)" com a voz **Microsoft Maria** em Configurações → Hora e idioma → Fala.
- **Painel a 1366×768:** quando aberto, cobre a coluna dos palpites e o botão Pronto (F2 fecha). Dá para estreitá-lo, se ele quiser.
- **Memória:** com ~3 GB livres, o Qwen3 base pode não subir junto com o destilado (a proposta da demo-offline trata disso).
- **Cronograma** (`docs/roteiro.md`): cadastro do título até 27/11; banner, pitch e ensaio em 29/11.

## Armadilhas (também no CLAUDE.md)

- A ferramenta de edição converte `\uXXXX` em caracteres reais. Gere esses textos com `chr()` num script e confira com `grep -rl $'\xc2\xa0' ml app/src app/tests`.
- O Python do Windows grava CRLF: use `open(p, 'w', encoding='utf8', newline='')` e confira `git diff --stat` antes do commit.
- O `.gitignore` ignora qualquer pasta `build/`.
- Use `set -o pipefail` antes de `| tail`, senão uma falha passa despercebida.
- O mypy precisa de `--config-file ml/pyproject.toml`.
- Não nomeie funções do pacote começando com "teste" (o pytest coleta como teste).
- Heredoc do bash com `\n` dentro de strings Python vira quebra de linha real: prefira escrever o script num arquivo.
