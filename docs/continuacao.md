# Continuação do trabalho (handoff entre sessões do Claude Code)

Atualizado em 25/11/2026 (manhã). Ver primeiro a seção **Estado em 25/11/2026 (manhã) — LEIA PRIMEIRO** no fim deste arquivo; as seções de estado anteriores ficam como histórico. Esta é a fonte para continuar em **outra máquina**: leia antes de qualquer coisa, junto com `CLAUDE.md`, `.claude/rules/`, `docs/roteiro.md` e `docs/decisoes.md`.

## Quem é o usuário e o que ele espera (antes só na memória local do Claude)

- Trabalho final de **Redes Neurais + Small Language Models** (Engenharia de Software, UniRV, prof. Sandro). Exposição no 5º Workshop de IA da FASOFT em **30/11/2026**, com votação popular. O cadastro do título e do escopo fecha em **27/11/2026**.
- Também é **projeto de portfólio** (LinkedIn): precisa parecer profissional. Ele quer nota alta nas duas matérias, principalmente em SLM.
- Exige: **SDD com OpenSpec** (spec aprovada por ele antes do código), **TDD** (teste falhando antes do código), arquitetura **hexagonal** no app e **núcleo funcional** testado no Python, contratos Python ↔ TypeScript e commits pequenos com o porquê no corpo. Ele interrompeu uma sessão que foi direto ao código sem spec, então **nunca pule a aprovação**.
- Antes de implementar, confirme o entendimento em 2 a 3 linhas. Converse em **português**.
- Remoto: `https://github.com/junin27/desenha-ai` (branch `main`). **Ele pediu que o GitHub fique sempre atualizado:** depois de cada commit com `bash scripts/verificar.sh` verde, `git push origin main`, sem `--force`. **Nunca encadeie commit e push depois de um `verificar.sh` que falhou** (aconteceu duas vezes nesta sessão e foi corrigido).
- **Só o Colab** para treinar (ele descartou o Kaggle depois de eu adaptar o notebook; a adaptação foi revertida em `0065517`). Baixar arquivos exige o OK dele antes (nome, origem e tamanho).
- Ele fala pouco e direto; espera que eu faça de ponta a ponta, teste de verdade (navegador, servidores reais) e diga com franqueza o que não consegui provar.

## Estado das changes (OpenSpec)

| Change | Estado | Próximo passo |
|---|---|---|
| pre-processamento-de-tracos, regras-da-rodada | arquivadas (specs vivas em `openspec/specs/`) | — |
| treino-das-redes | 17/17, **notebook 1 rodado no Colab em 24/11/2026**: CNN 92,4%, LSTM 92,8%, Ensemble 94,7% (top-3 99,3%), critério mínimo aprovado; resultados em `notebooks/resultados/modelos_redes/` | arquivar (critério batido) |
| dataset-do-ze | 18/18, **notebook 2 rodado em 24/11/2026**: 455 amostras aprovadas (CHARADA 161, VEREDITO 218, PERGUNTA 76), `suficiente: true` depois do reparo de marcação do Teacher (recuradoria offline do bruto do Drive, sem novas chamadas); resultado em `notebooks/resultados/dataset_slm/` (cavalo sem charada de reserva) | rodar o notebook 3; arquivar |
| fine-tuning-do-ze | 11/11, **ensaio do notebook 3 rodado em 24/11/2026** (pipeline e exportação GGUF ok: Q4_K_M real 1,107 GB; perplexidade 88,4 → 14,2; métricas em `notebooks/resultados/ensaio_metricas_slm.json`) | **rodar a rodada completa** (`MODO_ENSAIO = False`, T4, 40–60 min), baixar o GGUF do Drive (`desenha_ai_so/`), `preparar_demo.py --gguf-do-ze`; arquivar quando bater o critério |
| jogo-web | **18/18**, conferida no navegador e com o `llama-server` real (ensaio 23/11) | arquivar depois do ensaio com o Zé treinado |
| bancada-do-ze | **17/17**, conferida no navegador e com os dois `llama-server` | arquivar depois do ensaio com o Zé treinado |
| **demo-offline** | **11/11**, aprovada e implementada; ensaio real com o Qwen3 base (modo ensaio), ver `docs/capturas/README.md` | repetir o ensaio com o GGUF do Zé treinado (`preparar_demo.py --gguf-do-ze`), voltar o formato do Zé a ✗ e arquivar |

