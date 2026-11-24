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

## Treino das redes (Google Colab)

O treino roda no Colab com GPU; a lógica vem do pacote `desenha_ml`, já testado e ensaiado localmente.

1. Gere o pacote: `ml/.venv/Scripts/python -m build --wheel ml` → `ml/dist/desenha_ml-0.1.0-py3-none-any.whl`.
2. No Colab, abra `notebooks/01_redes_neurais_cnn_lstm.ipynb` e escolha *Ambiente de execução → Alterar o tipo → T4 GPU*.
3. Rode a célula 0: um menu de upload abre para você escolher o `.whl` (o painel *Arquivos* também serve).
4. *Ambiente de execução → Executar tudo* (≈ 30–40 min). Ao final, um botão **Salvar … em** abre a janela "Salvar como" para `modelos_redes.zip`, com `cnn.onnx`, `lstm.onnx`, `classes.json`, `metricas_redes.json`, `predicoes_validacao.json`, `teste_paridade_redes.json` e as figuras do banner.
5. Confira no notebook a linha **Critério mínimo**: o treino só vale com o ensemble ≥ 85% e cada rede ≥ 80% de acurácia no teste.

Ensaio local do mesmo pipeline (CPU, amostra pequena, sem critério de qualidade):

```bash
ml/.venv/Scripts/python -m pip install -e "ml[dev,treino]"
ml/.venv/Scripts/python scripts/ensaio_treino_local.py --por-categoria 300 --epocas 2 --saida saida/ensaio
```

## Dataset destilado e fine-tuning do Zé (Google Colab)

**Notebook 2 — dataset** (sem GPU): o menu de upload pede o `.whl` e o `modelos_redes.zip`; coloque a chave gratuita do Gemini nos *Secrets* do Colab como `GEMINI_API_KEY`; execute tudo (≈ 15–25 min). O *checkpoint* fica no Drive (`desenha_ai_so/dataset_ze`), e rodar de novo continua de onde parou. Confira **suficiente: true** (≥ 300 amostras, ≥ 60 por tarefa) e baixe o `dataset_slm.zip`. Ensaio local sem API: `ml/.venv/Scripts/python scripts/ensaio_dataset_local.py`.

**Notebook 3 — fine-tuning** (GPU T4): o menu de upload pede o `.whl`, o `dataset_slm.zip` e o `modelos_redes.zip`. Os downloads pequenos saem por um botão "Salvar como" (Chrome/Edge; se o navegador bloquear a janela dentro do Colab, o botão baixa pelo método normal, e ativar *Perguntar onde salvar cada arquivo* em `chrome://settings/downloads` mostra a janela sempre).
1. (Opcional, já feito em 24/11) `MODO_ENSAIO = True` (≈ 10 min): testa todas as etapas, inclusive a exportação GGUF.
2. O notebook já vem em `MODO_ENSAIO = False`: rode a rodada completa (≈ 40–60 min).
3. Confira a linha **CRITÉRIO DE APROVAÇÃO** (formato ≥ 95%, charada ≥ 85%, veredito ≥ 90%, pergunta ≥ 85% e melhor que o Qwen3 base).
4. O notebook baixa o `resultados_ze.zip` (métricas, saídas do teste e gráficos) e o `zedorabisco-1.7b-Q4_K_M.gguf`; se o download do GGUF falhar, rode de novo só a célula dele.

## Como rodar a demo (estande, offline)

**Antes do evento, com internet** (uma vez):

```bash
bash scripts/copiar_modelos.sh                 # redes e charadas de reserva para o jogo (ensaio ou zip do Colab)
ml/.venv/Scripts/python scripts/preparar_demo.py --gguf-do-ze caminho/zedorabisco-1.7b-Q4_K_M.gguf
```

Sem `--gguf-do-ze` a demo entra no **modo ensaio** (o Qwen3 base ocupa a vaga do Zé; a janela avisa). O comando baixa o `llama-server` (llama.cpp `b12651`, ~25 MB) e o Qwen3-1.7B Q4_K_M (~1,1 GB), monta `demo/` e grava o `demo/manifesto.json` com tamanho e SHA-256 de cada arquivo. Repetir o comando não baixa de novo o que já está íntegro.

**No evento, sem internet:** dê dois cliques em `Iniciar Desenha Aí.bat`. Ele sobe o Zé destilado na porta 8080 (que também serve o jogo), o Qwen3 base na 8081 se houver memória, espera os dois ficarem saudáveis e abre o jogo em tela cheia. Fechar a janela do terminal (ou Ctrl+C) encerra os servidores.

**Antes de abrir o estande:** `Conferir Desenha Aí.bat` confere arquivos, portas, memória, voz pt-BR e uma fala real do Zé, e termina com "Pronto para o evento" ou "Não pronto". O que não dá para automatizar está em [`docs/checklist_evento.md`](docs/checklist_evento.md).

## Créditos e licenças

- Desenhos: [Quick, Draw! Dataset](https://github.com/googlecreativelab/quickdraw-dataset), Google, licença [CC BY 4.0](https://creativecommons.org/licenses/by/4.0/). Uma amostra de 90 desenhos está em `ml/tests/amostras/`.
- Modelo de linguagem base: [Qwen3](https://huggingface.co/Qwen) (Alibaba), licença Apache 2.0.
- Código: Gilberto Aparecido Dias Junior.
