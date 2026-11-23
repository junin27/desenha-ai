# Spec Delta

## Purpose

Mostrar à banca, sem sair do jogo, os números que provam o trabalho das duas disciplinas: latência das redes no navegador, velocidade e origem das falas do Zé e as métricas do treino.

## ADDED Requirements

### Requirement: Abrir e fechar os bastidores
O painel técnico SHALL abrir e fechar pelo botão "Bastidores", visível em todas as telas, e pela tecla F2. Abrir ou fechar o painel SHALL NOT pausar o cronômetro, os palpites nem a fala do Zé.

#### Scenario: Painel durante o desenho
- **WHEN** a tecla F2 é apertada durante o desenho
- **THEN** o painel aparece e o cronômetro e os palpites continuam atualizando

### Requirement: Medições das redes
O painel SHALL mostrar, para o último palpite, o tempo em milissegundos da CNN e da LSTM, e o resultado do autoteste de paridade (número de desenhos e diferença máxima).

#### Scenario: Depois de um traço
- **WHEN** o jogador termina um traço
- **THEN** o painel mostra os milissegundos da CNN e da LSTM daquele palpite

### Requirement: Medições do Zé
Para a última fala, o painel SHALL mostrar o modelo (destilado ou base), o tempo até o primeiro token, a duração total, os tokens gerados e os tokens por segundo informados pelo servidor. Na sessão, SHALL contar, por modelo, as falas do Zé usadas, as falas trocadas pela reserva, as discordâncias Zé × regra e as falhas por código (`narrador_indisponivel`, `narrador_lento`).

#### Scenario: Fala medida
- **WHEN** a fala termina com 120 tokens em 8 s de geração
- **THEN** o painel mostra 120 tokens e 15 tokens/s

#### Scenario: Servidor desligado contado
- **WHEN** um pedido ao Zé falha porque o servidor está desligado
- **THEN** o contador `narrador_indisponivel` do modelo escolhido aumenta em 1

### Requirement: Métricas do treino
Se `metricas_redes.json` estiver junto dos modelos, o painel SHALL mostrar a acurácia e o top-3 de teste da CNN, da LSTM e do ensemble e o `w_cnn`. Se `metricas_slm.json` estiver junto dos modelos, SHALL mostrar a taxa de formato e de acerto por tarefa do base e do destilado e os tamanhos teórico e real dos GGUF. Arquivo ausente ou fora do formato SHALL aparecer como "—", sem erro e sem impedir o jogo.

#### Scenario: Sem métricas do SLM
- **WHEN** `metricas_slm.json` não existe
- **THEN** a seção do SLM mostra "—" e o resto do painel funciona