Para retomar, a próxima sessão deve: ler os arquivos acima, rodar `git log --oneline | head -30` e `bash scripts/verificar.sh` e confirmar o estado em 2 a 3 linhas. O que falta: rodar os notebooks 1, 2 e 3 no Colab (os `.ipynb` abrem menu de upload e botão "Salvar como"), preparar a demo com o GGUF do Zé, ensaio final, arquivar as changes, banner e pitch (`docs/banner.md` e `docs/pitch.md` ainda não existem) e cadastro do título até 27/11.

## Configurar outra máquina

```bash
git clone https://github.com/junin27/desenha-ai.git && cd desenha-ai
python -m venv ml/.venv            # Python >= 3.11
ml/.venv/Scripts/python -m pip install -e "ml[dev,treino]"  # o mypy precisa do torch/onnx do extra treino; Linux/macOS: ml/.venv/bin/python
cd app && npm install && cd ..       # `npm --prefix app` falha no Git Bash do Windows
git config core.autocrlf false        # o Git for Windows vem com true e o Prettier reprova CRLF
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

## O que está no GitHub e o que não está (24/11/2026)

- **Versionado** (para recomeçar em outra máquina): código, specs, notebooks (`.ipynb` já com menu de upload, botão "Salvar como", checagem de GPU e correção do `warmup_ratio`), `notebooks/resultados/` (redes ONNX treinadas, `modelos_redes.zip`, `dataset_slm.zip`, métricas, figuras) e o bruto do Teacher em `drive/dataset_ze/artefatos/`.
- **Fora do Git** (refazer ou baixar): `ml/dist/*.whl` (`ml/.venv/Scripts/python -m build --wheel ml`), `demo/` (`scripts/preparar_demo.py`), `saida/`, `ml/.venv`, `app/node_modules` e qualquer `*.gguf`. O GGUF do Zé treinado ainda não existe: sai da rodada completa do notebook 3, no Drive.
- Notebook 1 e 2 estão concluídos; falta só a rodada completa do notebook 3, depois a demo com o Zé treinado, o banner e o pitch (`docs/banner.md` e `docs/pitch.md` ainda não existem).

## Estado ao fim de 24/11/2026 (tarde) e o que falta

- **Concluído:** `jogo-web`, `bancada-do-ze`, `demo-offline` (11/11) e notebooks 1 e 2 (redes 94,7%; dataset suficiente com 455 amostras). O ensaio do notebook 3 passou (10 passos).
- **Bloqueio atual:** a **rodada completa do notebook 3** precisa de GPU, e o Colab não alocou T4/L4 (cota diária ou demanda: "Nenhum back-end com GPU disponível"; o `nvidia-smi` nem existe). Tentar de manhã cedo, ou Colab Pro. **Não aceitar "usar sem acelerador".** O notebook já vem em `MODO_ENSAIO = False`, abre menu de upload (`.whl`, `modelos_redes.zip`, `dataset_slm.zip`), confere a GPU na primeira célula e termina com o critério de aprovação (APROVADO/REPROVADO) e onde pegar o GGUF no Drive (`desenha_ai_so/`). Os arquivos de entrada estão no Git: `ml/dist` (gerar com `python -m build --wheel ml`), `notebooks/resultados/modelos_redes/modelos_redes.zip` e `notebooks/resultados/dataset_slm/dataset_slm.zip`.
- **Depois do GGUF** (colocar em `notebooks/resultados/` com o `metricas_slm.json`): `bash scripts/copiar_modelos.sh notebooks/resultados/modelos_redes ...`, `ml/.venv/Scripts/python scripts/preparar_demo.py --gguf-do-ze <gguf>`, ensaio real da demo (portas 8080/8081; um Apache do EDB PEM ocupa a 8080 na máquina dele, ver `docs/checklist_evento.md`), voltar a exigir o formato do Zé (✗ fora do modo ensaio), conferir o limite de 25 s por fala, arquivar as 6 changes (`/openspec-archive-change`).
- **Sem GPU também dá para:** escrever `docs/banner.md`, `docs/pitch.md` (não existem) e o texto do cadastro do título/escopo (**até 27/11**). Ensaio geral da demo em 29/11; evento em 30/11.
- **Opcional:** portas configuráveis da demo (muda a spec), capturas a 1366×768 da demo.

## Armadilhas novas (24/11/2026)

- `verificar.sh` falha no `openspec validate` se um requisito tiver mais de 500 caracteres: separe em requisitos menores.
- Um `sed -i 'Ns/.*/.../'` por número de linha já trocou a linha errada (derrubou uma asserção); prefira substituição por texto exato e rode os testes.
- O ruff formata depois de você editar: releia o trecho antes de uma substituição por texto.
- O Colab novo removeu `warmup_ratio` do `SFTConfig` (o notebook escolhe `warmup_ratio` ou `warmup_steps` pelos campos) e o Unsloth quer ser importado antes de trl/transformers/peft.
- `git status` pode listar centenas de arquivos como modificados por *cache* de `stat` depois de normalizar fim de linha; confirme com `git diff --stat` e `git diff --ignore-cr-at-eol`.

