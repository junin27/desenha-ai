# Capturas do jogo (verificação da change jogo-web, tarefa 4.2)

Tiradas em 23/11/2026 no navegador embutido, com o build (`vite preview`), as redes do ensaio local
(`saida/ensaio`) e **sem** o `llama-server` (charadas e narrações vieram da reserva). As imagens foram
reduzidas pela ferramenta de captura para 800 px de largura; o viewport emulado é o do nome do arquivo.

Conferido junto: sem rolagem nas duas resoluções (`scrollHeight == innerHeight`), fontes de 30 px
(1366) e 34 px ou mais (1920) no texto principal, autoteste de paridade aprovado (diferença máxima
2e-7 em 8 desenhos), placar mantido após recarregar a página e todas as requisições para
`localhost`/`127.0.0.1`.

## Bancada do Zé (change bancada-do-ze, tarefa 5.1)

Tiradas em 23/11/2026, também sem o `llama-server`. O que foi conferido:
- "Pergunte ao Zé": a resposta de reserva chegou em menos de 1 s, e a pergunta com palavrão recebeu a resposta de bloqueio sem nenhum pedido ao servidor.
- Com o Qwen3 base escolhido no painel, o pedido da charada foi para a porta 8081.
- Os contadores do painel registraram as falhas por modelo, e o painel aberto não pausou o cronômetro.
- O painel cabe nas duas resoluções sem rolagem; a de 1920 só deixou de rolar depois de um ajuste no CSS.
- O botão de voz mostrou "Voz pt-BR não instalada": o navegador embutido não expõe vozes e o Windows desta máquina só tem a voz Microsoft Zira (en-US). A fala em si foi coberta pelos testes com sintetizador falso; a voz real fica para o checklist da `demo-offline`.

## Ensaio com o llama-server real (change demo-offline, tarefas 3.1 e 3.2)

Feito em 23/11/2026 com o llama.cpp `b12651` e o Qwen3-1.7B Q4_K_M **base** (modo ensaio: o Zé destilado ainda não existe). Sem capturas de tela desta vez: o painel de navegador embutido reduz as imagens e o que importa aqui são números, registrados abaixo.

**Portas.** A 8080 desta máquina está ocupada por um Apache (`httpd.exe`, serviço do EDB PEM) que não foi parado. O ensaio usou as portas 8090 (com `--path demo/jogo`) e 8091, com a mesma linha de comando da demo, e o jogo as recebeu por `?ze=` e `?zebase=`. O checklist flagrou a ocupação da 8080 como ✗.

**Confirmado com o servidor real:**
- As flags da D4 (`-m`, `--host`, `--port`, `-c 2048`, `-n 300`, `--threads 8`, `--parallel 1`, `--path`) foram aceitas pela `b12651`; `/health` respondeu 200 `{"status":"ok"}` em ~10 s e o jogo foi servido pela mesma porta (`index.html` e `modelos/cnn.onnx`).
- **CORS da 8081:** o servidor ecoa a origem (`Access-Control-Allow-Origin: http://127.0.0.1:8091`) e responde ao *preflight* de POST; no navegador, o narrador base da 8091 falou a partir da página da 8090.
- **Streaming no jogo:** Zé na 8090, 106 tokens, **12,9 tokens/s**, 1º token em 1,9 s, 10,0 s no total; a fala de teste do checklist deu 11,3-11,9 tokens/s (129-158 tokens em 10,9-13,9 s).
- **Reserva em ação com o servidor real:** o Qwen3 base sem fine-tuning escreve `<pensamento>`/`<resposta>`, mas sem o prefixo `Charada:` nem o formato `VEREDITO/NARRAÇÃO`; o jogo recusou as duas falas, usou a reserva ("O Zé ficou sem charada!") e contou isso no painel. Uma partida de 3 rodadas não travou.
- **Memória:** cada `llama-server` ocupou **1,75-1,96 GiB** (conjunto de trabalho) para um GGUF de 1,03 GiB. O design previa 0,3 GiB além do arquivo; o medido é ~0,9 GiB, e a constante foi ajustada.

**Checklist (`Conferir Desenha Aí.bat`) nesta máquina:** arquivos ✓ (63 conferidos), voz pt-BR ✓ (Microsoft Daniel), modelos ⚠ (modo ensaio), portas ✗ (Apache na 8080), memória ✗ (0,6 GiB livres na hora, com o IDE Java e navegadores abertos) e fala real ✗ pelo formato do Qwen3 base. "Não pronto" é o resultado correto aqui.

**Segunda rodada, pelo `.bat`** (com a RAM liberada: 3,8 GiB livres): arquivos ✓, portas ✗ (Apache na 8080), memória ✓ (precisa de 1,9 GiB), voz ✓, modelos ⚠ e fala real "não testada: a porta 8080 está ocupada por outro programa" (achado do ensaio: antes o servidor temporário falhava com um erro confuso; agora o item explica). Saída "Não pronto: Portas, Fala real do Zé", código 1 propagado pelo `.bat`.

**Ajustes feitos depois do ensaio** (aprovados na conversa): o limiar do Qwen3 base subiu de 1,5 para 2 GB livres (ele ocupa ~1,9 GiB); no modo ensaio a fala fora do formato do Zé é ⚠ (esperado sem fine-tuning) e não impede o "Pronto para o evento"; e o checklist manual ganhou o item das portas 8080/8081 livres. Fica para depois do notebook 3: conferir com o Zé treinado o limite de 25 s por fala e voltar a exigir o formato (✗).
