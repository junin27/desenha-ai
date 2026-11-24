# Spec Delta

## Purpose

Gerar, curar e exportar o dataset destilado (Teacher → Student) que ensina o Zé do Rabisco a criar charadas, julgar desenhos e responder visitantes, com regras de curadoria verificáveis por máquina e volume mínimo garantido.

## ADDED Requirements

### Requirement: Ficha técnica como base de fatos
A geração SHALL montar uma ficha técnica com os fatos do projeto (autor, disciplinas, funcionamento do jogo, CNN, LSTM, ensemble, Qwen3-1.7B, QLoRA, Unsloth, destilação, quantização 4 bits e regra do veredito). Se `metricas_redes.json` existir, a ficha SHALL incluir as acurácias de teste e as quantidades de parâmetros dele. Os números da ficha SHALL ser os únicos números aceitos nas respostas de PERGUNTA.

#### Scenario: Ficha com métricas reais
- **WHEN** `metricas_redes.json` informa acurácia de teste do ensemble 0,912
- **THEN** a ficha contém "91,2%" e esse número passa a ser aceito nas respostas

### Requirement: Pedidos por tarefa
A geração SHALL pedir ao Teacher: para CHARADA, as 30 categorias × 3 níveis × 2 estilos sorteados entre 4 (180 pedidos); para VEREDITO, 240 casos de `predicoes_validacao.json`, 80 de cada veredito pela regra do top-k (completando com casos sintéticos marcados como `sintetico` se faltar algum veredito); para PERGUNTA, 12 perguntas-semente e 2 gerações de Evol-Instruct, em que cada pergunta gera uma variação *in-depth* e uma *in-breadth*.

#### Scenario: Vereditos balanceados
- **WHEN** as predições reais têm 700 ACERTOU, 300 QUASE e 200 ERROU
- **THEN** os casos de VEREDITO são 80 de cada, todos com fonte `real`

#### Scenario: Evol-Instruct
- **WHEN** a geração de perguntas termina sem falhas
- **THEN** há 12 sementes, 24 perguntas da 1ª geração e 48 da 2ª, cada uma marcada como `seed`, `in_depth` ou `in_breadth`

### Requirement: Chamadas ao Teacher com checkpoint
Cada lote SHALL ser gravado num arquivo de *checkpoint* assim que responder; ao reiniciar, lotes já gravados SHALL ser pulados. Chamadas SHALL respeitar um intervalo mínimo entre elas e tentar de novo com espera crescente (até 5 tentativas). Um lote que falhar em todas as tentativas SHALL ser gravado sem saída, e suas amostras são rejeitadas como `vazia` na curadoria.

#### Scenario: Retomada sem repetir chamadas
- **WHEN** a geração é interrompida depois de 30 lotes e executada de novo
- **THEN** os 30 lotes gravados não são pedidos de novo ao Teacher

### Requirement: Retomada refaz lotes incompletos
Ao retomar a geração, um lote com alguma amostra sem saída (falha total ou resposta com menos exemplos que o pedido) SHALL ser pedido de novo e seus registros antigos substituídos, sem duplicar os lotes completos.

#### Scenario: Retomada refaz o que ficou vazio
- **WHEN** a geração termina com 3 lotes, o segundo sem saída, e é executada de novo
- **THEN** só o segundo lote é pedido ao Teacher, seus registros vazios são substituídos pelos novos e o checkpoint não tem linhas duplicadas

### Requirement: Passadas até o dataset ficar suficiente
A geração SHALL poder repetir a passada completa (pedir de novo só os lotes incompletos e curar outra vez) até o dataset ficar suficiente, no máximo 3 passadas, e SHALL parar antes se não houver lote incompleto a refazer ou se uma passada não aumentar o número de amostras aprovadas.

#### Scenario: Teacher instável na primeira passada
- **WHEN** o Teacher falha em todos os lotes da 1ª passada e responde na 2ª
- **THEN** a 2ª passada refaz os lotes, aprova amostras e a geração para ali, por não haver mais lote incompleto

#### Scenario: Nada a refazer
- **WHEN** a 1ª passada não deixa nenhum lote incompleto, mas o dataset segue insuficiente
- **THEN** a geração para na 1ª passada, sem chamar o Teacher de novo

