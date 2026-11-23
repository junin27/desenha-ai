# Tasks

## 1. Medições e narrador alternável (aplicação, TDD com dublês)

- [x] 1.1 Porta `Relogio` com `instante()` (monotônico) e `RelogioDoNavegador` com `performance.now()`: testes do adaptador e dos dublês verdes
- [x] 1.2 `MedicoesDaSessao` + `ClassificadorMedido` (ms da CNN e da LSTM por palpite): testes "Depois de um traço" → implementar
- [x] 1.3 `NarradorMedido` (tempo até o 1º token, duração, tokens, tokens/s, falhas por código, Zé × reserva × discordância por modelo): testes "Fala medida" e "Servidor desligado contado" → implementar
- [ ] 1.4 `NarradorAlternavel` + campo `modelo` na `FalaFinal` + `modeloDaFala` na charada e na narração da `Partida`: testes "Trocar para o base", "Troca no meio de uma fala" e "Base fora do formato" → implementar; testes da `jogo-web` continuam verdes

## 2. Pergunte ao Zé (domínio e aplicação)

- [ ] 2.1 `perguntaBloqueada` em `domain/ze/bloqueio.ts`: testes com acento, maiúscula e palavra parecida que não é ofensa → implementar
- [ ] 2.2 `ConversaComOZe` (abrir, perguntar, voltar; só com a partida em `inicio`): testes "Ida e volta", "Pergunta vazia", "Pergunta longa demais", "Resposta do Zé", "Uma pergunta por vez", "Zé desligado" e "Palavra bloqueada" → implementar
- [ ] 2.3 `ReservaDoZe.resposta()` e `respostaBloqueada()` na `ReservaDeArquivo`, com 6 respostas-modelo: testes de formato (sem marcadores, estilo do Zé) → implementar

## 3. Voz do Zé

- [ ] 3.1 Porta `VozDoZe` e adaptador `VozDoNavegador` com sintetizador falso: testes "Só voz online disponível", "Preferência pelo português do Brasil" e vozes que chegam depois (`voiceschanged`) → implementar
- [ ] 3.2 `PreferenciasDoEstande` no `localStorage` (leitura tolerante): teste "Recarregar mantém a escolha" → implementar
- [ ] 3.3 `LeitorEmVoz` assinando partida e conversa: testes "Charada de reserva falada", "Pensamento não é falado", "Troca de tela interrompe a fala" e "Desligar no meio da fala" → implementar

## 4. Telas e composição

- [ ] 4.1 Tela "Pergunte ao Zé" e botão na tela de início (happy-dom): campo, Perguntar desativado enquanto responde, Zé ao vivo, resposta e Voltar → implementar
- [ ] 4.2 Botão de voz e selo do Zé (destilado, base, reserva) nas telas de charada, veredito e pergunta (happy-dom): teste "Selo da reserva" → implementar
- [ ] 4.3 Leitura de `metricas_redes.json` e `metricas_slm.json` (tolerante) e `copiar_modelos.sh` copiando as métricas: testes com os arquivos do ensaio e "Sem métricas do SLM" → implementar
- [ ] 4.4 `PainelTecnico` (botão "Bastidores", F2, chave base × destilado, medições, paridade e métricas do treino) com happy-dom: teste "Painel durante o desenho" → implementar
- [ ] 4.5 `main.ts`: dois narradores (`?ze=`, `?zebase=`), decoradores de medição, voz e conversa: teste "Endereço do base pela URL" na função que lê a URL → implementar

## 5. Verificação

- [ ] 5.1 Navegador embutido com o build e as redes do ensaio: partida com a voz ligada (fala conferida pelo console do sintetizador), "Pergunte ao Zé" sem o `llama-server` (reserva e bloqueio), painel aberto durante o desenho e chave base × destilado; capturas a 1366×768 e 1920×1080 em `docs/capturas/`
- [ ] 5.2 `bash scripts/verificar.sh` verde (pytest, mypy, ruff, vitest, lint, typecheck, build) e `openspec validate --all --strict`

## Workflow follow-up

- Testar a alternância com os dois `llama-server` reais e os GGUF na change `demo-offline`.
- Arquivar `jogo-web` e `bancada-do-ze` depois do teste com o Zé real.
