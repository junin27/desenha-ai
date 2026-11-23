# Spec Delta

## Purpose

Garantir que o Zé do Rabisco destilado recebe no jogo exatamente o prompt com que foi treinado, que ele só é aceito se for comprovadamente melhor que o modelo base nas tarefas do jogo, e que é entregue quantizado em 4 bits, cabendo na memória de um notebook comum.

## ADDED Requirements

### Requirement: Prompt de inferência do Qwen3
O prompt SHALL ser, nesta ordem: `<|im_start|>system\n` + instrução de sistema + `<|im_end|>\n<|im_start|>user\n` + entrada da tarefa + `<|im_end|>\n<|im_start|>assistant\n<think>\n\n</think>\n\n`. O bloco `<think>` vazio desliga o *thinking mode* nativo do Qwen3 (o raciocínio do Zé fica em `<pensamento>`). A geração SHALL parar em `<|im_end|>`.

#### Scenario: Prompt de uma charada
- **WHEN** a entrada é "TAREFA: CHARADA\nPalavra secreta: vaca\nNível: fácil"
- **THEN** o prompt termina em "Nível: fácil<|im_end|>\n<|im_start|>assistant\n<think>\n\n</think>\n\n"

### Requirement: Texto de treino com perda só na resposta
O texto de treino de cada exemplo SHALL ser o prompt de inferência seguido da resposta do Teacher e de `<|im_end|>\n`. A perda do treino SHALL considerar só os tokens depois de `<|im_start|>assistant\n`, e o notebook SHALL conferir isso num exemplo antes de treinar.

#### Scenario: Prompt e treino coerentes
- **WHEN** o texto de treino de um exemplo é montado
- **THEN** ele começa exatamente pelo prompt de inferência do mesmo exemplo e termina em "</resposta><|im_end|>\n"

### Requirement: Contrato do prompt
O Python SHALL gerar `contratos/prompt_qwen.json` com prompts das três tarefas, e o TypeScript SHALL montar prompts idênticos caractere por caractere.

#### Scenario: Jogo monta o mesmo prompt do treino
- **WHEN** os testes do app rodam sobre `contratos/prompt_qwen.json`
- **THEN** todos os prompts são idênticos aos do Python

### Requirement: Métricas verificáveis no teste
Para cada saída do conjunto de teste, de cada modelo (base e destilado), a avaliação SHALL registrar se a fala tem o formato válido e se cumpre a tarefa pelas mesmas regras da curadoria da spec `dataset-do-ze`: CHARADA com o prefixo, sem vazar a palavra e com tamanho válido; VEREDITO igual à regra; PERGUNTA sem número fora da ficha e com tamanho válido. As taxas SHALL ser informadas no total e por tarefa, junto com a média de tokens gerados.

#### Scenario: Saída do modelo fora do formato
- **WHEN** o modelo base responde "Claro! A charada é: muuu" sem as tags
- **THEN** essa saída conta como formato inválido e tarefa não cumprida

#### Scenario: Veredito correto
- **WHEN** a regra do caso é QUASE e o destilado responde VEREDITO: QUASE com narração
- **THEN** a saída conta como formato válido e tarefa cumprida

### Requirement: Critério de aprovação do Zé destilado
O fine-tuning SHALL ser aceito somente se, no teste, o destilado tiver: formato válido ≥ 95%; CHARADA cumprida ≥ 85%; VEREDITO correto ≥ 90%; PERGUNTA cumprida ≥ 85%; e formato válido maior que o do modelo base. Caso contrário, o relatório SHALL marcar reprovado e listar cada critério não atingido.

#### Scenario: Aprovado
- **WHEN** o destilado tem formato 98%, charada 90%, veredito 93%, pergunta 88% e o base tem formato 20%
- **THEN** o fine-tuning é aprovado

#### Scenario: Reprovado no veredito
- **WHEN** o destilado tem veredito correto 84% e os demais critérios atingidos
- **THEN** o fine-tuning é reprovado com o motivo "VEREDITO: 84,0% < 90%"

### Requirement: Tabela de quantização
A avaliação SHALL calcular a memória teórica dos pesos (parâmetros × bytes por parâmetro) em FP32 (4), FP16/BF16 (2), INT8 (1) e INT4 (0,5), em GB decimais, indicar se cabe em 2,8 GB livres (4 GB − 1,2 GB do sistema) com a margem restante, e mostrar ao lado o tamanho real dos arquivos GGUF Q8_0 e Q4_K_M gerados.

#### Scenario: Modelo de 2,03 bilhões de parâmetros
- **WHEN** a tabela é calculada para 2,03 × 10⁹ parâmetros
- **THEN** FP32 = 8,12 GB (não cabe), FP16 = 4,06 GB (não cabe), INT8 = 2,03 GB (cabe, margem 0,77 GB) e INT4 = 1,015 GB (cabe, margem 1,785 GB)

### Requirement: Artefatos do modelo
O notebook SHALL entregar o GGUF Q4_K_M do Zé destilado (o que roda no evento), `metricas_slm.json` (métricas por modelo e tarefa, perplexidade de validação base × destilado, critério de aprovação, tabela de quantização, parâmetros treináveis do LoRA) e as saídas de teste dos dois modelos lado a lado, para conferência e para o banner.

#### Scenario: Entrega completa
- **WHEN** o notebook termina a rodada completa
- **THEN** o Drive contém o GGUF Q4_K_M, `metricas_slm.json` e o CSV de saídas base × destilado

### Requirement: Modo ensaio
O notebook SHALL ter um modo ensaio que treina por poucos passos e avalia poucos exemplos de teste, percorrendo todas as etapas (inclusive a exportação GGUF), para descobrir erros de ambiente em minutos antes da rodada completa. Resultados do modo ensaio SHALL ser marcados como ensaio e não valem para o critério de aprovação.

#### Scenario: Ensaio não vale como aprovação
- **WHEN** o notebook roda em modo ensaio
- **THEN** `metricas_slm.json` registra `ensaio: true` e o critério não é aplicado
