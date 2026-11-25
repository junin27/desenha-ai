# Spec Delta

## Purpose

Montar, enquanto ainda há internet, uma pasta da demo completa e conferida (servidor do SLM, modelos, redes e build do jogo), para o estande depois rodar sem nenhum download.

## ADDED Requirements

### Requirement: Manifesto da demo
A preparação SHALL gravar em `demo/manifesto.json` a lista de arquivos da demo com caminho relativo, tamanho em bytes e SHA-256: o executável do `llama-server` e suas bibliotecas, o GGUF do Qwen3-1.7B base, o GGUF do Zé destilado (quando existir), os artefatos das redes e o build do jogo. A versão do llama.cpp e a origem de cada GGUF SHALL ficar registradas no manifesto.

#### Scenario: Manifesto completo
- **WHEN** a preparação termina sem erro
- **THEN** cada arquivo listado em `demo/manifesto.json` existe com o tamanho e o SHA-256 gravados

### Requirement: Downloads com versão fixada e conferência
O `llama-server` SHALL vir do pacote oficial do llama.cpp para Windows/CPU na versão fixada no código, e o GGUF base, do repositório e arquivo fixados no código. Download interrompido, tamanho diferente do esperado ou arquivo corrompido SHALL fazer a preparação falhar com a mensagem do que veio e do que se esperava, sem deixar arquivo parcial no lugar do definitivo.

#### Scenario: Download interrompido
- **WHEN** a conexão cai no meio do download do GGUF base
- **THEN** a preparação falha dizendo quantos bytes chegaram e quantos eram esperados, e `demo/` não contém o GGUF parcial com o nome final

#### Scenario: Preparação repetida
- **WHEN** a preparação roda de novo com todos os arquivos já presentes e íntegros
- **THEN** nada é baixado outra vez

### Requirement: Zé destilado ou modo ensaio
Se o GGUF do Zé destilado for informado, a preparação SHALL copiá-lo para a demo. Se não for, a preparação SHALL marcar no manifesto o **modo ensaio**, em que o modelo base também ocupa a vaga do destilado, e avisar que a demo ainda não tem o Zé treinado.

#### Scenario: Sem o GGUF do Zé
- **WHEN** a preparação roda sem o GGUF do Zé destilado
- **THEN** o manifesto registra o modo ensaio e a saída avisa que o Zé destilado está faltando

### Requirement: Mesma quantização no base e no destilado
O GGUF do Qwen3 base da demo SHALL ter a mesma quantização do GGUF do Zé usado no evento, para a comparação base × destilado medir o fine-tuning e não a quantização. Desde a rodada v7 é Q8_0: o Q4_K_M quebrava o formato do Zé. O GGUF do Zé SHALL ficar na demo com um nome sem a quantização (`zedorabisco-1.7b.gguf`), e a quantização de cada GGUF SHALL constar no manifesto pela origem do arquivo.

#### Scenario: Demo com o Zé em Q8_0
- **WHEN** a preparação roda com `--gguf-do-ze …/zedorabisco-1.7b-Q8_0.gguf`
- **THEN** a demo tem `modelos/zedorabisco-1.7b.gguf` e `modelos/qwen3-1.7b-base-Q8_0.gguf`, e o manifesto registra a origem dos dois
