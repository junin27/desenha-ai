# Design

## Context

A primeira change (`pre-processamento-de-desenho`, arquivada) estabeleceu o padrão: núcleo puro em `desenha_ml`, espelho em `app/src/domain`, contrato JSON gerado pelo Python e verificado pelo TypeScript, e erros como valores (`Resultado`). Os rascunhos dos notebooks 2 e 3 (`notebooks/fontes/`) já têm uma regra de veredito e uma função `vazou`, que serão substituídas pelas deste pacote. A motivação está em `proposal.md`, e o comportamento, nas três specs da change.

## Goals / Non-Goals

**Goals:**
- Regras idênticas em Python e TypeScript, provadas por contrato.
- Valores de jogo (limiar de vitória, pontos, bônus) como constantes nomeadas, num só lugar por linguagem, fáceis de calibrar depois do ensaio.

**Non-Goals:**
- Estado da rodada, temporizador e persistência (change `jogo-web`).
- Calibração dos números com dados reais (fica para depois do treino; ver Open Questions).

## Decisions

### D1 — Módulos
- Python: `ensemble.py` (combinação e top-k), `veredito.py` (veredito e vitória antecipada), `pontuacao.py` (rodada, partida, nome, placar), `vazamento.py` (forma comparável e detecção). O `resultado.py` ganha os novos códigos de erro.
- TypeScript: `app/src/domain/rodada/{ensemble,veredito,pontuacao,vazamento}.ts`; o `ErroDePreProcessamento` continua no módulo de desenho, e as regras têm o próprio tipo de erro (`ErroDeRegra`).
- **Alternativa descartada:** um único módulo `regras.py` (misturaria quatro responsabilidades e passaria de 300 linhas).

### D2 — Determinismo do top-k
Ordenação estável por (−probabilidade, índice). Em Python, `sorted` com chave em tupla, e não `np.argsort` (que não é estável no padrão `quicksort`). Em TypeScript, `sort` com comparador de dois níveis (o `Array.prototype.sort` é estável desde o ES2019).

### D3 — Arredondamento do bônus com piso
`round()` do Python arredonda empates para o par (2,5 → 2), e `Math.round` do JS arredonda para cima (2,5 → 3). Usar ⌊ ⌋ (`math.floor` / `Math.floor`) elimina a divergência. **Alternativa descartada:** implementar o mesmo "round half up" nas duas linguagens (mais código pelo mesmo efeito).

### D4 — Valores de jogo
| Constante | Valor | Motivo |
|---|---|---|
| `PROBABILIDADE_DE_VITORIA_ANTECIPADA` | 0,80 | alta o bastante para não encerrar em um palpite instável |
| `SEGUNDOS_MINIMOS_PARA_VITORIA` | 2,0 | evita vitória pelo ruído do primeiro traço |
| `SEGUNDOS_DA_RODADA` | 20 | tempo do jogo (D-01) |
| `PONTOS_ACERTOU` / `PONTOS_QUASE` / `BONUS_MAXIMO` | 100 / 30 / 50 | acertar rápido vale até 50% a mais; "quase" é consolo |
| `RODADAS_POR_PARTIDA` | 3 | partida de ~1–2 min por visitante na fila do evento |
| `TAMANHO_DO_PLACAR` / `TAMANHO_MAXIMO_DO_NOME` | 10 / 16 | cabe na tela do estande |

### D5 — Vazamento: transformação em etapas fixas
Ordem: minúsculas → NFD sem marcas de acento → palavras `[a-z0-9]+` → "qu"→"c", "gu"→"g" → terminações. A ordem importa: a remoção de acento vem antes (senão "ões" não vira "oes"). Em TypeScript, `normalize("NFD")` + remoção de `\p{M}`; em Python, `unicodedata.normalize("NFD")` + filtro por categoria `Mn`. O contrato inclui palavras com ç, ã, é, ó e ê para pegar diferenças entre as duas bibliotecas Unicode.
- **Alternativa descartada:** stemmer de português (RSLP/NLTK) — dependência pesada, sem equivalente idêntico em TypeScript, e o vocabulário do jogo é fechado (30 categorias).

### D6 — Contrato `contratos/regras.json`
Gerado pela mesma CLI (`python -m desenha_ml.contratos contratos/`, que passa a gerar os dois arquivos), com seções `ensemble`, `top_k`, `veredito`, `vitoria_antecipada`, `pontos_da_rodada`, `nome`, `placar`, `forma_comparavel` e `vazamento`. Comparação exata no TypeScript, exceto as probabilidades do ensemble (1e-12).

### D7 — Nome: espaços explícitos e contagem por caractere (achado na implementação)
`str.split()` do Python e `\s` do JavaScript não tratam os mesmos caracteres como espaço, e `len()` (pontos de código) difere de `.length` (unidades UTF-16) em emojis. As duas linguagens usam o conjunto `[ \t\n\r ]` e contam pontos de código (`[...nome].length` no TypeScript). O contrato inclui um nome com 16 emojis.

## Risks / Trade-offs

- [Falsos positivos de vazamento ("soldado" para "sol", "casca" para "casa")] → aceitos de propósito: no jogo, só trocam a charada por uma da reserva; na curadoria, descartam uma amostra a mais. A taxa será medida na curadoria (change `dataset-do-ze`).
- [Limiar de 0,80 alto demais para desenhos difíceis] → é só um atalho: sem vitória antecipada, a rodada termina pelo tempo e o veredito sai normalmente.
- [Placar com empate exato de pontos e horário] → horário com milissegundos; o empate residual mantém a ordem de chegada (ordenação estável).

## Open Questions

- Calibrar `PROBABILIDADE_DE_VITORIA_ANTECIPADA` e os pontos depois do treino, usando a curva de "reconhecimento antecipado" do notebook 1 e o ensaio de 29/11. A mudança é só de constantes e de cenários de exemplo, sem alterar a estrutura.
