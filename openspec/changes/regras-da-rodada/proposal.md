# Proposal

## Why

As regras do jogo (quem ganhou, quantos pontos, se a charada entregou a resposta) são usadas em três lugares: no **jogo** (TypeScript), na **curadoria do dataset** do SLM e na **avaliação do Zé destilado** (Python). Se cada lugar tiver a sua versão, o Zé aprende um veredito, o placar aplica outro e a métrica do banner mede um terceiro. A curadoria do dataset (change `dataset-do-ze`) não pode começar sem essas regras fechadas.

**Disciplinas:** ambas. O veredito lê as probabilidades da CNN e da LSTM (Redes Neurais), e é a resposta "correta" que o SLM precisa reproduzir e contra a qual é avaliado (SLM).

## What Changes

- **Ensemble:** combina as probabilidades da CNN e da LSTM com o peso `w_cnn` e produz o top-k com desempate determinístico.
- **Veredito:** `ACERTOU` (1º palpite = desenho pedido), `QUASE` (desenho pedido entre os 3 primeiros) ou `ERROU`.
- **Vitória antecipada:** a rodada termina antes do tempo quando o ensemble já reconhece o desenho com confiança.
- **Pontuação e placar:** pontos por rodada com bônus de tempo, total da partida e ranking ordenado.
- **Vazamento da palavra secreta:** detecta se uma charada contém a resposta (sem acento, plural, diminutivo, variações como "vaquinha" e "aviões").
- Implementação em `desenha_ml` e em `app/src/domain`, com o contrato `contratos/regras.json` gerado pelo Python e verificado pelo TypeScript (mesmo padrão da change anterior).

### Fora do escopo

- Máquina de estados da rodada (charada → desenho → julgamento → resultado), temporizador e telas: change `jogo-web`.
- Interpretação do texto gerado pelo Zé (tags `<pensamento>`/`<resposta>`, linha `VEREDITO:`): change `dataset-do-ze`.
- Persistência do placar (localStorage): change `jogo-web`. Aqui entra só a regra de ordenação.
- Moderação de nomes ofensivos no placar (feito pela organização, na bancada).
- Detectar sinônimos ou traduções da palavra secreta (ex.: "pássaro" para "passarinho", "cat" para "gato").

## Capabilities

### New Capabilities

- `julgamento-do-desenho`: combina as saídas das redes no ensemble, ordena os palpites e decide o veredito e a vitória antecipada.
- `pontuacao-e-placar`: calcula os pontos de cada rodada e da partida e ordena o placar.
- `vazamento-da-palavra-secreta`: decide se um texto (charada) revela a palavra secreta.

### Modified Capabilities

(nenhuma)

## Impact

- **Novo código:** `ml/src/desenha_ml/{ensemble,veredito,pontuacao,vazamento}.py` e os equivalentes em `app/src/domain/rodada/`.
- **Contrato:** `contratos/regras.json` e a extensão do gerador `desenha_ml.contratos`.
- **Sem novas dependências.**
- **Rascunhos dos notebooks 2 e 3:** a regra do veredito e a detecção de vazamento que estão escritas neles passam a vir do pacote (ajuste nas changes `dataset-do-ze` e `fine-tuning-do-ze`).
