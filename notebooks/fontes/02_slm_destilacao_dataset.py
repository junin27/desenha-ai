# %% [markdown]
# # 🤠 Desenha Aí, Sô! — Parte 2: Destilação de Conhecimento (Teacher → Student)
#
# **UniRV · Engenharia de Software · Disciplinas:** Redes Neurais · Small Language Models — **Prof.:** Sandro S. Moreira
# **Discente:** Gilberto Aparecido Dias Junior
#
# ---
#
# O SLM **Zé do Rabisco** tem três trabalhos no jogo, e cada um é uma tarefa do dataset:
#
# | Tarefa | Entrada | Saída | Verificação automática na curadoria |
# |---|---|---|---|
# | **CHARADA** | palavra secreta + nível | charada que leva ao desenho | a palavra **não pode vazar** (plural, diminutivo, acento) |
# | **VEREDITO** | alvo + top-5 **reais** da CNN, da LSTM e do ensemble (Parte 1) | ACERTOU/QUASE/ERROU + narração | o veredito tem de seguir a **regra do jogo** |
# | **PERGUNTA** | dúvida de um visitante | explicação simples e caipira | números só da **ficha técnica** (anti-alucinação) |
#
# **Pipeline** (mesmo da atividade N2, agora com regras verificáveis e testadas):
# seeds → **Evol-Instruct** (*in-depth* e *in-breadth*) → **Teacher com Chain-of-Thought** (`<pensamento>`/`<resposta>`) →
# **curadoria** → **ShareGPT/ChatML** com separação estratificada em treino/validação/teste.
#
# **Destilação em nível de sequência** (Kim & Rush, 2016): a API do Teacher não expõe *logits*, então o Student aprende imitando
# as sequências geradas. No VEREDITO, o Student aprende a ler **distribuições de probabilidade** das redes — o conceito de
# *soft labels / dark knowledge* da aula.
#
# Toda a lógica está no pacote `desenha_ml` (formato da conversa com contrato Python ↔ TypeScript, Teacher com *checkpoint*,
# curadoria, exportação), com testes e especificação no OpenSpec (`openspec/specs/conversa-com-o-ze`, `dataset-do-ze`).
# O pipeline foi ensaiado localmente com um Teacher offline (`scripts/ensaio_dataset_local.py`).
#
# > **Antes de rodar:** a célula 0 abre um menu de upload para o `desenha_ml-*.whl` e o `modelos_redes.zip` da Parte 1.
# > Chave gratuita do Gemini em https://aistudio.google.com → *Secrets* do Colab com o nome `GEMINI_API_KEY`
# > (alternativa: `GROQ_API_KEY`). Não precisa de GPU. Tempo ≈ 15–25 min (≈ 110 chamadas, dentro do *free tier*).

# %% [markdown]
# ## 0. Instalação e configuração do Teacher

# %%
import base64
import glob
import os
from pathlib import Path

from google.colab import files
from IPython.display import HTML, display

PASTA_DOS_ARQUIVOS = "/content"
LIMITE_DO_BOTAO_EM_BYTES = 40 * 1024 * 1024  # o arquivo vai dentro do botão; acima disso usa o download normal


def exigir_arquivos(*padroes):
    """Abre o menu de upload do Colab enquanto faltar algum arquivo (eles caem em /content)."""
    os.chdir(PASTA_DOS_ARQUIVOS)
    while faltando := [p for p in padroes if not glob.glob(os.path.join(PASTA_DOS_ARQUIVOS, p))]:
        print("Faltam:", ", ".join(faltando), "→ escolha o(s) arquivo(s) na janela de upload que abriu.")
        if not files.upload():
            raise FileNotFoundError("Nenhum arquivo enviado; ainda faltam: " + ", ".join(faltando))


