# Proposal

## Why

A interface atual cumpre as regras, mas é estática: texto sobre papel, o Zé é só um balão e nada no estande chama quem está passando. O usuário aprovou, em 25/11/2026, o protótipo `prototipos_visual/9_jogavel_tinta_cores.html` (direção "Tinta cinética", com a paleta do jogo atual e um Zé desenhado com expressões animadas). Esta change leva esse visual e essas funções para o jogo de verdade antes do evento de 30/11, sem mexer em redes, dataset, avaliação ou no modelo do Zé.

Disciplinas: as duas. As telas novas mostram ao público o que as **Redes Neurais** fazem (palpites ao vivo e o que a CNN, a LSTM e o ensemble acharam no veredito) e dão rosto ao **SLM** (o Zé com humor ligado ao que ele está fazendo: pensando enquanto gera, falando enquanto narra).

## What Changes

- **Tela de abertura nova**, antes de tudo: título que se desenha, chamada de marketing, números reais (acurácia do ensemble, 30 categorias, 20 s), uma demonstração em loop (um desenho se fazendo com os palpites mudando), os 3 passos do jogo e o botão "Jogar agora". O Zé aparece chamando o visitante.
- **Tela de apelido + Pergunte ao Zé**: o apelido (com sugestões prontas) e a conversa com o Zé ficam lado a lado; o "Pergunte ao Zé" deixa de ser uma tela separada aberta por botão.
- **Zé como personagem**: um desenho original (chapéu de palha, camisa xadrez, capim na boca, lápis na orelha) com 9 humores animados ligados a momentos do jogo: neutro, falando, pensando, torcendo, assustado (últimos 5 s), comemorando (ACERTOU), coçando a cabeça (QUASE/ERROU), bravo (Pronto sem nenhum traço) e entediado (30 s sem interação fora do desenho).
- **Desenho**: ferramenta **borracha** que apaga traços inteiros, além de lápis e "Limpar"; cronômetro em anel que treme nos últimos 5 s; palpites como barras de marcador animadas.
- **Veredito ilustrado**: o desenho do visitante, o selo ACERTOU!/QUASE!/ERROU escrito e circulado à mão, o palpite principal de cada rede (CNN, LSTM, ensemble) e confete no acerto.
- **Placar**: pódio animado com as 5 melhores partidas e uma lista com **pesquisa por apelido** e **ordenação** por pontos, nome ou mais recentes, mostrando a posição real de cada partida.
- **Identidade visual "Tinta cinética"** com a paleta atual (papel `#f7ecd4`, tinta `#2b1a0a`, terracota `#b5401f`, mostarda `#c98a00`, verde `#2f7d32`, vermelho `#b3261e`): contornos de caneta, sombras chapadas, manchas de aquarela e rabiscos que se desenham no fundo, transição de tela por pincelada; tudo respeitando `prefers-reduced-motion`.

### Fora do escopo

- Treinamento, dataset, avaliação, prompts e o GGUF do Zé; as regras de veredito e de pontos (continuam as das specs `julgamento-do-desenho` e `pontuacao-e-placar`).
- Voz nova do Zé (segue a voz do Windows, decisão do usuário de 25/11).
- Usar personagem de terceiros (o usuário sugeriu o Chico Bento; recusado por ser personagem registrado da Mauricio de Sousa Produções). O Zé é um desenho original.
- Mostrar a palavra secreta junto com a charada: o jogo continua como hoje (o visitante adivinha a charada; a palavra aparece só no veredito, "Era: …"). O protótipo mostrava a palavra; isso foi uma simplificação dele.
- Ranking online, contas de usuário ou qualquer recurso que precise de internet.
- Painel técnico (F2) e comparação base × destilado: continuam funcionando, só ganham a paleta nova.

## Capabilities

### New Capabilities
- `tela-de-abertura`: tela antes da partida que apresenta o jogo com demonstração em loop e leva à tela de apelido com o Pergunte ao Zé.
- `personagem-do-ze`: o Zé como personagem desenhado, seus humores animados e quando cada um aparece.
- `ferramentas-de-desenho`: lápis, borracha por traço e limpar, e como a borracha mantém imagem e sequência de traços coerentes para as redes.
- `veredito-ilustrado`: o que a tela de veredito mostra (desenho, selo, palpite de cada rede, comemoração).
- `placar-com-busca`: pódio do top 5, pesquisa por apelido e ordenação da lista do placar.
- `identidade-visual`: paleta, estilo de traço, movimento e as garantias de legibilidade, de offline e de movimento reduzido.

### Modified Capabilities
- `pontuacao-e-placar`: o requisito "Ordem do placar" deixa de limitar a exibição às 10 primeiras; a ordem oficial continua a mesma e passa a numerar todas as partidas (o pódio e a lista usam essa posição).

## Impact

- **Código:** `app/src/presentation/` (telas novas `tela-abertura` e o Zé em SVG, telas de início, charada, desenho, veredito e fim reescritas, `estilo.css` novo) e `app/src/presentation/captura-do-desenho.ts` (borracha). Possível caso de uso novo em `application/` para apagar um traço da partida, se a borracha precisar atualizar os palpites pelo fluxo da aplicação.
- **Domínio:** função pura nova para apagar traços tocados por um ponto (com raio), testada; a ordenação e a busca do placar viram funções puras em `domain/` (a ordem oficial continua a de `pontuacao-e-placar`).
- **Contratos:** nenhum contrato Python ↔ TypeScript muda (o pré-processamento recebe a lista de traços que sobrou depois da borracha, no mesmo formato).
- **Dependências:** nenhuma nova; tudo em SVG, CSS e canvas, sem biblioteca de animação e sem fonte externa.
- **Specs de changes ainda não arquivadas:** `jogo-web/interface-do-jogo` ("Telas da partida" e "Captura do desenho") e `bancada-do-ze/pergunte-ao-ze` (Pergunte ao Zé como tela própria) ficam desatualizadas por esta change; arquivar as 6 changes concluídas **antes** de arquivar esta e então ajustar esses requisitos (tarefa no `tasks.md`).