## Estado ao fim de 24/11/2026 (noite) — histórico

- **Feito hoje:** `docs/cadastro.md` (texto da planilha, prazo **27/11**), `docs/banner.md` e `docs/pitch.md` (com `[PENDENTE]` só nos números do Zé final). Git configurado só no repositório (`--local`, usuário junin27); nada global.
- **Colab liberou a T4 e a rodada completa do notebook 3 rodou, mas REPROVOU** (métricas em `notebooks/resultados/rodada1_reprovada/`): o destilado repetia frases até os 300 tokens (formato 32,6% contra 78,3% do base; CHARADA e VEREDITO 0%), embora a perplexidade tenha caído de 88,4 para 10,1. Causa: o Unsloth novo liga *packing* por padrão (363 conversas viraram 110 linhas, 21 passos) e o modelo não aprendeu a parar no `<|im_end|>`. **Corrigido em `a894ed4`** (`packing=False` no `SFTConfig`); ainda não provado.
- **Próximo passo:** rodar de novo o notebook 3 no Colab (T4, `MODO_ENSAIO = False`, mesmos 3 uploads; ~69 passos, ~12 min de treino + ~10 min de GGUF). Se der **APROVADO**: trazer `zedorabisco-1.7b-Q4_K_M.gguf` (pelo Drive) e `metricas_slm.json` para `notebooks/resultados/` e seguir a lista "Depois do GGUF" acima, mais preencher os `[PENDENTE]` de `docs/banner.md` e `docs/pitch.md` (% do veredito, tempo de treino, tokens/s). Se reprovar de novo: olhar os exemplos da célula de comparação (laço ou não fecha `</resposta>`?) antes de mexer em hiperparâmetros.
- **Contingência (limite: manhã de 28/11):** demo sem o Zé treinado, usando charadas/narrações de reserva; no banner, dataset + ensaio + quantização.
- **Com o usuário:** cadastro na planilha até 27/11, template oficial do banner, voz pt-BR (Microsoft Maria) no notebook do evento, impressão, ensaio em 29/11.
- O GGUF da rodada reprovada ficou no Drive (`desenha_ai_so/`); não usar.

## Estado em 25/11/2026 (madrugada) — histórico

- **Rodadas do notebook 3** (resultados em `notebooks/resultados/rodada{3,4,5}`, medições locais em `…/avaliacao_local/`; teste e validação congelados, mesmo SHA-256 desde a v3):
  - v5 (5 épocas): oficial formato 93,5%, CHARADA 75%, VEREDITO 90,9%, PERGUNTA 100%: reprovado.
  - v6 (treino revisado: veredito pela regra, charada sem a palavra no pensamento): oficial VEREDITO 100%, mas o GGUF **Q4** perdia o formato.
  - **v7** (v6 + abertura da charada sem "o que é, o que é", dataset `notebooks/resultados/dataset_slm_v3/`): **oficial APROVADO, 100% em formato, CHARADA, VEREDITO e PERGUNTA** (Colab, 16 bits, guloso).