MODELO_DO_BOTAO = """
<button id="salvar" style="padding:8px 14px;font-size:14px;cursor:pointer">💾 Salvar __NOME__ (__TAMANHO__ MB) em…</button>
<span id="aviso" style="margin-left:10px"></span>
<script>
const nome = "__NOME__";
const blob = new Blob([Uint8Array.from(atob("__DADOS__"), c => c.charCodeAt(0))]);
const aviso = (texto) => { document.getElementById("aviso").textContent = texto; };
document.getElementById("salvar").onclick = async () => {
  try {
    const destino = await window.showSaveFilePicker({suggestedName: nome});
    const escrita = await destino.createWritable();
    await escrita.write(blob);
    await escrita.close();
    aviso("Salvo.");
  } catch (erro) {
    if (erro.name === "AbortError") { aviso("Cancelado."); return; }
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = nome;
    a.click();
    aviso("Seu navegador não abriu a janela de escolha; baixei pelo método normal.");
  }
};
</script>
"""


def baixar_com_menu(caminho):
    """Mostra um botão que abre a janela "Salvar como" para você escolher onde guardar o arquivo.

    Funciona no Chrome e no Edge; em outro navegador (ou se ele bloquear a janela dentro do Colab) o botão
    baixa pelo método normal. Arquivos grandes demais para ir dentro do botão usam o download normal.
    """
    caminho = Path(caminho)
    tamanho = caminho.stat().st_size
    if tamanho > LIMITE_DO_BOTAO_EM_BYTES:
        print(f"{caminho.name} é grande ({tamanho / 1e6:.0f} MB): download normal.")
        files.download(str(caminho))
        return
    dados = base64.b64encode(caminho.read_bytes()).decode()
    botao = (MODELO_DO_BOTAO.replace("__NOME__", caminho.name)
             .replace("__TAMANHO__", f"{tamanho / 1e6:.1f}").replace("__DADOS__", dados))
    display(HTML(botao))

# %%
exigir_arquivos("desenha_ml-*.whl", "modelos_redes.zip")
RODA = glob.glob("/content/desenha_ml-*.whl")
%pip install -q "{RODA[0]}[teacher]"

# %%
import json, zipfile
from pathlib import Path

import matplotlib.pyplot as plt
import pandas as pd
from google.colab import drive, userdata

try:
    from desenha_ml.pipeline_dataset import gerar_dataset_ate_suficiente
except ImportError as erro:  # wheel antigo ainda carregado na memória do Colab
    raise RuntimeError("Pacote antigo carregado: use Ambiente de execução → Reiniciar sessão e rode a célula 0 de novo.") from erro
from desenha_ml.teacher import TeacherComCuidados
from desenha_ml.teacher_apis import chamada_gemini, chamada_groq

PROVEDOR = "gemini"                      # "gemini" ou "groq"
MODELO = {"gemini": "gemini-3.5-flash-lite", "groq": "llama-3.3-70b-versatile"}[PROVEDOR]
CHAVE = userdata.get("GEMINI_API_KEY" if PROVEDOR == "gemini" else "GROQ_API_KEY")
chamar = chamada_gemini(MODELO, CHAVE) if PROVEDOR == "gemini" else chamada_groq(MODELO, CHAVE)
teacher = TeacherComCuidados(chamar, intervalo=4.5)  # ≈ 15 requisições/min do free tier
print("Teste do Teacher:", teacher.gerar('Responda em JSON {"ok": true, "saudacao": "<uma saudação caipira curta>"}', 0.7))

# %% [markdown]
# ## 1. Entradas vindas da Parte 1 (Redes Neurais)
# `predicoes_validacao.json` traz as saídas **reais** da CNN e da LSTM (casos de VEREDITO); `metricas_redes.json` entra na
# ficha técnica (as acurácias reais viram os únicos números que o Zé pode citar).

# %%
exigir_arquivos("modelos_redes.zip")
with zipfile.ZipFile("/content/modelos_redes.zip") as arquivo_zip:
    predicoes = json.loads(arquivo_zip.read("predicoes_validacao.json"))
    metricas = json.loads(arquivo_zip.read("metricas_redes.json"))
print(len(predicoes), "predições reais das redes · acurácias de teste:", {k: round(v["acuracia"], 3) for k, v in metricas["teste"].items()})

# %% [markdown]
# ## 2. Geração, curadoria e exportação
# O *checkpoint* fica no Drive: se a sessão cair, rodar esta célula de novo continua de onde parou, sem refazer chamadas. Lotes que
# voltaram vazios são pedidos de novo (até 3 passadas, parando se não houver progresso).

