# Spec Delta

## Purpose

Dar voz ao Zé do Rabisco no estande: as falas finais dele são lidas em voz alta com uma voz pt-BR instalada no computador, sem internet, e a organização pode ligar ou desligar o som a qualquer momento.

## ADDED Requirements

### Requirement: Só voz local em português
O jogo SHALL usar apenas vozes do sintetizador do navegador marcadas como locais (instaladas no computador) e com idioma português, preferindo `pt-BR` a outras variantes de português. Voz que depende de rede SHALL NOT ser usada. Sem voz local em português, o botão de voz SHALL ficar desativado com o texto "Voz pt-BR não instalada" e nenhuma fala SHALL ser sintetizada.

#### Scenario: Só voz online disponível
- **WHEN** o navegador oferece apenas uma voz pt-BR que não é local
- **THEN** o botão de voz fica desativado com "Voz pt-BR não instalada" e nada é falado

#### Scenario: Preferência pelo português do Brasil
- **WHEN** há vozes locais `pt-PT` e `pt-BR`
- **THEN** o Zé fala com a voz `pt-BR`

### Requirement: O que o Zé fala
Com a voz ligada, o jogo SHALL ler em voz alta, uma vez cada, o texto final exibido para: a charada (do Zé ou de reserva), a narração do veredito e a resposta do "Pergunte ao Zé". O raciocínio (`<pensamento>`) e os textos parciais do *streaming* SHALL NOT ser falados. Quando a tela muda, a fala em andamento SHALL ser interrompida.

#### Scenario: Charada de reserva falada
- **WHEN** a rodada mostra uma charada de reserva com a voz ligada
- **THEN** o sintetizador recebe exatamente o texto da charada, uma vez

#### Scenario: Pensamento não é falado
- **WHEN** o Zé está na etapa `pensando` do *streaming*
- **THEN** o sintetizador não recebe nenhum texto

#### Scenario: Troca de tela interrompe a fala
- **WHEN** o jogador clica em "Bora desenhar!" enquanto a charada ainda está sendo lida
- **THEN** a fala é interrompida antes de a tela de desenho aparecer

### Requirement: Botão liga/desliga
Um botão de voz SHALL ficar visível em todas as telas. Desligar SHALL interromper a fala em andamento na hora. A escolha SHALL ficar gravada no navegador e ser restaurada ao recarregar; sem escolha gravada, a voz começa ligada quando há voz local em português.

#### Scenario: Desligar no meio da fala
- **WHEN** a narração está sendo lida e o botão é desligado
- **THEN** a fala para e as próximas falas não são lidas

#### Scenario: Recarregar mantém a escolha
- **WHEN** a voz foi desligada e a página é recarregada
- **THEN** a voz continua desligada
