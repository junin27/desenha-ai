# Spec Delta

## Purpose

Conversar com o Zé do Rabisco rodando localmente no llama.cpp, mostrando o raciocínio e a resposta enquanto são gerados, e devolvendo o controle ao jogo a tempo mesmo quando o modelo falha.

## ADDED Requirements

### Requirement: Chamada ao llama-server
O narrador SHALL enviar ao `llama-server` (endereço configurável, padrão `http://127.0.0.1:8080`) o prompt da spec `modelo-do-ze` para a entrada da tarefa, com parada em `<|im_end|>`, no máximo 300 tokens novos e *streaming* ativado.

#### Scenario: Pedido de charada
- **WHEN** a partida pede uma charada da vaca, nível fácil
- **THEN** o corpo enviado tem o prompt idêntico ao do contrato, `stop` com `<|im_end|>`, `n_predict` 300 e `stream` verdadeiro

### Requirement: Fala progressiva
A cada pedaço recebido, o narrador SHALL informar a leitura progressiva da spec `conversa-com-o-ze` (etapa, pensamento e resposta parciais), para a tela mostrar o Zé "pensando" e depois respondendo.

#### Scenario: Pensando ao vivo
- **WHEN** chegaram os pedaços "<pensamento>Malha" e "da e mansa"
- **THEN** a tela recebeu as leituras parciais "Malha" e "Malhada e mansa", na etapa `pensando`

### Requirement: Limite de tempo e falhas
O narrador SHALL desistir e devolver uma falha se não houver resposta completa em 25 s, se a conexão falhar ou se o servidor responder com erro. A falha SHALL ser um valor (erro `narrador_indisponivel` ou `narrador_lento`), nunca uma exceção, para a partida usar a reserva.

#### Scenario: Servidor desligado
- **WHEN** o `llama-server` não está rodando
- **THEN** o narrador devolve `narrador_indisponivel` em menos de 2 s

#### Scenario: Servidor lento
- **WHEN** a resposta não termina em 25 s
- **THEN** a geração é cancelada e o narrador devolve `narrador_lento`

### Requirement: Medição de velocidade
Ao fim de cada fala, o narrador SHALL informar os tokens gerados e os tokens por segundo, a partir das informações de tempo do próprio `llama-server`.

#### Scenario: Velocidade registrada
- **WHEN** a fala termina com 120 tokens em 8 s de geração
- **THEN** o narrador informa 120 tokens e 15 tokens/s
