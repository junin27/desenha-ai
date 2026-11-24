# %% [markdown]
# # 🎨 Desenha Aí, Sô! — Parte 1: Redes Neurais (CNN × LSTM)
#
# **UniRV – Universidade de Rio Verde · Engenharia de Software · 8º período**
# **Disciplinas:** Redes Neurais · Small Language Models — **Prof.:** Sandro S. Moreira
# **Discente:** Gilberto Aparecido Dias Junior
#
# ---
#
# O visitante desenha a resposta de uma charada e duas redes neurais tentam reconhecer o rabisco **enquanto ele desenha**:
#
# | Rede | Enxerga o desenho como… | Conteúdo da disciplina |
# |---|---|---|
# | **CNN** (`RabiscoNet`) | imagem 28×28 | convolução, blocos residuais, *pooling* |
# | **LSTM** (`TracoLSTM`) | sequência de traços (Δx, Δy, fim do traço) | RNN, memória de longo prazo, portas, BPTT |
# | **Ensemble** | média ponderada das duas | peso escolhido na validação |
#
# **Pergunta do banner:** imagem ou sequência — quem entende melhor um rabisco, e quem adivinha mais cedo?
#
# **Como este notebook é organizado.** Toda a lógica (pré-processamento, separação dos dados, arquiteturas, treino, métricas,
# exportação ONNX e formato dos artefatos) está no pacote `desenha_ml`, com mais de 200 testes automatizados e especificação
# no OpenSpec (`openspec/specs/treino-das-redes`). O notebook só **orquestra** e **mostra** os resultados. O mesmo pipeline foi
# executado antes num ensaio local em CPU (`scripts/ensaio_treino_local.py`).
#
# **Dados:** [Google Quick, Draw!](https://github.com/googlecreativelab/quickdraw-dataset) (*simplified*, CC BY 4.0), 30 categorias,
# 9.000 desenhos reconhecidos por categoria (7.000 treino · 1.000 validação · 1.000 teste).
#
# > **Antes de rodar:** *Ambiente de execução → Alterar o tipo → **T4 GPU***. Rode a célula 0: abre um menu
# > de upload para o `desenha_ml-0.1.0-py3-none-any.whl` (pasta `ml/dist/` do projeto). Tempo total ≈ 30–40 min.

# %% [markdown]
# ## 0. Instalação do pacote do projeto

# %%
import glob
import os

from google.colab import files

PASTA_DOS_ARQUIVOS = "/content"


def exigir_arquivos(*padroes):
    """Abre o menu de upload do Colab enquanto faltar algum arquivo (eles caem em /content)."""
    os.chdir(PASTA_DOS_ARQUIVOS)
    while faltando := [p for p in padroes if not glob.glob(os.path.join(PASTA_DOS_ARQUIVOS, p))]:
        print("Faltam:", ", ".join(faltando), "→ escolha o(s) arquivo(s) na janela de upload que abriu.")
        if not files.upload():
            raise FileNotFoundError("Nenhum arquivo enviado; ainda faltam: " + ", ".join(faltando))

# %%
exigir_arquivos("desenha_ml-*.whl")
RODA = glob.glob("/content/desenha_ml-*.whl")
%pip install -q "{RODA[0]}[treino]" onnxscript

# %%
import json, multiprocessing, os, time, zipfile
from concurrent.futures import ThreadPoolExecutor
from pathlib import Path

import matplotlib.pyplot as plt
import numpy as np
import pandas as pd
import seaborn as sns
import torch

from desenha_ml.categorias import CATEGORIAS
from desenha_ml.fonte_quickdraw import baixar_desenhos
from desenha_ml.pipeline import ParametrosDoPipeline, executar_pipeline
from desenha_ml.rasterizacao import rasterizar
from desenha_ml.prefixo import prefixo
from desenha_ml.resultado import Erro

DISPOSITIVO = "cuda" if torch.cuda.is_available() else "cpu"
print("PyTorch", torch.__version__, "| dispositivo:", DISPOSITIVO, torch.cuda.get_device_name(0) if DISPOSITIVO == "cuda" else "")
SAIDA = Path("/content/modelos_redes")
FIGURAS = SAIDA / "figuras"
FIGURAS.mkdir(parents=True, exist_ok=True)
PT = [c.pt for c in CATEGORIAS]

# %% [markdown]
# ## 1. Download por streaming (só desenhos com `recognized = true`)

# %%
POR_CATEGORIA = 9_000
inicio = time.time()
with ThreadPoolExecutor(8) as executor:
    desenhos = dict(executor.map(lambda c: (c.en, baixar_desenhos(c.en, POR_CATEGORIA)), CATEGORIAS))
print(f"{sum(map(len, desenhos.values())):,} desenhos em {time.time() - inicio:.0f}s")

# %% [markdown]
# ### Como as redes enxergam um desenho sendo feito
# A imagem 28×28 vem da rasterização própria do projeto (cobertura geométrica), **idêntica** à do jogo no navegador — garantido
# por um teste de contrato Python ↔ TypeScript.

# %%
exemplo = desenhos["cow"][0]
fig, eixos = plt.subplots(1, 4, figsize=(12, 3))
for eixo, fracao in zip(eixos, [0.25, 0.5, 0.75, 1.0]):
    eixo.imshow(rasterizar(prefixo(exemplo, fracao).valor), cmap="gray")
    eixo.set_title(f"{int(fracao * 100)}% dos pontos")
    eixo.axis("off")
plt.suptitle("“vaca” como a CNN enxerga conforme o desenho avança")
plt.tight_layout(); plt.savefig(FIGURAS / "desenho_progressivo.png", dpi=150); plt.show()

