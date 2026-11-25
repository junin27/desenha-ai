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

## Ensaio com o Zé treinado (v7, GGUF Q8_0) — 25/11/2026, madrugada

Preparação: `preparar_demo.py --gguf-do-ze notebooks/resultados/rodada5/zedorabisco-1.7b-Q8_0.gguf` (base `Qwen3-1.7B-Q8_0.gguf` baixado e conferido por tamanho e SHA-256; métricas da v7 copiadas para o painel com `copiar_modelos.sh`).

- **Checklist (`conferir_demo.py`):** com o `httpd.exe` do EDB PEM na 8080, deu "Não pronto" (Portas ✗ e fala não testada), como deve. Com o serviço `PEMHTTPD-x64` parado: todos os itens ✓ e **"Pronto para o evento"**; fala real do Zé: charada em 7,7 s, 10,7 tokens/s. Fora do modo ensaio o formato errado volta a ser ✗ (o item seguiu o manifesto, `modo_ensaio: false`).
- **Memória com os dois servidores (Zé e base, Q8_0):** 1,99 GiB de *working set* cada; 7,9 GiB livres na máquina (23,7 GiB).
- **Partida completa no navegador (3 rodadas):**
  - rodada 1 (melancia, fácil): a charada do Zé foi recusada (o jogo usou a reserva); o Zé destilado julgou ERROU e narrou, aceito pela regra;
  - rodada 2 (óculos, médio): charada do Zé destilado aceita ("Olha o peão com o nariz e vê o protetor que ajuda a ver melhor, sô!"); as redes puseram óculos em 1º; ACERTOU, +132 pontos, narração do Zé aceita;
  - rodada 3 com o **Qwen3 base** narrando: charada e narração fora do formato, as duas pela reserva.
  - Painel (F2): Zé destilado 3 falas aceitas e 1 reserva; Qwen3 base 0 e 2; CNN 8 ms e LSTM 2,3 ms por palpite; tela "Pensando…" sem o raciocínio durante a charada.
- **Não conferido aqui:** a janela em tela cheia aberta pelo `Iniciar Desenha Aí.bat` (o ensaio usou o navegador do app em `127.0.0.1:8080`), Wi-Fi desligado e a máquina do evento.

## Interface Tinta cinética (change visual-tinta-cinetica, tarefas 6.1 e 6.2)

Tiradas em 25/11/2026 na pasta `tinta-cinetica/` pelo `scripts/capturar_telas.mjs`: o Edge do Windows em modo headless, comandado pelo protocolo de depuração, joga uma partida inteira no build (`vite preview`, porta 4173) com as **redes treinadas** (`modelos_redes.zip`) e **sem** o `llama-server` (charadas e narrações da reserva). As imagens estão no tamanho real do viewport.

O roteiro é sempre o mesmo: abertura → apelido (com o Pergunte ao Zé) → charada → desenho de uma casa (3 traços) com a borracha selecionada → veredito → rodada 2 apertando "Pronto" sem desenhar → rodada 3 com a casa de novo → placar. O desafio é sorteado, então o veredito varia entre as execuções; numa delas o desafio foi "casa" e a captura mostra o ACERTOU com o Zé comemorando.

O que foi conferido em cada execução (o script grava um `*-relatorio.json` ao lado das imagens):
- **1366×768 e 1920×1080:** nenhuma das 9 telas tem rolagem vertical ou horizontal (`scrollHeight <= innerHeight` e `scrollWidth <= innerWidth`).
- **Humores do Zé no momento certo:** torcendo no desenho, coçando a cabeça no ERROU, bravo na rodada sem traço e comemorando no ACERTOU.
- **Movimento reduzido** (`prefers-reduced-motion: reduce` emulado pelo navegador, arquivos `1366x768-reduzido-*`): a partida inteira chega ao placar sem nenhum rabisco de fundo e sem pincelada.

Problemas que as capturas pegaram e já foram corrigidos:
- A ponta arredondada da pincelada ficava desenhada na borda direita da tela depois da animação e escondia as porcentagens dos palpites. Agora a ponta é reta, o caminho passa das bordas e a pincelada some ao terminar.
- O selo "ACERTOU!" encostava na borda esquerda a 1366×768 e foi reduzido.
- O título da abertura ficava pequeno porque o `h1` encolhia dentro do grid.

Não coberto aqui: o momento "Pensando…" da charada (sem o `llama-server` a reserva responde na hora), o Zé respondendo com o modelo de verdade e o FPS das animações no notebook do evento (fica para o ensaio de 29/11).

**Atualização (25/11, tarefa 8.5):** as capturas foram refeitas com as fontes Gochi Hand (títulos) e Patrick Hand (texto), títulos e botões em maiúsculas e os ícones desenhados. Continuam sem rolagem nas 9 telas, a 1366×768, a 1920×1080 e com movimento reduzido.
