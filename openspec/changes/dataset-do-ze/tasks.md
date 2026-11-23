# Tasks

## 1. Conversa com o Zé — Python (TDD)

- [x] 1.1 `conversa.py` — instrução de sistema e entradas das três tarefas: testes dos cenários (vaca fácil, arredondamento 0,345 → 35%, pergunta limpa) e dos erros `nivel_invalido` e `pergunta_invalida` → implementar
- [x] 1.2 Leitura da fala completa e por tarefa: testes de fala válida, texto fora das tags, veredito lido e charada sem prefixo → implementar
- [x] 1.3 Leitura progressiva: testes de "pensando", "respondendo", "completa" e pedaço de tag no fim → implementar

## 2. Conversa com o Zé — contrato e TypeScript (TDD)

- [x] 2.1 Gerar `contratos/conversa.json` (CLI de contratos) com teste de atualização
- [x] 2.2 `app/src/domain/ze/conversa.ts`: testes espelhando os cenários → implementar
- [x] 2.3 `tests/contrato-conversa.test.ts`: TypeScript reproduz o contrato; validar falhando com o contrato adulterado

## 3. Geração do dataset (TDD, Teacher falso)

- [x] 3.1 `ficha_tecnica.py`: testes da ficha sem e com `metricas_redes.json` e dos números permitidos → implementar
- [x] 3.2 `teacher.py`: testes do *checkpoint* (pula lotes gravados), das novas tentativas com espera crescente (relógio injetado) e do lote que falha → implementar
- [x] 3.3 `geracao_dataset.py` — pedidos de CHARADA (180) e casos de VEREDITO balanceados (80/80/80, completando com sintéticos): testes → implementar
- [x] 3.4 Evol-Instruct das perguntas (12 → 24 → 48, com origem): teste com Teacher falso → implementar
- [x] 3.5 `teacher_apis.py`: adaptadores Gemini e Groq, importação só com o extra; teste de que o pacote importa sem o extra instalado

## 4. Curadoria e exportação (TDD)

- [x] 4.1 `curadoria.py` — reparos (markdown, emoji) e filtros com os códigos da spec: um teste por código, reutilizando `vazamento` e `veredito` → implementar
- [x] 4.2 Desduplicação por Jaccard de trigramas na forma comparável: testes → implementar
- [x] 4.3 `exportacao_dataset.py` — separação estratificada, ShareGPT e ChatML: testes de proporção, mínimo de 3 por tarefa e ausência de vazamento entre treino e teste → implementar
- [x] 4.4 Relatório com volume mínimo (300 no total, 60 por tarefa) e charadas de reserva: testes → implementar

## 5. Notebook e ensaio

- [x] 5.1 Ensaio local da geração ponta a ponta com Teacher falso (respostas gravadas) e os artefatos do ensaio de treino; conferir os arquivos exportados
- [x] 5.2 Reescrever `notebooks/fontes/02_slm_destilacao_dataset.py` só orquestrando (instalação, chave, geração, curadoria, exportação, gráficos) e regenerar o `.ipynb`; nenhuma função de regra nas células

## 6. Verificação final

- [ ] 6.1 `bash scripts/verificar.sh` verde e `openspec validate --all --strict`

## Workflow follow-up

- O usuário (ou eu, com `GEMINI_API_KEY` no ambiente) executa a geração real; conferir no relatório o volume mínimo antes de arquivar.
- Arquivar a change depois do dataset aprovado.
