# Checklist do evento (30/11/2026)

O que **não dá para conferir por programa**. O que dá está em `Conferir Desenha Aí.bat`: rode-o por último e só abra o estande com "Pronto para o evento".

## Na véspera (29/11), com internet

- [ ] `scripts/preparar_demo.py` rodou com o GGUF do Zé destilado (sem ele a demo fica em modo ensaio e o Zé não tem fine-tuning).
- [ ] Voz pt-BR instalada: Configurações → Hora e idioma → Fala → Adicionar vozes → Português (Brasil) → **Microsoft Maria**. Sem ela o jogo funciona, só que mudo.
- [ ] Ensaio completo: uma partida inteira de 3 rodadas, com o painel técnico (F2) aberto, e a comparação base × destilado.
- [ ] Banner e pitch impressos ou no celular (`docs/banner.md`, `docs/pitch.md`).

## No estande, antes de abrir

- [ ] **Carregador** ligado na tomada e notebook em "Alto desempenho" (a CPU precisa de fôlego para o Zé).
- [ ] **Wi-Fi desligado** durante o teste: a demo tem de funcionar sem rede.
- [ ] **Brilho** no máximo e **escala da tela em 100%** (Configurações → Sistema → Tela). Com outra escala o canvas muda de tamanho.
- [ ] **Mouse e caneta** funcionando (se houver mesa digitalizadora, desenhe uma rodada de teste).
- [ ] **Som** do notebook ligado e no volume do ambiente; o Zé fala a cada veredito.
- [ ] **Outros programas fechados** (navegador pessoal, Teams, Spotify): o Qwen3 base só sobe com memória sobrando.
- [ ] `Conferir Desenha Aí.bat` terminou com **Pronto para o evento**.
- [ ] `Iniciar Desenha Aí.bat` aberto, jogo em tela cheia.
- [ ] **Placar zerado**: na tela de início, Ctrl+Shift+Z.

## Plano B (se algo falhar na hora)

- [ ] **Zé não respondeu:** o jogo continua sozinho com a **reserva** (charadas e narrações prontas). Pode seguir a partida e consertar depois.
- [ ] **Jogo travou:** F5 recarrega; o placar fica guardado no perfil da demo.
- [ ] **Servidor caiu:** feche a janela do terminal, abra `Iniciar Desenha Aí.bat` de novo (leva ~1 min).
- [ ] **Sem som:** a narração aparece escrita na tela do mesmo jeito.
