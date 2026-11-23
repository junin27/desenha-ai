# Spec Delta

## Purpose

Reconhecer o desenho do visitante no próprio navegador, sem internet, a cada traço, com as mesmas redes e o mesmo pré-processamento do treino.

## ADDED Requirements

### Requirement: Palpite a cada traço
Ao terminar cada traço (e, durante o traço, no máximo a cada 250 ms), o jogo SHALL preparar o desenho capturado (spec `pre-processamento-de-desenho`), executar a CNN e a LSTM e combinar no ensemble com o `w_cnn` de `classes.json`. O resultado SHALL trazer as probabilidades das duas redes e do ensemble.

#### Scenario: Palpite ao soltar o traço
- **WHEN** o jogador solta o mouse ao fim de um traço
- **THEN** em até 100 ms o jogo tem um novo palpite com as 30 probabilidades de cada rede e do ensemble

#### Scenario: Palpites não se acumulam
- **WHEN** chega um novo traço enquanto o palpite anterior ainda está sendo calculado
- **THEN** o jogo descarta o palpite antigo e usa só o mais recente

### Requirement: Redes empacotadas e offline
Os modelos (`cnn.onnx`, `lstm.onnx`) e o runtime (`onnxruntime-web` e seus arquivos `.wasm`) SHALL ser servidos pelo próprio jogo, sem nenhuma requisição para fora de `localhost`.

#### Scenario: Sem internet
- **WHEN** o notebook está sem internet
- **THEN** as redes carregam e dão palpites normalmente

### Requirement: Autoteste de paridade ao abrir
Ao abrir, o jogo SHALL executar as redes nos desenhos de `teste_paridade_redes.json` e comparar com as probabilidades esperadas (diferença máxima de 1e-4). Se falhar, o jogo SHALL mostrar o aviso "Redes divergentes do treino" na tela de início, sem impedir o jogo.

#### Scenario: Paridade conferida
- **WHEN** os arquivos das redes são os gerados pelo treino
- **THEN** o autoteste passa e nenhum aviso aparece

#### Scenario: Modelo trocado
- **WHEN** `cnn.onnx` é de outro treino
- **THEN** a tela de início mostra "Redes divergentes do treino"