### Requirement: Filtros comuns da curadoria
Toda amostra SHALL ser rejeitada, com o primeiro código aplicável, se: não tiver saída (`vazia`); falhar na leitura da fala da spec `conversa-com-o-ze` (`formato_invalido`); contiver recusa do tipo "como uma IA" ou "não posso" (`recusa`); ou tiver o pensamento fora de 12 a 90 palavras (`tamanho_pensamento`).

#### Scenario: Recusa do Teacher
- **WHEN** a resposta contém "Como uma IA, não posso fazer charadas"
- **THEN** a amostra é rejeitada como `recusa`

#### Scenario: Pensamento curto demais
- **WHEN** o pensamento tem 8 palavras
- **THEN** a amostra é rejeitada como `tamanho_pensamento`

### Requirement: Filtros por tarefa
Depois dos filtros comuns, a amostra SHALL ser rejeitada se: na CHARADA, a resposta tiver fora de 6 a 45 palavras (`tamanho_resposta`) ou vazar a palavra secreta pela spec `vazamento-da-palavra-secreta` (`vazou`); no VEREDITO, o veredito diferir da regra da spec `julgamento-do-desenho` aplicada ao top do ensemble (`veredito_errado`); na PERGUNTA, a resposta tiver fora de 10 a 95 palavras (`tamanho_resposta`) ou citar número ausente da ficha e da pergunta (`numero_alucinado`).

#### Scenario: Charada que vaza
- **WHEN** a palavra é "vaca" e a resposta é "Charada: Quem é a vaquinha do pasto?"
- **THEN** a amostra é rejeitada como `vazou`

#### Scenario: Veredito contra a regra
- **WHEN** o desafio é "vaca", o ensemble começa por "cavalo, vaca" e a resposta diz VEREDITO: ACERTOU
- **THEN** a amostra é rejeitada como `veredito_errado`

#### Scenario: Número inventado
- **WHEN** a ficha não contém "97" e a resposta de uma PERGUNTA diz "a CNN acerta 97% dos desenhos"
- **THEN** a amostra é rejeitada como `numero_alucinado`

### Requirement: Reparos e desduplicação
Antes dos filtros, marcação Markdown (`**`, `__`, títulos `#`, marcadores de lista) e emojis SHALL ser removidos, e o reparo SHALL ser contado no relatório. Depois dos filtros, uma amostra cuja resposta tiver semelhança de Jaccard maior que 0,7 (trigramas de palavras na forma comparável) com uma já aprovada da mesma tarefa SHALL ser rejeitada como `duplicata`.

#### Scenario: Markdown reparado
- **WHEN** a resposta contém "**Ô trem bão!**"
- **THEN** a amostra segue para os filtros com "Ô trem bão!" e o reparo `markdown` é contado

### Requirement: Separação e exportação
As amostras aprovadas SHALL ser separadas por tarefa em 80% treino, 10% validação e 10% teste (no mínimo 3 por tarefa em validação e em teste), com sorteio determinístico pela semente, e exportadas em ShareGPT (`conversations` com `system`, `human`, `gpt`) e ChatML (`messages` com `system`, `user`, `assistant`), uma conversa por linha, levando também a tarefa e os metadados.

#### Scenario: Teste com todas as tarefas
- **WHEN** a exportação termina
- **THEN** o arquivo de teste tem amostras de CHARADA, VEREDITO e PERGUNTA, e nenhuma delas aparece no treino

### Requirement: Relatório e volume mínimo
A exportação SHALL gerar um relatório com a quantidade de pedidos, de respostas, de aprovadas por tarefa, os códigos de rejeição e de reparo, a origem das perguntas (seed, in_depth, in_breadth) e dos vereditos (real, sintético) e o uso da API. O dataset SHALL ser marcado como suficiente só com ao menos 300 amostras aprovadas no total e 60 por tarefa.

#### Scenario: Volume insuficiente
- **WHEN** só 45 amostras de PERGUNTA são aprovadas
- **THEN** o relatório marca o dataset como insuficiente e informa a tarefa abaixo do mínimo

### Requirement: Charadas de reserva para o jogo
A exportação SHALL gerar um arquivo com, para cada categoria, as charadas aprovadas (texto depois de `Charada:`), para o jogo usar quando o SLM estiver indisponível. Categorias sem nenhuma charada aprovada SHALL ser listadas no relatório.

#### Scenario: Reserva completa
- **WHEN** todas as 30 categorias têm charadas aprovadas
- **THEN** o arquivo de reserva tem as 30 categorias e o relatório não lista nenhuma ausente