- **GGUF do jogo:** o **Q4_K_M quebra o formato** da v7 (validação: formato 65%, VEREDITO 23%); o **Q8_0** (1,83 GB) não. Com temperatura 0,3 e sem penalidade (escolhido na validação: 100% / 93,8% / 95,5% / 100%), o teste deu formato 100%, CHARADA 81,2% (13/16, abaixo de 85% por uma charada; as 3 falhas vazam a palavra e o jogo troca pela reserva), VEREDITO 100%, PERGUNTA 100%, máximo de 17,8 s por fala. O teste do Q8 foi usado duas vezes: a primeira, com penalidade 1,1, revelou o "VEREDITO: PELADO" (a penalidade punia repetir o rótulo).
- **Feito nesta sessão:** charada sem vazamento na tela; parâmetros corrigidos (1,72 bi, LoRA 1,01%, FP16 3,44 GB) no notebook e no banner; revisão offline do treino (`scripts/revisar_dataset.py`); jogo com temperatura 0,3 e sem penalidade; `docs/cadastro.md` com os campos do formulário e o padrão da planilha do professor (repetição = vermelho).
- **Próximo passo:** change na demo-offline para usar o GGUF Q8_0 (hoje `preparar_demo.py` grava o Zé com o nome `…Q4_K_M.gguf`); `preparar_demo.py --gguf-do-ze notebooks/resultados/rodada5/zedorabisco-1.7b-Q8_0.gguf`; ensaio real; voltar o formato do Zé a ✗ no checklist; preencher os `[PENDENTE]` de banner e pitch; arquivar as 6 changes. Cadastro no formulário até 27/11 (com o usuário).

## Estado em 25/11/2026 (manhã) — LEIA PRIMEIRO

**A parte técnica está pronta.** O Zé v7 foi aprovado no critério oficial (100% em formato, CHARADA, VEREDITO e PERGUNTA) e a demo com o GGUF **Q8_0** passou no ensaio real: `conferir_demo.py` deu "Pronto para o evento" e uma partida de 3 rodadas rodou no navegador, com a comparação base × destilado (detalhes em `docs/capturas/README.md`). Treino, dataset e avaliação estão encerrados.

### Próxima sessão: só visual e experiência do usuário

O usuário vai trabalhar no **design, na experiência do usuário e em funcionalidades para o visitante**, **sem mexer em treinamento, dataset, avaliação nem no Zé**. Regras que continuam valendo:
- Comportamento novo ou alterado da interface passa por OpenSpec (proposta aprovada por ele antes do código) e TDD. As specs da interface estão em `openspec/changes/jogo-web/specs/` (`interface-do-jogo`, `partida`, `palpites-ao-vivo`, `placar-local`) e `openspec/changes/bancada-do-ze/specs/` (voz, "Pergunte ao Zé", comparação). Como essas changes ainda não foram arquivadas, ajuste os deltas delas ou crie uma change nova de interface.
- A mudança fica na camada `app/src/presentation/` (e em `application/` só se for caso de uso novo); o teste de arquitetura reprova import proibido.
- Requisitos que a interface tem de manter: tudo **offline** (nada de CDN, fonte externa ou endereço externo: o teste do build reprova), fonte ≥ 24 px no texto do jogo, caber sem rolagem em **1366×768** e 1920×1080, tela da charada só com "Pensando…" enquanto o Zé gera (não mostrar o raciocínio: ele cita a palavra secreta).
- **Jogar sem o Zé, só para mexer no visual:** `bash scripts/copiar_modelos.sh notebooks/resultados/modelos_redes/modelos_redes.zip notebooks/resultados/dataset_slm/charadas_reserva.json notebooks/resultados/rodada5/metricas_slm.json` (as métricas da v7 estão no Git), depois `cd app && npm run dev`. Sem `llama-server` o jogo usa a reserva (charadas e narrações prontas), o que basta para o visual.
- **Jogar com o Zé:** os GGUF não estão no Git (≈ 1,8 GB cada). Copie `notebooks/resultados/rodada5/zedorabisco-1.7b-Q8_0.gguf` da máquina de casa (pendrive ou Drive) e rode `ml/.venv/Scripts/python scripts/preparar_demo.py --gguf-do-ze <caminho>` (baixa o llama.cpp e o Qwen3 base Q8_0, ~1,8 GB, com a permissão do usuário).