# %% [markdown]
# ## 2. Pipeline completo (o mesmo código do ensaio local)
# Separação → exemplos completos e parciais → treino da CNN e da LSTM (15 épocas cada, GPU) → peso do ensemble **na validação** →
# métricas **no teste** → curva de reconhecimento antecipado → exportação ONNX conferida contra o PyTorch → artefatos.

# %%
inicio = time.time()
with multiprocessing.Pool() as processos:
    resultado = executar_pipeline(desenhos, ParametrosDoPipeline(dispositivo=DISPOSITIVO), SAIDA, processos.map)
if isinstance(resultado, Erro):
    raise RuntimeError(f"{resultado.codigo}: {resultado.detalhe}")
r = resultado.valor
print(f"Pipeline concluído em {(time.time() - inicio) / 60:.1f} min · tempos (s):", {k: round(v) for k, v in r.tempos_segundos.items()})

# %% [markdown]
# ## 3. Resultados no conjunto de teste (nunca usado no treino nem na escolha do peso)

# %%
relatorio = r.relatorio
display(pd.DataFrame(relatorio["teste"]).T.style.format("{:.4f}"))
print("Peso do ensemble (escolhido na validação): w_cnn =", relatorio["w_cnn"])
print("Critério mínimo (ensemble ≥ 0,85; cada rede ≥ 0,80):", relatorio["criterio_minimo"])
print("Parâmetros:", relatorio["parametros"], "| latência CPU (ms):", relatorio["latencia_cpu_ms"])
print("Conferência ONNX × PyTorch (diferença máxima):", relatorio["conferencia_onnx"])

# %%
fig, eixos = plt.subplots(1, 2, figsize=(12, 4))
for historico, nome, cor in [(r.historico_cnn, "CNN", "#d9822b"), (r.historico_lstm, "LSTM", "#2b6cb0")]:
    epocas = [e.epoca for e in historico]
    eixos[0].plot(epocas, [e.perda_de_treino for e in historico], "--", c=cor, label=f"{nome} treino")
    eixos[0].plot(epocas, [e.perda_de_validacao for e in historico], c=cor, label=f"{nome} validação")
    eixos[1].plot(epocas, [e.acuracia_de_treino for e in historico], "--", c=cor, label=f"{nome} treino")
    eixos[1].plot(epocas, [e.acuracia_de_validacao for e in historico], c=cor, label=f"{nome} validação")
for eixo, titulo in zip(eixos, ["Perda", "Acurácia"]):
    eixo.set_title(titulo); eixo.set_xlabel("época"); eixo.grid(alpha=0.3); eixo.legend()
plt.tight_layout(); plt.savefig(FIGURAS / "curvas_treino.png", dpi=150); plt.show()
print("Obs.: o treino é medido com metade dos desenhos parciais + aumento de dados, por isso fica abaixo da validação.")

# %%
matriz = r.matriz_de_confusao / r.matriz_de_confusao.sum(axis=1, keepdims=True)
plt.figure(figsize=(13, 11))
sns.heatmap(matriz, xticklabels=PT, yticklabels=PT, cmap="Blues", vmin=0, vmax=1)
plt.title("Matriz de confusão normalizada — Ensemble (teste)"); plt.xlabel("previsto"); plt.ylabel("real")
plt.tight_layout(); plt.savefig(FIGURAS / "matriz_confusao.png", dpi=150); plt.show()
print("Confusões mais frequentes (real → previsto):", relatorio["confusoes"])

# %%
plt.figure(figsize=(8, 4.5))
for nome, cor in [("CNN", "#d9822b"), ("LSTM", "#2b6cb0"), ("Ensemble", "#2f855a")]:
    curva = relatorio["curva_antecipada"][nome]
    plt.plot([float(f) * 100 for f in curva], list(curva.values()), "o-", c=cor, lw=2, label=nome)
plt.xlabel("% do desenho concluído"); plt.ylabel("acurácia"); plt.grid(alpha=0.3); plt.legend()
plt.title("Quem adivinha mais cedo? Acurácia × quanto do desenho já foi feito")
plt.tight_layout(); plt.savefig(FIGURAS / "reconhecimento_antecipado.png", dpi=150); plt.show()

# %% [markdown]
# ## 4. Artefatos para o jogo e para a Parte 2 (SLM)
# `cnn.onnx` e `lstm.onnx` rodam no navegador; `classes.json` traz as categorias e o peso do ensemble; `teste_paridade_redes.json`
# permite ao jogo conferir o ONNX ao abrir; `predicoes_validacao.json` traz as saídas **reais** das redes, que viram os casos do
# modo VEREDITO no dataset destilado do Zé do Rabisco.

# %%
caminho_zip = Path("/content/modelos_redes.zip")
with zipfile.ZipFile(caminho_zip, "w", zipfile.ZIP_DEFLATED) as arquivo_zip:
    for caminho in SAIDA.rglob("*"):
        if caminho.is_file():
            arquivo_zip.write(caminho, caminho.relative_to(SAIDA))
print(f"{caminho_zip} ({caminho_zip.stat().st_size / 1e6:.1f} MB)")
from google.colab import files
files.download(str(caminho_zip))

# %% [markdown]
# ## 5. Conclusões (preencher com os números obtidos)
# - **Imagem × sequência:** compare acurácia e F1 da CNN e da LSTM; o ensemble combina as duas visões.
# - **Reconhecimento antecipado:** a curva mostra qual rede acerta com menos traços — é o que o público vê no jogo.
# - **Confusões:** animais de quatro patas tendem a se confundir; o Zé do Rabisco usa isso no veredito ("quase achei que era um cavalo!").
# - **Implantação:** modelos pequenos, conferidos em ONNX e rápidos em CPU — palpite a cada traço, no navegador, sem internet.
