# Tasks

## 1. Julgamento do desenho — Python (TDD)

- [x] 1.1 `ensemble.py`: testes da média ponderada, tamanhos diferentes, soma fora de [0,999; 1,001] e peso inválido → implementar; `pytest ml/tests/test_ensemble.py` verde
- [x] 1.2 Top-k em `ensemble.py`: teste do empate decidido pelo índice e de k fora do intervalo → implementar com ordenação estável (D2)
- [x] 1.3 `veredito.py`: testes de ACERTOU, QUASE, ERROU, empate no 1º lugar e alvo inválido → implementar
- [x] 1.4 Vitória antecipada em `veredito.py`: testes dos três cenários (0,85 e 6 s; 0,79; 1,5 s) → implementar com as constantes de D4

## 2. Pontuação e placar — Python (TDD)

- [x] 2.1 `pontuacao.py`: testes de pontos da rodada (125, 101, 30, 0, limites −3 e 25) e da partida (155) → implementar com piso (D3)
- [x] 2.2 Nome no placar: testes de limpeza e de `nome_invalido` → implementar
- [x] 2.3 Ordem do placar: testes de empate por horário e do corte em 10 → implementar

## 3. Vazamento — Python (TDD)

- [x] 3.1 `vazamento.py`: testes de forma comparável (acento, "vaquinha", "aviões", "sóis") → implementar na ordem de D5
- [x] 3.2 Detecção: testes dos seis cenários e do plural das 30 categorias → implementar

## 4. Contrato

- [x] 4.1 Estender `desenha_ml.contratos` para gerar `contratos/regras.json` (seções de D6); teste que regenera e compara com o arquivo versionado

## 5. TypeScript (TDD)

- [x] 5.1 `domain/rodada/ensemble.ts` e `veredito.ts`: testes espelhando os cenários de `julgamento-do-desenho` → implementar
- [x] 5.2 `domain/rodada/pontuacao.ts`: testes espelhando `pontuacao-e-placar` → implementar
- [x] 5.3 `domain/rodada/vazamento.ts`: testes espelhando `vazamento-da-palavra-secreta` → implementar
- [x] 5.4 `tests/contrato-regras.test.ts`: verifica todas as seções de `contratos/regras.json`

## 6. Verificação final

- [x] 6.1 `bash scripts/verificar.sh` verde (ruff, mypy --strict, pytest com doctests, tsc, eslint, prettier, vitest, `openspec validate --all --strict`)

## Workflow follow-up

- Arquivar a change depois da revisão do usuário.
- Nas changes `dataset-do-ze` e `fine-tuning-do-ze`, trocar a regra de veredito e a função `vazou` dos rascunhos dos notebooks pelas deste pacote.
