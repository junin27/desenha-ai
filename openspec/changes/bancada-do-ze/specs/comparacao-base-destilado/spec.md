# Spec Delta

## Purpose

Mostrar ao vivo o efeito do fine-tuning: durante o evento, o narrador do jogo pode ser o Zé destilado ou o Qwen3 base sem fine-tuning, com as mesmas regras, e o público vê qual deles está falando.

## ADDED Requirements

### Requirement: Dois endereços do Zé
O jogo SHALL conhecer dois endereços do `llama-server`: o do Zé destilado (padrão `http://127.0.0.1:8080`) e o do Qwen3 base (padrão `http://127.0.0.1:8081`), configuráveis pelos parâmetros `ze` e `zebase` da URL do jogo.

#### Scenario: Endereço do base pela URL
- **WHEN** o jogo é aberto com `?zebase=http://127.0.0.1:9090`
- **THEN** as falas do modelo base são pedidas em `http://127.0.0.1:9090`

### Requirement: Alternância do narrador
O painel técnico SHALL ter uma chave que escolhe o narrador entre "Zé destilado" e "Qwen3 base". A escolha SHALL valer a partir do próximo pedido; um pedido em andamento SHALL terminar com o modelo que o começou. Ao abrir o jogo, o narrador SHALL ser o Zé destilado.

#### Scenario: Trocar para o base
- **WHEN** a chave é trocada para "Qwen3 base" e a próxima rodada pede uma charada
- **THEN** o pedido da charada vai para o endereço do modelo base

#### Scenario: Troca no meio de uma fala
- **WHEN** a chave é trocada enquanto o Zé destilado gera a narração
- **THEN** a narração termina pelo destilado e só o pedido seguinte vai para o base

### Requirement: Mesmas regras para os dois modelos
O modelo base SHALL receber o mesmo prompt e passar pelas mesmas conferências (formato, vazamento, concordância com a regra) e pelas mesmas reservas que o Zé destilado. Os pontos SHALL continuar vindo da regra.

#### Scenario: Base fora do formato
- **WHEN** o modelo base responde sem as marcas `<pensamento>`/`<resposta>`
- **THEN** a rodada usa a reserva e o painel conta uma fala de reserva para o modelo base

### Requirement: Selo de quem está falando
As telas de charada, veredito e "Pergunte ao Zé" SHALL mostrar o selo "Zé destilado" ou "Qwen3 base (sem fine-tuning)" do modelo que gerou aquela fala, ou "Reserva" quando a fala mostrada veio da reserva.

#### Scenario: Selo da reserva
- **WHEN** a charada mostrada é de reserva porque o base falhou
- **THEN** o selo da charada é "Reserva"
