# Tasks

## 1. Dados (TDD, sem torch)

- [x] 1.1 `dados.py` — separação por categoria: testes dos blocos sem sobreposição e de `dados_insuficientes` → implementar
- [x] 1.2 Montagem dos exemplos: testes de reprodutibilidade com semente, frações em [0,3; 0,9], espessura em [1,2; 2,0] e validação/teste sem sorteio → implementar sobre o pré-processamento existente
- [x] 1.3 Empacotamento das sequências (padding + comprimentos): testes de forma e de corte em 130 → implementar

## 2. Avaliação (TDD, sem torch)

- [x] 2.1 `avaliacao.py`: testes de acurácia, F1 macro (cenário 0,7778), top-3 e matriz de confusão → implementar
- [x] 2.2 Escolha de `w_cnn`: teste do empate que favorece o peso mais próximo de 0,5 → implementar (grade `i / 20`)
- [x] 2.3 Curva antecipada e critério mínimo: testes de aprovação/reprovação com a mensagem do critério → implementar

## 3. Artefatos (TDD, sem torch)

- [x] 3.1 `artefatos.py`: testes de `classes.json` (30 categorias em ordem, `w_cnn`, parâmetros do pré-processamento) e de `metricas_redes.json` → implementar
- [x] 3.2 `predicoes_validacao.json`: testes de frações em partes iguais, ≥ 1.200 casos e top-5 na ordem do `top_k` → implementar
- [x] 3.3 `teste_paridade_redes.json`: teste do formato (8 desenhos, traços, probabilidades esperadas) → implementar

## 4. Redes (TDD com torch CPU)

- [ ] 4.1 Instalar o extra `[treino]` no `ml/.venv` (torch CPU, onnx) e marcar os testes de redes para serem pulados quando o torch não estiver instalado
- [ ] 4.2 `redes.py` — arquiteturas: testes de forma [4, 30] e soma 1 ± 1e-5 → implementar
- [ ] 4.3 Laço de treino e previsão em lote: teste de que a perda cai em um mini-dataset sintético → implementar
- [ ] 4.4 Exportação ONNX + conferência com `ReferenceEvaluator`: testes com sequências de 5 e 130 pontos (≤ 1e-4) → implementar com *fallback* de exportador

## 5. Ensaio local e Colab

- [ ] 5.1 `scripts/ensaio_treino_local.py`: baixa 300 desenhos por categoria, treina 2 épocas, gera os artefatos e confere o ONNX; executar e registrar o tempo e as métricas do ensaio no `design.md`
- [ ] 5.2 Reescrever `notebooks/fontes/01_redes_neurais_cnn_lstm.py` usando o pacote (download, treino na GPU, gráficos, critério mínimo, zip dos artefatos) e regenerar o `.ipynb`; verificar que nenhuma célula define regra (só chamadas ao pacote)
- [ ] 5.3 Gerar o wheel (`ml/dist/`) e documentar no README o passo a passo do Colab

## 6. Verificação final

- [ ] 6.1 `bash scripts/verificar.sh` verde (inclui os testes de redes com torch CPU)

## Workflow follow-up

- O usuário roda o notebook 1 no Colab (GPU T4) e devolve `modelos_redes.zip`; conferir o critério mínimo antes de arquivar.
- Arquivar a change depois do treino aprovado.
