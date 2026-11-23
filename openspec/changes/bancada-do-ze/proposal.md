# Proposal

## Why

A change `jogo-web` entregou uma partida que funciona, mas o Zé só aparece como texto, e o visitante não vê o que distingue um SLM destilado de um modelo genérico. No estande, a banca avalia as duas disciplinas e o público vota. É preciso **ouvir** o Zé, **conversar** com ele fora da partida, **comparar** o Zé destilado com o Qwen3 base e **mostrar os números** (latência das redes, tokens/s, tamanho em 4 bits, acurácias) sem abrir o terminal. Os quatro extras já foram escolhidos pelo usuário. Eles entram agora porque o evento é em 30/11 e a `demo-offline` depende do endereço do Zé base definido aqui.

**Disciplinas:** ambas. SLM: comparação base × destilado ao vivo, tarefa PERGUNTA, tokens/s e tamanho quantizado. Redes Neurais: latência da CNN e da LSTM no navegador e acurácias do treino no painel.

## What Changes

- **Voz do Zé**: a charada, a narração do veredito e a resposta do "Pergunte ao Zé" são lidas em voz alta pela síntese de voz do próprio navegador, usando **só voz pt-BR instalada no computador** (offline). Um botão liga/desliga fica visível em todas as telas, e a escolha fica gravada no navegador do estande.
- **Pergunte ao Zé**: tela aberta a partir do início, onde o visitante digita uma pergunta (até 200 caracteres) e vê o Zé pensando e respondendo ao vivo (tarefa PERGUNTA do dataset). Há resposta de reserva quando o Zé falha e uma lista de bloqueio para perguntas ofensivas, que são respondidas sem chamar o modelo.
- **Zé base × destilado**: o jogo conhece dois endereços do `llama-server` (destilado e Qwen3 base). Uma chave no painel técnico escolhe qual deles responde nas próximas falas, e um selo na tela mostra ao público qual Zé está falando.
- **Painel técnico ("Bastidores")**: abre por botão discreto ou pela tecla F2 e mostra latência da CNN e da LSTM no último palpite, tempo até o 1º token, tokens/s e tokens da última fala do Zé, origem das falas (Zé ou reserva), discordâncias Zé × regra, resultado do autoteste de paridade e, se os arquivos existirem, as acurácias do treino (`metricas_redes.json`) e a comparação base × destilado e a tabela de quantização (`metricas_slm.json`).

### Fora do escopo (change `demo-offline`)

- Scripts que sobem os dois `llama-server` (destilado na porta 8080, base na 8081), download dos GGUF e inicialização com um clique.
- Instalar a voz pt-BR do Windows (vai para o checklist do evento).

### Fora do escopo do projeto

- Reconhecimento de voz (microfone), vozes baixadas da internet ou síntese em servidor.
- Respostas do Zé base e do destilado lado a lado ao mesmo tempo: em CPU, dois modelos gerando juntos dobram a latência; a comparação é por alternância.
- Moderação por modelo de linguagem: o filtro de perguntas é uma lista de palavras.

## Capabilities

### New Capabilities

- `voz-do-ze`: leitura em voz alta das falas finais do Zé com voz local pt-BR, botão liga/desliga e comportamento sem voz instalada.
- `pergunte-ao-ze`: conversa livre do visitante com o Zé (tarefa PERGUNTA), com limite de tamanho, bloqueio de perguntas ofensivas e reserva quando o Zé falha.
- `comparacao-base-destilado`: escolha, durante o evento, entre o Zé destilado e o Qwen3 base como narrador, com selo visível para o público.
- `painel-tecnico`: medições ao vivo (redes e Zé) e métricas do treino exibidas sob demanda para a banca.

### Modified Capabilities

(nenhuma; as capabilities da `jogo-web` ainda não foram arquivadas, e o comportamento delas não muda)

## Impact

- **Novo código TypeScript:** casos de uso e portas em `app/src/application/` (voz, pergunta, narrador alternável, medições), adaptadores em `app/src/infrastructure/` (síntese de voz do navegador, leitura das métricas) e telas em `app/src/presentation/` (Pergunte ao Zé, painel, botão de voz e selo do Zé).
- **Mudança interna sem mudança de comportamento:** o narrador e o classificador passam a informar tempos (tempo até o 1º token e milissegundos por rede) para o painel.
- **Artefatos opcionais em tempo de execução:** `metricas_redes.json` (notebook 1) e `metricas_slm.json` (notebook 3) copiados por `scripts/copiar_modelos.sh` para `app/public/modelos/`; sem eles, o painel mostra "—".
- **Sem dependência nova:** a síntese de voz é a do navegador (`speechSynthesis`).
- **Depende de:** `jogo-web` (implementada, não arquivada). A `demo-offline` usa os endereços definidos aqui.
