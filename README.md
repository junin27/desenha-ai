# 🎨 Desenha Aí, Sô!

Um jogo em que você resolve uma charada, desenha a resposta e duas redes neurais tentam adivinhar o desenho **enquanto você desenha**. Um *Small Language Model* com sotaque goiano, o **Zé do Rabisco**, cria as charadas, julga o resultado e narra a partida como um locutor de rodeio. Tudo roda **offline**, num notebook comum e sem GPU.

> Trabalho final das disciplinas **Redes Neurais** e **Small Language Models** (Engenharia de Software, UniRV, prof. Sandro Moreira), apresentado no 5º Workshop de Trabalhos de IA da FASOFT em 30/11/2026.

## Como funciona

| Peça | O que faz | Técnica |
|---|---|---|
| **CNN** | enxerga o desenho como imagem 28×28 | convoluções e blocos residuais |
| **LSTM** | lê o desenho como sequência de traços, na ordem em que foi feito | rede recorrente bidirecional |
| **Ensemble** | combina as probabilidades das duas | média ponderada |
| **Zé do Rabisco** | cria charadas, dá o veredito e responde perguntas | Qwen3-1.7B destilado de um LLM professor, QLoRA (Unsloth), GGUF de 4 bits no llama.cpp |

O desenho do visitante passa pelo **mesmo pré-processamento** usado no treino. Ele existe em Python e em TypeScript, e um teste de contrato garante que as duas versões dão o mesmo resultado (ver `contratos/`).

## Estrutura

```
openspec/     especificações (SDD com OpenSpec): o que o sistema faz e as mudanças em andamento
ml/           pacote Python desenha_ml: núcleo puro e testado (pré-processamento, regras, curadoria)
notebooks/    notebooks do Google Colab (treino), gerados a partir de notebooks/fontes/
app/          jogo web em TypeScript, arquitetura hexagonal (domain, application, infrastructure, presentation)
contratos/    fixtures geradas pelo Python e verificadas pelo TypeScript
docs/         decisões de arquitetura, roteiro, banner e pitch
```

## Desenvolvimento

O projeto segue **SDD** (toda mudança começa por uma spec no [OpenSpec](https://openspec.dev/)) e **TDD** (o teste vem antes do código). As regras de trabalho estão em [`CLAUDE.md`](CLAUDE.md), e as decisões, em [`docs/decisoes.md`](docs/decisoes.md).

```bash
# Python (núcleo)
python -m venv ml/.venv && ml/.venv/Scripts/python -m pip install -e "ml[dev]"

# TypeScript (app)
npm --prefix app install

# verificação completa: ruff, mypy --strict, pytest (+ doctests), tsc, eslint, prettier, vitest, openspec
bash scripts/verificar.sh

# regenerar o contrato Python -> TypeScript depois de mudar o pré-processamento
ml/.venv/Scripts/python -m desenha_ml.contratos contratos/
```

## Créditos e licenças

- Desenhos: [Quick, Draw! Dataset](https://github.com/googlecreativelab/quickdraw-dataset), Google, licença [CC BY 4.0](https://creativecommons.org/licenses/by/4.0/). Uma amostra de 90 desenhos está em `ml/tests/amostras/`.
- Modelo de linguagem base: [Qwen3](https://huggingface.co/Qwen) (Alibaba), licença Apache 2.0.
- Código: Gilberto Aparecido Dias Junior.