### Pendências anotadas (não são para agora)

1. **Antes de enviar o cadastro (prazo 27/11):** `docs/cadastro.md` diz "quantizado em 4 bits", mas o evento usa o GGUF **Q8_0** (8 bits); o treino é QLoRA sobre o modelo em 4 bits (NF4). Corrigir o texto antes do envio, porque o escopo não muda depois do prazo. A mesma correção vale para `docs/banner.md`, `docs/pitch.md` e o cabeçalho do `CLAUDE.md` ("GGUF 4 bits").
2. **Banner e pitch:** preencher os 6 `[PENDENTE]` com os números da v7: oficial base × destilado (formato 78,3% → 100%; CHARADA, VEREDITO 0% → 100%; PERGUNTA 62,5% → 100%), treino de 6,4 min na T4, ~11 tokens/s no Q8_0 nesta máquina, e o GGUF do jogo no teste (formato 100%, CHARADA 81,2%, VEREDITO 100%, PERGUNTA 100%). Dizer na banca que o teste foi consultado mais de uma vez e que a curva de validação estabiliza a partir da 3ª época (sobreajuste leve nas épocas 4 e 5).
3. **Arquivar as 6 changes** (`/openspec-archive-change`): `treino-das-redes`, `dataset-do-ze`, `fine-tuning-do-ze`, `jogo-web`, `bancada-do-ze`, `demo-offline` (as 6 aparecem como Complete no `openspec list`). Se a próxima sessão mexer na interface antes disso, arquivar depois.
4. **Com o usuário:** enviar o formulário (um envio só; nomes exatos das disciplinas, ver `docs/cadastro.md`), encaixar o texto no modelo oficial de banner, ensaio de 29/11 no notebook do evento (tela cheia do `Iniciar Desenha Aí.bat`, Wi-Fi desligado, porta 8080 livre: o serviço `PEMHTTPD-x64` do EDB PEM ocupa a 8080 na máquina de casa, `Stop-Service PEMHTTPD-x64` como administrador), voz pt-BR.
5. **Opcional:** guardar o modelo da 3ª época (menor perda de validação) exigiria outra rodada no Colab com *checkpoints*; não recomendado antes do evento.

### Arquivos grandes (Git LFS) e o que ficou fora do Git — 25/11/2026

- Os **GGUF de todas as rodadas** (v3 a v7, Q4_K_M e o **Q8_0 do evento** em `notebooks/resultados/rodada5/`) e o zip baixado do Drive estão no GitHub por **Git LFS** (~7,4 GB). Na outra máquina: `git lfs install` uma vez; `git clone`/`git pull` baixa tudo. Para o trabalho só de visual, dá para pular os modelos: `GIT_LFS_SKIP_SMUDGE=1 git pull` (os GGUF ficam como ponteiros) e, quando precisar do Zé, `git lfs pull --include "notebooks/resultados/rodada5/zedorabisco-1.7b-Q8_0.gguf"`.
- O wheel do `desenha_ml` está versionado em `ml/dist/` e as cópias do dataset do Drive em `drive/dataset_ze/`; o diagnóstico do Codex que orientou as rodadas v6 e v7 está em `docs/diagnostico_codex.md`.
- **Fora do Git de propósito:** `PROJETOS VALIDADOS - 24_11.xlsx` (tem nome e e-mail de outros alunos e o repositório é público; o padrão de aprovação está resumido em `docs/cadastro.md`), `demo/` (gerada por `preparar_demo.py`), `.venv` e `node_modules`.