# %%
drive.mount("/content/drive")
PASTA = Path("/content/drive/MyDrive/desenha_ai_so/dataset_ze")
resultado = gerar_dataset_ate_suficiente(teacher=teacher, predicoes=predicoes, metricas_redes=metricas, pasta=PASTA)
relatorio = resultado.relatorio
print(json.dumps({k: relatorio[k] for k in ("pedidos", "respostas", "aprovadas", "aprovadas_por_tarefa", "suficiente",
                  "motivos_de_insuficiencia", "categorias_sem_charada", "uso_da_api")}, ensure_ascii=False, indent=1))

# %% [markdown]
# ## 3. Estatísticas da curadoria (para o relatório e o banner)

# %%
fig, eixos = plt.subplots(1, 3, figsize=(16, 4))
por_tarefa = relatorio["aprovadas_por_tarefa"]
eixos[0].bar(por_tarefa.keys(), por_tarefa.values(), color=["#d9822b", "#2b6cb0", "#2f855a"])
eixos[0].axhline(60, ls="--", c="k", lw=1, label="mínimo por tarefa"); eixos[0].legend(); eixos[0].set_title("Aprovadas por tarefa")
rejeicoes = relatorio["rejeicoes"] or {"nenhuma": 0}
eixos[1].barh(list(rejeicoes.keys()), list(rejeicoes.values()), color="#c53030"); eixos[1].set_title("Motivos de rejeição")
eixos[2].pie(list(relatorio["origem_das_perguntas"].values()), labels=list(relatorio["origem_das_perguntas"].keys()),
             autopct="%1.0f%%"); eixos[2].set_title("Origem das perguntas (Evol-Instruct)")
plt.tight_layout(); plt.savefig(PASTA / "estatisticas_dataset.png", dpi=150); plt.show()
taxa = relatorio["aprovadas"] / max(1, relatorio["respostas"])
print(f"Taxa de aprovação: {taxa:.1%} · reparos: {relatorio['reparos']} · vereditos: {relatorio['origem_dos_vereditos']}")

# %% [markdown]
# ### Exemplos aprovados (o que o Student vai imitar)

# %%
exemplos = pd.read_json(PASTA / "zedorabisco_treino_chatml.jsonl", lines=True)
for tarefa in ("CHARADA", "VEREDITO", "PERGUNTA"):
    mensagens = exemplos[exemplos.tarefa == tarefa].iloc[0].messages
    print("=" * 100, f"\n[{tarefa}]\n--- entrada ---\n{mensagens[1]['content']}\n--- saída ---\n{mensagens[2]['content']}")

# %% [markdown]
# ## 4. Download para a Parte 3 (fine-tuning)
# `dataset_slm.zip` traz treino/validação/teste (ShareGPT e ChatML), `charadas_reserva.json` (modo offline do jogo) e o relatório.

# %%
caminho_zip = Path("/content/dataset_slm.zip")
with zipfile.ZipFile(caminho_zip, "w", zipfile.ZIP_DEFLATED) as arquivo_zip:
    for caminho in PASTA.glob("*"):
        if caminho.is_file():
            arquivo_zip.write(caminho, caminho.name)
print(caminho_zip, f"({caminho_zip.stat().st_size / 1e6:.1f} MB)")
baixar_com_menu(caminho_zip)

# %% [markdown]
# ## 5. Relatório técnico (preencher com os números obtidos)
# - **Domínio e tarefas:** charadas, veredito a partir das saídas reais das redes e perguntas do público, todas com Chain-of-Thought.
# - **Evol-Instruct:** 12 sementes → 2 gerações (*in-depth* e *in-breadth*); ver a origem das perguntas no gráfico.
# - **Curadoria verificável:** vazamento da palavra, regra do veredito e números alucinados são checados por código testado
#   (as mesmas regras do jogo); ver os motivos de rejeição.
# - **Volume:** o dataset só é aceito com ≥ 300 amostras aprovadas e ≥ 60 por tarefa (linha "suficiente").
# - **Formato:** ShareGPT e ChatML, com a instrução de sistema idêntica à usada pelo jogo (contrato Python ↔ TypeScript).
