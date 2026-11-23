# Design

## Context

O rascunho `notebooks/fontes/03_slm_finetuning_qlora_gguf.py` já tem a sequência Unsloth (carregar em 4 bits, LoRA, `SFTTrainer`, `train_on_responses_only`, `save_pretrained_gguf`), mas monta o prompt numa célula, repete as regras de avaliação (vazamento, veredito, números) e fixa o número de parâmetros (2,03 × 10⁹) à mão. O pacote já tem `conversa` (entradas e leitura da fala), `curadoria` (filtros com códigos) e o padrão de contrato. Esta máquina não tem GPU NVIDIA, então o treino só roda no Colab. Motivação em `proposal.md`.

## Goals / Non-Goals

**Goals:**
- Prompt único (Python = TypeScript), provado por contrato.
- Avaliação base × destilado com as **mesmas** regras da curadoria, testável localmente com saídas falsas.
- Notebook sem lógica própria, com modo ensaio para falhar cedo.

**Non-Goals:**
- Rodar o Unsloth localmente (sem GPU NVIDIA). A parte com GPU é validada pelo modo ensaio no Colab.

## Decisions

### D1 — Módulos
| Módulo | Responsabilidade |
|---|---|
| `prompt_qwen.py` | prompt de inferência e texto de treino (ChatML do Qwen3, *thinking* desligado) |
| `avaliacao_do_ze.py` | avalia uma saída (formato + tarefa) reutilizando os filtros da curadoria; agrega taxas por modelo e tarefa; critério de aprovação |
| `quantizacao.py` | tabela teórica FP32/FP16/INT8/INT4 × GGUF real, margem nos 2,8 GB |
| `app/src/domain/ze/prompt.ts` | espelho do prompt para o jogo |

### D2 — Reaproveitar a curadoria na avaliação
A curadoria já decide, para uma fala, o primeiro código de rejeição. A avaliação expõe `avaliar_saida(registro, saida, ficha) -> AvaliacaoDaSaida(formato_ok, tarefa_ok, codigo)` chamando as mesmas funções de filtro (extraídas da curadoria para funções públicas), sem desduplicação, que não se aplica a saídas de modelo. Os filtros comuns de tamanho do pensamento e recusa **não** contam contra a tarefa: o critério mede formato e cumprimento da tarefa, não o estilo do raciocínio.
- **Alternativa descartada:** métricas próprias no notebook (era o rascunho; divergiria da curadoria).

### D3 — Configuração do treino (sem busca)
Qwen3-1.7B (`unsloth/Qwen3-1.7B`) em 4 bits NF4; LoRA r = 16, α = 16, dropout 0 em `q,k,v,o,gate,up,down`; 3 épocas; lr 2e-4 cosseno com 5% de aquecimento; lote efetivo 16 (4 × 4 de acumulação); `adamw_8bit`; avaliação na validação a cada 10 passos. Geração da avaliação: gulosa (`do_sample=False`), até 300 tokens novos. Modo ensaio: `max_steps=10` e 15 exemplos de teste.
- **Alternativa descartada:** Qwen3-0.6B. É mais rápido em CPU, mas tem menos capacidade de seguir o formato; fica como plano B se a latência no evento for ruim (troca só uma constante).

### D4 — Número de parâmetros medido, não fixado (revisado na implementação)
A tabela de quantização usa o total de parâmetros medido, e não um número escrito à mão. Contar no modelo carregado não funciona: em 4 bits o `numel()` conta valores empacotados (dois pesos por byte) e daria metade. A contagem vem dos metadados safetensors do modelo original no Hugging Face (`get_safetensors_metadata("Qwen/Qwen3-1.7B").parameter_count`). O cenário da spec (2,03 × 10⁹) é só um exemplo para testar a conta.

### D6 — Única função no notebook
`gerar_respostas` (laço de geração em lote na GPU) é a única função definida no notebook 3: é infraestrutura de inferência com o modelo do Unsloth, sem regra; toda decisão (formato, tarefa, critério, quantização) vem do pacote.

### D5 — Exportação
`save_pretrained_gguf(..., quantization_method=["q4_k_m", "q8_0"])`, copiado para o Drive (`MyDrive/desenha_ai_so/`), porque o download direto de mais de 1 GB pelo navegador costuma falhar. O Q8_0 serve só para a tabela (comparação real de tamanho); o evento usa o Q4_K_M.

## Risks / Trade-offs

- [API do Unsloth/TRL muda (ex.: `tokenizer` → `processing_class`, `max_seq_length` → `max_length`)] → modo ensaio primeiro; as chamadas ficam numa célula curta, fácil de ajustar; versões registradas no relatório.
- [Destilado reprovado] → o relatório diz qual critério falhou; os planos são gerar mais dados da tarefa fraca (o *checkpoint* do dataset permite acrescentar) ou treinar mais uma época.
- [Exportação GGUF lenta ou falhando no Colab] → o modo ensaio já exercita a exportação; se falhar, salvar o modelo *merged* em 16 bits no Drive e converter depois com o llama.cpp.
- [Perplexidade alta por causa do formato com tags] → é uma métrica complementar; o critério usa as métricas verificáveis.
