# Proposal

## Why

O jogo e a bancada do Zé estão prontos, mas, para funcionar no estande, alguém ainda teria de subir o `llama-server` à mão, lembrar das portas, copiar modelos e abrir o navegador certo em tela cheia. No dia 30/11 não haverá internet confiável nem tempo para depurar terminal. É preciso **preparar tudo com internet antes**, **iniciar a demo com um clique e sem internet** e **conferir, antes de abrir o estande**, que nada está faltando. Esta é a última change antes do evento e também fecha os testes pendentes da `jogo-web` e da `bancada-do-ze` com o `llama-server` real.

**Disciplinas:** ambas. SLM: servir os GGUF Q4_K_M em CPU com o `llama-server`, com o destilado e o base lado a lado e limite de memória. Redes Neurais: os artefatos ONNX entram no pacote da demo e são conferidos pela paridade.

## What Changes

- **Preparação (com internet, antes do evento):** um comando baixa o `llama-server` do llama.cpp para Windows/CPU numa versão fixada e o GGUF do Qwen3-1.7B base (Q4_K_M), copia o GGUF do Zé destilado e as redes, gera o build do jogo e confere tamanho e SHA-256 de cada arquivo numa pasta `demo/`, fora do Git.
- **Inicialização com um clique (sem internet):** `Iniciar Desenha Aí.bat` sobe o Zé destilado na porta 8080, servindo também o build do jogo, e o Qwen3 base na 8081 só se houver memória livre. Depois espera os dois responderem `/health` e abre o jogo em tela cheia no Chrome ou, na falta dele, no Edge. Fechar a janela do terminal encerra os servidores.
- **Checklist do evento:** `Conferir Desenha Aí.bat` verifica os arquivos e os hashes, a memória livre, a voz pt-BR instalada no Windows, as portas livres e que o Zé gera uma fala no formato certo em menos de 25 s. Tudo é impresso como ✓/✗ com a ação para corrigir. Há também um `docs/checklist_evento.md` para o que não dá para automatizar (tomada, mouse, brilho da tela, placar zerado).
- **Ensaio com o modelo real:** antes do GGUF do Zé existir (o notebook 3 ainda não rodou), a demo sobe o Qwen3 base também na porta do destilado. Assim, o caminho inteiro (streaming, reserva, tokens/s, painel) é testado com o `llama-server` de verdade.

### Fora do escopo

- Treinar ou quantizar modelos: notebooks 1 e 3.
- Instalar a voz pt-BR do Windows automaticamente: exige permissão de administrador; o checklist explica como fazer.
- Linux e macOS: o estande é este notebook com Windows 11.
- GPU: a demo é só CPU (D-02).
- Atualização automática do llama.cpp: a versão fica fixada e só muda por uma nova change.

## Capabilities

### New Capabilities

- `preparacao-da-demo`: montar, com internet, a pasta da demo com o `llama-server`, os GGUF, as redes e o build do jogo, todos conferidos por tamanho e SHA-256.
- `inicializacao-da-demo`: iniciar e encerrar a demo offline com um clique: servidores nas portas certas, base condicionado à memória, espera por saúde e navegador em tela cheia.
- `checklist-do-evento`: conferência automática antes de abrir o estande, com resultado ✓/✗ e a ação para cada falha.

### Modified Capabilities

(nenhuma)

## Impact

- **Novo código Python:** núcleo puro em `ml/src/desenha_ml/demo/` (manifesto de arquivos, linhas de comando do `llama-server`, decisão de memória, leitura do `/health`, avaliação do checklist), com testes; casca em `scripts/preparar_demo.py`, `scripts/iniciar_demo.py` e `scripts/conferir_demo.py`.
- **Arquivos de um clique:** `Iniciar Desenha Aí.bat` e `Conferir Desenha Aí.bat` na raiz de `projeto_final/`.
- **Downloads (só na preparação):** zip do llama.cpp (~30 MB) e GGUF do Qwen3-1.7B Q4_K_M (~1,1 GB). Na demo, nenhum acesso à rede.
- **Documentação:** `docs/checklist_evento.md`; o README ganha "Como rodar a demo".
- **Depende de:** `jogo-web` e `bancada-do-ze` (implementadas). O GGUF do Zé destilado vem do notebook 3; sem ele, a demo roda no modo ensaio descrito acima.
