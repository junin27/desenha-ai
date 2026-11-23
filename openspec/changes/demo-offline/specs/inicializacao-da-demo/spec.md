# Spec Delta

## Purpose

Colocar o jogo no ar no estande com um clique e sem internet: os servidores do Zé nas portas que o jogo espera, o navegador em tela cheia e um jeito simples de desligar tudo.

## ADDED Requirements

### Requirement: Um clique, sem internet
O arquivo `Iniciar Desenha Aí.bat` SHALL iniciar a demo a partir da pasta `demo/` sem acessar a rede: o Zé destilado na porta 8080, servindo também o build do jogo, e o Qwen3 base na porta 8081, os dois só em `127.0.0.1`, com no máximo 300 tokens por fala e contexto de 2048 tokens.

#### Scenario: Linhas de comando dos servidores
- **WHEN** a demo é iniciada com os dois modelos
- **THEN** o destilado sobe com `--host 127.0.0.1 --port 8080`, o modelo do destilado e a pasta do build do jogo, e o base sobe com `--host 127.0.0.1 --port 8081` e o modelo base

#### Scenario: Modo ensaio
- **WHEN** o manifesto está no modo ensaio
- **THEN** a porta 8080 é servida com o GGUF base e a janela avisa "Modo ensaio: Zé sem fine-tuning"

### Requirement: Modelo base conforme a memória
O Qwen3 base SHALL subir só se, depois de reservar a memória do destilado, sobrarem pelo menos 1,5 GB livres. Se não sobrarem, a demo SHALL seguir só com o destilado e avisar que a comparação base × destilado vai usar a reserva.

#### Scenario: Memória curta
- **WHEN** há 2,2 GB livres e o destilado precisa de 1,4 GB
- **THEN** só o destilado sobe e a janela avisa que o base ficou desligado por falta de memória

### Requirement: Espera por saúde antes do navegador
A inicialização SHALL esperar cada servidor iniciado responder `GET /health` com sucesso, por até 90 s, antes de abrir o navegador. Se o tempo acabar, SHALL mostrar qual servidor não respondeu e as últimas linhas do registro dele.

#### Scenario: Servidor que não sobe
- **WHEN** o destilado não responde `/health` em 90 s
- **THEN** a janela mostra "Zé destilado não respondeu na porta 8080" e as últimas 20 linhas do registro, e o navegador não é aberto

### Requirement: Navegador em tela cheia
Com os servidores saudáveis, a demo SHALL abrir `http://127.0.0.1:8080/` em tela cheia, em modo aplicativo (sem barra de endereço), no Chrome se estiver instalado e, se não estiver, no Edge.

#### Scenario: Sem Chrome
- **WHEN** o Chrome não está instalado
- **THEN** o jogo abre no Edge em tela cheia

### Requirement: Encerrar
Fechar a janela da demo ou apertar Ctrl+C nela SHALL encerrar os servidores que ela iniciou, sem deixar processo `llama-server` rodando.

#### Scenario: Ctrl+C
- **WHEN** o operador aperta Ctrl+C na janela da demo
- **THEN** os processos `llama-server` iniciados por ela terminam em até 5 s
