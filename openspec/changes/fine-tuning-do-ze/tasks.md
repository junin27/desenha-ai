# Tasks

## 1. Prompt do Qwen3 (TDD)

- [x] 1.1 `prompt_qwen.py`: testes do prompt de inferência (cenário da charada) e do texto de treino (começa pelo prompt, termina em `</resposta><|im_end|>\n`) → implementar
- [ ] 1.2 Contrato `contratos/prompt_qwen.json` (prompts das três tarefas) com teste de atualização
- [ ] 1.3 `app/src/domain/ze/prompt.ts` + `tests/contrato-prompt.test.ts`: TypeScript reproduz o contrato; validar falhando com o contrato adulterado

## 2. Avaliação do Zé (TDD)

- [ ] 2.1 Extrair da curadoria os filtros por tarefa como funções públicas, sem mudar o comportamento (testes da curadoria continuam verdes)
- [ ] 2.2 `avaliacao_do_ze.py` — `avaliar_saida`: testes de saída fora do formato, veredito correto, charada que vaza e pergunta com número inventado → implementar
- [ ] 2.3 Agregação por modelo e tarefa (taxas e tokens médios): testes → implementar
- [ ] 2.4 Critério de aprovação: testes dos cenários aprovado e reprovado no veredito (mensagem "VEREDITO: 84,0% < 90%") e do modo ensaio (critério não aplicado) → implementar

## 3. Quantização (TDD)

- [ ] 3.1 `quantizacao.py`: teste do cenário de 2,03 × 10⁹ parâmetros (8,12 / 4,06 / 2,03 / 1,015 GB, cabe/margem) e da junção com os tamanhos reais dos GGUF → implementar

## 4. Notebook 3

- [ ] 4.1 Reescrever `notebooks/fontes/03_slm_finetuning_qlora_gguf.py` só orquestrando (modo ensaio, Unsloth, conferência do *loss masking*, avaliação base × destilado, perplexidade, GGUF, tabela, artefatos no Drive) e regenerar o `.ipynb`; nenhuma função de regra nas células
- [ ] 4.2 Regenerar o wheel e documentar no README o passo a passo do notebook 3 (modo ensaio primeiro)

## 5. Verificação final

- [ ] 5.1 `bash scripts/verificar.sh` verde e `openspec validate --all --strict`

## Workflow follow-up

- O usuário roda o notebook 3 no Colab: primeiro no modo ensaio, depois na rodada completa; conferir o critério de aprovação em `metricas_slm.json` antes de arquivar.
