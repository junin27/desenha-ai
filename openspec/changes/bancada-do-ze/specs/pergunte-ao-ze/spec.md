# Spec Delta

## Purpose

Deixar o visitante conversar com o Zé do Rabisco fora da partida (tarefa PERGUNTA do dataset), vendo o raciocínio e a resposta ao vivo, com proteção contra perguntas ofensivas e resposta garantida mesmo quando o modelo falha.

## ADDED Requirements

### Requirement: Abrir e voltar
A tela de início SHALL ter o botão "Pergunte ao Zé", que abre uma tela com campo de pergunta, botão "Perguntar" e botão "Voltar". "Voltar" SHALL levar à tela de início sem alterar o placar nem a partida.

#### Scenario: Ida e volta
- **WHEN** o visitante abre "Pergunte ao Zé" e clica em "Voltar"
- **THEN** a tela de início aparece com o mesmo placar de antes

### Requirement: Pergunta válida
Uma pergunta SHALL ter de 1 a 200 caracteres depois de limpar os espaços (regra da spec `conversa-com-o-ze`). Pergunta inválida SHALL mostrar um erro na tela, sem chamar o Zé.

#### Scenario: Pergunta vazia
- **WHEN** o visitante clica em "Perguntar" com o campo só com espaços
- **THEN** a tela mostra o erro e nenhum pedido é feito ao Zé

#### Scenario: Pergunta longa demais
- **WHEN** a pergunta tem 201 caracteres
- **THEN** a tela mostra o erro e nenhum pedido é feito ao Zé

### Requirement: Resposta ao vivo
Uma pergunta válida SHALL ser enviada ao Zé com a entrada PERGUNTA da spec `conversa-com-o-ze`. A tela SHALL mostrar o raciocínio enquanto ele pensa e depois a resposta. Enquanto o Zé responde, o botão "Perguntar" SHALL ficar desativado.

#### Scenario: Resposta do Zé
- **WHEN** o Zé devolve uma fala no formato `<pensamento>`/`<resposta>`
- **THEN** a tela mostra o texto da `<resposta>` com origem `ze`

#### Scenario: Uma pergunta por vez
- **WHEN** o Zé ainda está respondendo
- **THEN** o botão "Perguntar" fica desativado até a resposta terminar

### Requirement: Resposta de reserva
Se o Zé falhar, passar do limite de tempo do narrador ou devolver fala fora do formato, a tela SHALL mostrar uma resposta-modelo no estilo do Zé, com origem `reserva`.

#### Scenario: Zé desligado
- **WHEN** o `llama-server` não está rodando
- **THEN** em até 2 s a tela mostra uma resposta-modelo com origem `reserva`

### Requirement: Bloqueio de perguntas ofensivas
Uma pergunta que contenha palavra da lista de bloqueio, comparada sem acentos e sem diferença entre maiúsculas e minúsculas, SHALL receber uma resposta-modelo educada sem que nenhum pedido seja feito ao Zé.

#### Scenario: Palavra bloqueada com acento e maiúscula
- **WHEN** a pergunta contém uma palavra da lista escrita com maiúsculas e acento
- **THEN** a tela mostra a resposta-modelo de bloqueio e o Zé não recebe pedido
