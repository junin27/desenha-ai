# Proposal

## Why

O dataset destilado (change `dataset-do-ze`) só vira o Zé do Rabisco depois do fine-tuning do Qwen3-1.7B com QLoRA, da prova de que ele ficou melhor que o modelo base e da compressão para 4 bits, para rodar em CPU no evento. Hoje existe só o rascunho do notebook 3: o prompt de inferência está montado à mão numa célula (e o jogo precisará do mesmo texto), a avaliação base × destilado tem cópias próprias das regras e não há critério de aprovação. Sem um critério objetivo, não há como afirmar no banner que o fine-tuning funcionou.

**Disciplina:** SLM (arquitetura Qwen3, QLoRA, *loss masking*, avaliação do Student, quantização GGUF), com a conta de memória da atividade 1 aplicada ao modelo real.

## What Changes

- **Prompt de inferência do Qwen3** (Python e TypeScript, com contrato): texto ChatML exato, com o *thinking* nativo desligado (`<think>` vazio) e `<|im_end|>` como parada. O texto de treino é esse prompt + a resposta + `<|im_end|>`.
- **Avaliação do Zé** no conjunto de teste, para o modelo base e o destilado: métricas verificáveis que reaproveitam a curadoria (formato, charada sem vazar, veredito correto, pergunta sem número inventado), tokens gerados e perplexidade.
- **Critério de aprovação** do Zé destilado, com metas mínimas e a exigência de ser melhor que o base no formato.
- **Tabela de quantização** teórica (FP32, FP16, INT8, INT4) × tamanho real dos GGUF, com a margem dentro dos 2,8 GB livres (atividade 1).
- **Notebook 3** regenerado para só orquestrar: QLoRA no Unsloth, avaliação, GGUF Q4_K_M e Q8_0, artefatos; e um **modo ensaio** curto (poucos passos e poucos exemplos) para validar o Colab em minutos antes da rodada completa.

### Fora do escopo

- Baixar o GGUF do Qwen3 base e subir o `llama-server`: change `demo-offline`.
- Chamar o `llama-server` a partir do jogo: change `jogo-web` (aqui entra só o texto do prompt em TypeScript).
- Destilação por *logits* (KL) e DPO/RLHF.
- Busca de hiperparâmetros: usamos uma configuração única e documentada.

## Capabilities

### New Capabilities

- `modelo-do-ze`: define o prompt de inferência do Zé (igual no treino e no jogo), como ele é avaliado contra o modelo base, o critério para aceitar o fine-tuning e os artefatos quantizados entregues para o evento.

### Modified Capabilities

(nenhuma)

## Impact

- **Novo código Python:** `ml/src/desenha_ml/{prompt_qwen,avaliacao_do_ze,quantizacao}.py` e a extensão da CLI de contratos.
- **Novo código TypeScript:** `app/src/domain/ze/prompt.ts`.
- **Contrato:** `contratos/prompt_qwen.json`.
- **Execução:** o notebook 3 exige GPU (Colab T4); cerca de 40 a 60 min na rodada completa, incluindo a exportação GGUF, e cerca de 10 min no modo ensaio.
- **Depende de:** `dataset_slm.zip` (change `dataset-do-ze`). O treino real só começa depois que o dataset for marcado como suficiente.
