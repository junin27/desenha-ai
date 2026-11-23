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
