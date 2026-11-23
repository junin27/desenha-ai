# Design

## Context

O jogo é um build estático (`app/dist`) que busca `modelos/` no mesmo endereço, fala com o Zé destilado em `?ze=` (padrão `127.0.0.1:8080`) e com o base em `?zebase=` (padrão `127.0.0.1:8081`). O pacote `desenha_ml` já tem, com contrato, o prompt do Qwen3 (`prompt_qwen`) e a leitura da fala (`conversa`). A máquina do estande é este notebook: Windows 11, Ryzen 7 5700U (8 núcleos, AVX2), 16 GB de RAM com cerca de 3 GB livres no uso normal, Chrome e Edge instalados e só uma voz SAPI em inglês. Motivação em `proposal.md`.

## Goals / Non-Goals

**Goals:**
- Regras da demo (manifesto, linhas de comando, memória, saúde, checklist) como funções puras testadas; os scripts só fazem I/O.
- Nenhum acesso à rede depois da preparação.
- Nenhum processo `llama-server` órfão depois de fechar a demo.

**Non-Goals:**
- Instalador, serviço do Windows ou ícone na área de trabalho: dois `.bat` na pasta do projeto bastam.
- Escolher o modelo pela interface do terminal: a escolha base × destilado é do painel do jogo.

## Decisions

### D1 — Núcleo em `desenha_ml.demo`, casca em `scripts/`
Módulos `manifesto`, `servidores` (linhas de comando e memória), `saude`, `navegador` e `checklist`, só com biblioteca padrão e funções puras. Os scripts `preparar_demo.py`, `iniciar_demo.py` e `conferir_demo.py` baixam, gravam, abrem processos e leem o Windows.
- **Alternativa descartada:** scripts PowerShell. Seriam a solução mais natural no Windows, mas não dá para testá-los com pytest nem reusar o prompt e a leitura da fala que já têm contrato.

### D2 — Versões e origens fixadas
- `llama-server`: zip oficial `llama-<tag>-bin-win-cpu-x64.zip` das *releases* do `ggml-org/llama.cpp`, com a *tag* fixada numa constante. A *tag* é escolhida na tarefa de preparação (a mais recente com o *build* para CPU no dia) e gravada no manifesto e aqui.
- GGUF base: `unsloth/Qwen3-1.7B-GGUF`, arquivo `Qwen3-1.7B-Q4_K_M.gguf`, da mesma família de exportação (Unsloth, Q4_K_M) do Zé destilado, para a comparação ser justa.
- **Alternativa descartada:** `Qwen/Qwen3-1.7B-GGUF` oficial, que só tem Q8_0; comparar 8 bits com 4 bits misturaria quantização com fine-tuning.

### D3 — Pasta `demo/` (fora do Git)
```
demo/llama/        llama-server.exe e DLLs
demo/modelos/      zedorabisco-1.7b-Q4_K_M.gguf, qwen3-1.7b-base-Q4_K_M.gguf
demo/jogo/         build do jogo com app/public/modelos dentro
demo/perfil/       perfil próprio do navegador (placar no localStorage dele)
demo/registros/    saída de cada llama-server
demo/manifesto.json
```
O perfil próprio isola o placar do evento do navegador pessoal e evita extensões na tela cheia.

### D4 — Linhas de comando do `llama-server`
Ambos com `-m <gguf> --host 127.0.0.1 --port <p> -c 2048 -n 300 --threads 8 --parallel 1`. O destilado acrescenta `--path demo/jogo`, que serve o jogo na mesma origem (sem CORS para a porta 8080). O base, na 8081, é chamado de outra origem: o `llama-server` responde CORS aberto, o que é conferido no ensaio (tarefa 3.1). No modo ensaio, a vaga do destilado usa o GGUF base.

### D5 — Memória
A memória livre vem de `GlobalMemoryStatusEx` (ctypes). Cada servidor precisa do tamanho do GGUF mais 0,3 GB (contexto de 2048 e *buffers*). O base sobe se, descontado o destilado, sobrarem pelo menos 1,5 GB. A função pura recebe os números e devolve a decisão e o aviso.

### D6 — Encerramento sem órfãos: Job Object
Os `llama-server` são criados dentro de um *Job Object* do Windows com `JOB_OBJECT_LIMIT_KILL_ON_JOB_CLOSE`. Se o Python sair por qualquer motivo (Ctrl+C, janela fechada, erro), o Windows encerra os filhos. O Ctrl+C também chama `terminate()` antes, para sair limpo.
- **Alternativa descartada:** só `atexit`/sinais. Fechar a janela do console mata o Python sem rodar `atexit` com segurança.

### D7 — Navegador
Procura o Chrome em `Program Files`, `Program Files (x86)` e `%LOCALAPPDATA%`; se não achar, usa o Edge. Abre com `--app=http://127.0.0.1:8080/ --start-fullscreen --user-data-dir=demo/perfil --no-first-run`.

### D8 — Checklist
- Voz: lê as vozes de `HKLM\SOFTWARE\Microsoft\Speech_OneCore\Voices\Tokens` e `...\Speech\Voices\Tokens` (as locais que o Chrome e o Edge usam) e procura idioma `416` (pt-BR). Sem voz, o item é aviso, porque o jogo funciona mudo.
- Fala real: monta a entrada CHARADA com `desenha_ml.conversa`, o prompt com `desenha_ml.prompt_qwen` e lê a resposta com `ler_fala`/`ler_charada`, a mesma regra do jogo. Se a demo não estiver rodando, sobe um servidor temporário do destilado e o encerra no fim.
- Base desligado por memória ou ausência do GGUF do Zé (modo ensaio): aviso.

### D9 — Arquivos de um clique
Os `.bat` chamam `ml\.venv\Scripts\python scripts\<script>.py` a partir da pasta do projeto. Se a venv não existir, explicam como criá-la e param.

## Risks / Trade-offs

- [Com ~3 GB livres, o base talvez não suba junto] → a demo sobe só o destilado e avisa; a comparação no painel cai na reserva. Recomendação no checklist: fechar outros programas antes do evento.
- [A *tag* do llama.cpp pode mudar argumentos do `llama-server`] → versão fixada; o ensaio da tarefa 3.1 confere a linha de comando na versão escolhida.
- [Antivírus pode bloquear o `llama-server.exe` baixado] → o checklist roda o servidor de verdade; se for bloqueado, aparece ✗ com a orientação de liberar a pasta `demo/`.
- [O GGUF do Zé destilado só existe depois do notebook 3] → o modo ensaio (D4) mantém a demo utilizável, e o manifesto o registra; a comparação base × destilado só é válida fora dele. O ensaio final com o Zé treinado é a primeira tarefa do "Workflow follow-up".
- [CORS da porta 8081 e a linha de comando são suposições até o ensaio real] → a tarefa 3.1 os confere com o `llama-server` da *tag* fixada. Se o CORS não vier aberto, a decisão NÃO é tomada em silêncio: a 3.1 para, registra aqui e pede ajuste da spec (alternativa a avaliar: servir o base com `--path` e `Access-Control-Allow-Origin` explícito, ou um proxy local mínimo).
- [O GGUF base tem ~1,1 GB] → só é baixado na preparação, com retomada segura (arquivo `.parcial` renomeado só depois de conferido).
