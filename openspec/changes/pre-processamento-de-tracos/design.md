# Design

## Context

O projeto ainda não tem código: só os rascunhos dos notebooks (`notebooks/fontes/`), cujo pré-processamento usa OpenCV (`cv2.polylines` com antialias) e prevê um canvas HTML no jogo. Os dois rasterizadores têm antialias diferente, e não há como testar a igualdade sem navegador. A motivação está em `proposal.md` (seção Why), e o comportamento exato, nos cenários da spec `pre-processamento-de-desenho`.

## Goals / Non-Goals

**Goals:**
- Uma única definição matemática do pré-processamento, implementada duas vezes (Python e TypeScript) e amarrada por fixtures.
- Núcleo sem I/O e sem dependências pesadas: Python só com `numpy`; TypeScript sem DOM.
- Rasterizar o dataset de treino (~270 mil desenhos, completos e parciais) em até ~10 min no Colab.

**Non-Goals:**
- Aumento de dados geométrico e dataloaders (notebook de treino).
- Otimização com GPU do rasterizador.

## Decisions

### D1 — Rasterização por cobertura geométrica, sem canvas nem OpenCV
Para cada pixel, contamos quantos dos 16 subpontos (grade 4×4) estão a uma distância ≤ espessura/2 de algum segmento do traço. Isso gera um *antialias* determinístico (valores k/16) com a mesma conta nas duas linguagens.
- **Implementação eficiente:** para cada segmento, só os subpontos dentro da sua caixa delimitadora (expandida pelo raio) são avaliados. Em Python isso é vetorizado com `numpy` sobre uma máscara 112×112 (28 × 4), depois reduzida por média de blocos 4×4. Em TypeScript, um `Uint8Array` 112×112 com laços simples.
- **Alternativas descartadas:** canvas + OpenCV (antialias diferente, sem teste possível no Node); renderizar em 280×280 e reduzir (10× mais trabalho, mesma divergência); `node-canvas` nos testes (dependência nativa pesada no Windows, e ainda diferente do OpenCV).

### D2 — Coordenadas da grade
O pixel (linha i, coluna j) ocupa [j, j+1) × [i, i+1); os subpontos ficam em j + (k + 0,5)/4. O desenho normalizado (0–255) é multiplicado por 22/255 e deslocado em (28 − largura·22/255)/2 e (28 − altura·22/255)/2. A espessura padrão de 1,6 pixel equivale aos 16 px do rascunho em escala 280.

### D3 — Erros como valores
`Resultado<T, ErroDePreProcessamento>` nas duas linguagens (`desenho_vazio`, `fracao_invalida`). Em Python, uma união `Ok[T] | Erro` com `@dataclass(frozen=True)`; em TypeScript, uma união discriminada `{ ok: true, valor } | { ok: false, erro }`.

### D4 — Contrato versionado em `contratos/pre_processamento.json`
O Python é a referência (o treino usa ele). O comando `python -m desenha_ml.contratos <pasta>` gera o arquivo; um teste do Python regenera em memória e compara com o versionado, o que impede esquecer de regenerar. O desenho real do Quick, Draw! vem de um arquivo pequeno de amostra versionado em `ml/tests/amostras/` (licença CC BY 4.0, com atribuição no README), para os testes não dependerem de rede.
- **Alternativa descartada:** TypeScript como referência (o treino rodaria em Node, fora do Colab).

### D5 — Estrutura de pastas
- `ml/src/desenha_ml/`: `desenho.py` (tipos e validação), `normalizacao.py`, `simplificacao.py` (RDP), `prefixo.py`, `rasterizacao.py`, `sequencia.py`, `resultado.py`, `contratos.py` (CLI).
- `app/src/domain/desenho/`: os mesmos módulos em TypeScript; `app/src/domain/resultado.ts`.
- Testes: `ml/tests/test_<modulo>.py`; `app/tests/domain/desenho/*.test.ts` e `app/tests/contrato-pre-processamento.test.ts`.
- RDP iterativo (pilha) nas duas linguagens, para evitar estouro de recursão em traços longos.

### D6 — Ferramentas
- Python: `pyproject.toml` com hatchling, `pytest`, `mypy --strict`, `ruff` (lint e format). Ambiente local em `ml/.venv` (Python 3.15).
- TypeScript: Vite, `typescript` em modo `strict` com `noUncheckedIndexedAccess`, Vitest, ESLint (typescript-eslint) e Prettier. Nesta change, só a camada `domain` e a configuração do projeto; o teste de arquitetura de camadas entra junto, já valendo para as próximas changes.

### D7 — Medição do rasterizador (tarefa 2.7, 23/11/2026)
90 desenhos reais da amostra (média de 47 pontos e 42 segmentos, máximo de 148 pontos), 12 repetições, nesta máquina (CPU, Python 3.15, numpy 2.5):

| Versão | Mediana | p95 |
|---|---|---|
| 1ª (meshgrid + `hypot` por segmento) | 2,88 ms | 6,38 ms |
| Otimizada (broadcasting linha × coluna, distância ao quadrado) | **1,42 ms** | 3,03 ms |

A versão otimizada é conferida **pixel a pixel** contra uma implementação de referência direta (todo subponto contra todo segmento) nos 90 desenhos (`test_rasterizacao_otimizada_igual_a_referencia_em_desenhos_reais`). A sequência stroke-3 leva 0,05 ms. Estimativa no Colab (2 núcleos, ~480 mil rasterizações entre completas e parciais): cerca de 6 a 9 minutos.

### D8 — Empate no RDP e ordem das contas (achado do teste de contrato, 23/11/2026)
O primeiro teste de contrato falhou no caso `denso_capturado` (círculo de 301 pontos): Python e TypeScript mantinham pontos diferentes. Num traço simétrico, dois pontos ficam à mesma distância do segmento; o Python calculava o produto escalar com `@` (outra ordem de soma) e o JavaScript termo a termo, e a última casa decimal decidia o `argmax` de cada lado. Correção nas duas linguagens:
1. A distância ao segmento é calculada termo a termo, na mesma ordem (`geometria.py` / `geometria.ts`).
2. Distâncias a até 1e-9 do máximo contam como empate, e vence o **menor índice** (testes de regressão nos dois lados).
- **Alternativa descartada:** aumentar a tolerância do contrato para pontos (esconderia a divergência em vez de corrigir; no jogo, o desenho do visitante seria simplificado diferente do treino).

## Risks / Trade-offs

- [Rasterização em Python lenta para 540 mil imagens] → vetorizar por segmento e usar `multiprocessing` no Colab; medir no notebook e, se passar de 15 min, guardar os arrays no Drive para reaproveitar.
- [Pequenas diferenças de ponto flutuante na borda do raio (distância exatamente igual a r)] → a tolerância do contrato aceita até 2 pixels por imagem com diferença de 1/16; os testes da spec usam casos longe da borda.
- [Imagem sem antialias "de verdade" fica diferente dos bitmaps oficiais do Quick, Draw!] → não usamos os bitmaps oficiais; treino e jogo usam o nosso rasterizador, então são coerentes entre si.
- [RDP do navegador diferente do usado pelo Google no dataset] → mesmo ε (2,0) nas mesmas coordenadas (0–255); diferenças residuais são absorvidas pelo aumento de dados.
