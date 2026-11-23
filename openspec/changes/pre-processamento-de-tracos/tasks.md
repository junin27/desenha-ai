# Tasks

## 1. Estrutura dos projetos

- [x] 1.1 Criar `ml/` (pyproject com hatchling, layout `src/`, extras `dev`), o venv `ml/.venv` e instalar; verificar com `pytest` rodando sem testes e `mypy --strict` + `ruff check` verdes
- [x] 1.2 Criar `app/` (Vite + TypeScript strict + Vitest + ESLint + Prettier) com as pastas `domain/application/infrastructure/presentation`; verificar `npm test`, `lint` e `typecheck` verdes
- [x] 1.3 Escrever o teste de arquitetura `app/tests/arquitetura.test.ts` (domain não importa nada externo; application só importa domain) e verificar que ele falha com um import proibido de propósito e passa sem ele

## 2. Núcleo em Python (TDD, um módulo por vez)

- [x] 2.1 `resultado.py` e `desenho.py`: testes de desenho vazio e traços vazios ignorados → implementar; verificar `pytest ml/tests/test_desenho.py`
- [x] 2.2 `normalizacao.py`: testes dos cenários "mais largo que alto" e "ponto único" → implementar
- [x] 2.3 `simplificacao.py` (RDP iterativo, ε = 2): testes de colineares removidos e canto preservado → implementar
- [x] 2.4 `prefixo.py`: testes de corte no meio do traço, mínimo de 2 pontos e fração inválida → implementar
- [x] 2.5 `rasterizacao.py`: testes de valores k/16, linha horizontal, ponto isolado e espessura → implementar vetorizado
- [x] 2.6 `sequencia.py`: testes de dois traços e corte em 130 → implementar
- [x] 2.7 Medir a rasterização de 1.000 desenhos de amostra e registrar o tempo no `design.md` (meta: ≤ 2 ms por desenho)

## 3. Contrato

- [x] 3.1 Adicionar `ml/tests/amostras/quickdraw_amostra.ndjson` (poucos desenhos reais, com atribuição CC BY 4.0)
- [x] 3.2 `contratos.py` (CLI) gera `contratos/pre_processamento.json` com os casos exigidos pela spec; teste que regenera em memória e compara com o arquivo versionado

## 4. Núcleo em TypeScript (TDD)

- [x] 4.1 `domain/resultado.ts` e `domain/desenho/` (desenho, normalização, simplificação, prefixo): testes espelhando os cenários da spec → implementar
- [x] 4.2 `domain/desenho/rasterizacao.ts` e `sequencia.ts`: testes dos cenários → implementar
- [x] 4.3 `tests/contrato-pre-processamento.test.ts`: lê `contratos/pre_processamento.json` e verifica as tolerâncias da spec
- [ ] 4.4 Teste de desempenho: mediana ≤ 15 ms para 130 pontos (50 execuções)

## 5. Verificação final

- [ ] 5.1 Rodar pytest, mypy --strict, ruff, vitest, eslint, tsc e `openspec validate --all --strict`; todos verdes
- [ ] 5.2 Atualizar o README com os comandos de teste e a atribuição do Quick, Draw!

## Workflow follow-up

- Arquivar a change com `/openspec-archive-change` depois da revisão do usuário.
- Na change `treino-das-redes`, trocar o pré-processamento do notebook 1 pelo pacote.
