# %% [markdown]
# # 🧠 Desenha Aí, Sô! — Parte 3: Fine-tuning do Zé do Rabisco (QLoRA + Unsloth) e Quantização GGUF
#
# **UniRV · Engenharia de Software · Disciplinas:** Redes Neurais · Small Language Models — **Prof.:** Sandro S. Moreira
# **Discente:** Gilberto Aparecido Dias Junior
#
# ---
#
# | Etapa | O que acontece | Conteúdo da disciplina |
# |---|---|---|
# | 1 | Carrega o **Qwen3-1.7B** em **4 bits (NF4)** com `FastLanguageModel` | quantização, arquitetura Qwen3 |
# | 2 | Injeta adaptadores **LoRA** em `q,k,v,o,gate,up,down` | QLoRA |
# | 3 | **SFT** com *loss masking* (perda só na resposta do assistente) | destilação Teacher → Student |
# | 4 | **Avaliação base × destilado** no conjunto de teste, com métricas verificáveis + perplexidade | avaliação do Student |
# | 5 | *Merge* do LoRA e exportação **GGUF Q4_K_M** para o `llama.cpp` (CPU, offline) | deploy na borda |
# | 6 | Tabela teórica × real de memória (FP32/FP16/INT8/INT4) | atividade de quantização |
#
# > Colab com **GPU T4**. Envie o `dataset_slm.zip` da Parte 2 para o painel *Arquivos*. Tempo ≈ 40–60 min (a exportação GGUF é a parte mais demorada).

# %%
%%capture
%pip install unsloth

# %%
import os, re, json, time, math, zipfile, glob, shutil, collections, unicodedata
import torch, numpy as np, pandas as pd, matplotlib.pyplot as plt
from unsloth import FastLanguageModel
from unsloth.chat_templates import train_on_responses_only
from datasets import Dataset
from trl import SFTTrainer, SFTConfig

MODELO_BASE = 'unsloth/Qwen3-1.7B'   # alternativa mais rápida em CPU: 'unsloth/Qwen3-0.6B'
MAX_SEQ = 1024
OUT = '/content/zedorabisco'; os.makedirs(OUT, exist_ok=True)
print(torch.cuda.get_device_name(0), '| VRAM', round(torch.cuda.get_device_properties(0).total_memory / 1e9, 1), 'GB')

# %% [markdown]
# ## 1. Dataset (Parte 2)

# %%
with zipfile.ZipFile('/content/dataset_slm.zip') as z: z.extractall('/content/dataset_slm')
def ler(nome): return [json.loads(l) for l in open(f'/content/dataset_slm/zedorabisco_{nome}_chatml.jsonl', encoding='utf8')]
treino, val, teste = ler('treino'), ler('val'), ler('teste')
print(len(treino), len(val), len(teste), '| tarefas no teste:', collections.Counter(x['tarefa'] for x in teste))
SYSTEM = treino[0]['messages'][0]['content']

# %% [markdown]
# ### Template de conversa
# Montamos o texto ChatML **à mão**, idêntico ao que o jogo envia ao `llama.cpp` no evento. O bloco `<think>\n\n</think>` vazio é o
# que o Qwen3 usa quando o *thinking mode* nativo está desligado — o raciocínio do Zé fica nas nossas tags `<pensamento>`, que são
# curtas e controladas (importante para a latência em CPU).

# %%
def prompt_chatml(system, user):
    return (f'<|im_start|>system\n{system}<|im_end|>\n<|im_start|>user\n{user}<|im_end|>\n'
            f'<|im_start|>assistant\n<think>\n\n</think>\n\n')
def texto_treino(ex):
    m = ex['messages']; return prompt_chatml(m[0]['content'], m[1]['content']) + m[2]['content'] + '<|im_end|>\n'

ds_treino = Dataset.from_list([{'text': texto_treino(x)} for x in treino])
ds_val = Dataset.from_list([{'text': texto_treino(x)} for x in val])
print(ds_treino[0]['text'])

# %% [markdown]
# ## 2. Modelo base em 4 bits + LoRA

# %%
model, tokenizer = FastLanguageModel.from_pretrained(MODELO_BASE, max_seq_length=MAX_SEQ, load_in_4bit=True)
print('Memória da GPU após carregar em 4 bits:', round(torch.cuda.memory_allocated() / 1e9, 2), 'GB')

model = FastLanguageModel.get_peft_model(
    model, r=16, lora_alpha=16, lora_dropout=0, bias='none',
    target_modules=['q_proj', 'k_proj', 'v_proj', 'o_proj', 'gate_proj', 'up_proj', 'down_proj'],
    use_gradient_checkpointing='unsloth', random_state=3407)
treinaveis = sum(p.numel() for p in model.parameters() if p.requires_grad)
totais = sum(p.numel() for p in model.parameters())
print(f'Parâmetros treináveis (LoRA): {treinaveis:,} de {totais:,} ({100*treinaveis/totais:.2f}% — contagem com pesos 4-bit empacotados)')

ntok = [len(tokenizer(x['text']).input_ids) for x in ds_treino]
print(f'Tokens por exemplo: média {np.mean(ntok):.0f} · máx {max(ntok)} (limite {MAX_SEQ})')

# %% [markdown]
# ## 3. Avaliação **antes** do treino (modelo base) — mesma função usada depois
#
# Métricas verificáveis automaticamente (iguais às regras da curadoria):
# - **Formato**: `<pensamento>` + `<resposta>` corretos.
# - **CHARADA**: palavra secreta **não vazou** e formato `Charada:`.
# - **VEREDITO**: veredito **igual à regra** do jogo.
# - **PERGUNTA**: sem números inventados (fora da ficha técnica/pergunta).
# - **Tokens gerados** (impactam a latência em CPU).

# %%
def sem_acento(s): return ''.join(c for c in unicodedata.normalize('NFD', s.lower()) if unicodedata.category(c) != 'Mn')
def vazou(palavra, texto):
    t = re.findall(r'[a-z]+', sem_acento(texto))
    for w in re.findall(r'[a-z]+', sem_acento(palavra)):
        if len(w) < 3 or w == 'de': continue
        raiz = w[:max(3, len(w) - 1)]
        if any(x == w or x.startswith(raiz) for x in t): return True
    return False
RE_TAGS = re.compile(r'^\s*<pensamento>(.+?)</pensamento>\s*<resposta>(.+?)</resposta>\s*$', re.S)
NUMS_OK = set(re.findall(r'\d+(?:[.,]\d+)?', ' '.join(x['messages'][2]['content'] for x in treino))) | {'1', '2', '3', '4', '5', '8'}

def avaliar_saida(ex, saida):
    m = RE_TAGS.match(saida); t = ex['tarefa']; r = {'tarefa': t, 'formato_ok': bool(m), 'tarefa_ok': False}
    if not m: return r
    resp = m.group(2).strip()
    if t == 'CHARADA':
        r['tarefa_ok'] = resp.startswith('Charada:') and not vazou(ex['meta']['palavra'], resp)
    elif t == 'VEREDITO':
        mv = re.match(r'VEREDITO:\s*(ACERTOU|QUASE|ERROU)', resp); r['tarefa_ok'] = bool(mv) and mv.group(1) == ex['meta']['regra']
    else:
        nums = set(re.findall(r'\d+(?:[.,]\d+)?', resp)) - NUMS_OK - set(re.findall(r'\d+(?:[.,]\d+)?', ex['messages'][1]['content']))
        r['tarefa_ok'] = len(resp.split()) >= 8 and not nums
    return r

@torch.no_grad()
def gerar(prompts, max_new=300, bs=8):
    FastLanguageModel.for_inference(model)
    tokenizer.padding_side = 'left'
    saidas, ntoks = [], []
    for i in range(0, len(prompts), bs):
        enc = tokenizer(prompts[i:i+bs], return_tensors='pt', padding=True, add_special_tokens=False).to('cuda')
        out = model.generate(**enc, max_new_tokens=max_new, do_sample=False, temperature=None, top_p=None, top_k=None,
                             eos_token_id=tokenizer.convert_tokens_to_ids('<|im_end|>'), pad_token_id=tokenizer.pad_token_id)
        for o in out[:, enc.input_ids.shape[1]:]:
            o = o[o != tokenizer.pad_token_id]; ntoks.append(len(o))
            saidas.append(tokenizer.decode(o, skip_special_tokens=True).strip())
    return saidas, ntoks

def avaliar(rotulo, adaptador=True):
    prompts = [prompt_chatml(x['messages'][0]['content'], x['messages'][1]['content']) for x in teste]
    t0 = time.time()
    if adaptador: saidas, ntoks = gerar(prompts)
    else:
        with model.disable_adapter(): saidas, ntoks = gerar(prompts)
    linhas = [{**avaliar_saida(x, s), 'tokens': n, 'saida': s} for x, s, n in zip(teste, saidas, ntoks)]
    df = pd.DataFrame(linhas); df['modelo'] = rotulo
    print(f'{rotulo}: {time.time()-t0:.0f}s para {len(teste)} exemplos')
    return df

aval_base = avaliar('Qwen3-1.7B base', adaptador=False)
print(aval_base.groupby('tarefa')[['formato_ok', 'tarefa_ok', 'tokens']].mean())
print('\nExemplo de saída do modelo base:\n', aval_base.saida.iloc[0][:600])

# %% [markdown]
# ## 4. Treinamento (SFT com *loss masking*)
# `train_on_responses_only` zera a perda dos tokens de *system* e *user*: o Student só é cobrado por gerar o raciocínio e a resposta.

# %%
FastLanguageModel.for_training(model)
tokenizer.padding_side = 'right'
trainer = SFTTrainer(
    model=model, tokenizer=tokenizer, train_dataset=ds_treino, eval_dataset=ds_val,
    args=SFTConfig(
        dataset_text_field='text', per_device_train_batch_size=4, gradient_accumulation_steps=4,
        num_train_epochs=3, learning_rate=2e-4, warmup_ratio=0.05, lr_scheduler_type='cosine', optim='adamw_8bit',
        weight_decay=0.01, logging_steps=5, eval_strategy='steps', eval_steps=10, save_strategy='no',
        seed=3407, output_dir=f'{OUT}/treino', report_to='none'))
trainer = train_on_responses_only(trainer, instruction_part='<|im_start|>user\n', response_part='<|im_start|>assistant\n')

# conferência do mascaramento: só a parte do assistente tem rótulo != -100
lab = trainer.train_dataset[0]['labels']
print('Trecho com perda:', tokenizer.decode([t for t in lab if t != -100])[:200])

t0 = time.time(); stats = trainer.train()
print(f'Treino: {(time.time()-t0)/60:.1f} min · pico de VRAM {torch.cuda.max_memory_reserved()/1e9:.2f} GB')

# %%
log = pd.DataFrame(trainer.state.log_history)
tr, ev = log.dropna(subset=['loss']), log.dropna(subset=['eval_loss'])
fig, ax = plt.subplots(1, 2, figsize=(12, 4))
ax[0].plot(tr.step, tr.loss, label='treino'); ax[0].plot(ev.step, ev.eval_loss, 'o-', label='validação'); ax[0].set_title('Loss (somente tokens do assistente)')
ax[1].plot(ev.step, np.exp(ev.eval_loss), 'o-', c='#2f855a'); ax[1].set_title('Perplexidade na validação')
for a in ax: a.set_xlabel('passo'); a.grid(alpha=.3); a.legend() if a is ax[0] else None
plt.tight_layout(); plt.savefig(f'{OUT}/curvas_sft.png', dpi=150); plt.show()

# perplexidade do modelo base na validação, para comparação
with model.disable_adapter(): ppl_base = math.exp(trainer.evaluate()['eval_loss'])
ppl_ft = math.exp(trainer.evaluate()['eval_loss'])
print(f'Perplexidade (validação) — base: {ppl_base:.2f} · destilado: {ppl_ft:.2f}')

# %% [markdown]
# ## 5. Avaliação **depois** do treino: Qwen3 base × Zé destilado

# %%
aval_ft = avaliar('Zé destilado (QLoRA)')
comp = pd.concat([aval_base, aval_ft])
tab = comp.groupby(['modelo', 'tarefa'])[['formato_ok', 'tarefa_ok', 'tokens']].mean().unstack(0)
display(tab.style.format('{:.2f}'))
geral = comp.groupby('modelo')[['formato_ok', 'tarefa_ok', 'tokens']].mean(); display(geral)

nomes = {'CHARADA': 'Charada sem\nvazar a palavra', 'VEREDITO': 'Veredito\ncorreto', 'PERGUNTA': 'Resposta sem\nnúmero inventado'}
fig, ax = plt.subplots(figsize=(9, 4.5)); x = np.arange(4); w = 0.38
for i, (mod, cor) in enumerate([('Qwen3-1.7B base', '#a0aec0'), ('Zé destilado (QLoRA)', '#2f855a')]):
    d = comp[comp.modelo == mod]
    vals = [d.formato_ok.mean()] + [d[d.tarefa == t].tarefa_ok.mean() for t in nomes]
    b = ax.bar(x + (i - .5) * w, vals, w, label=mod, color=cor); ax.bar_label(b, fmt='%.0f%%', labels=[f'{100*v:.0f}%' for v in vals])
ax.set_xticks(x, ['Formato\n<pensamento>/<resposta>'] + list(nomes.values())); ax.set_ylim(0, 1.12); ax.legend()
ax.set_title('Conjunto de teste: modelo base × destilado'); plt.tight_layout(); plt.savefig(f'{OUT}/base_vs_destilado.png', dpi=150); plt.show()

for t in ['CHARADA', 'VEREDITO', 'PERGUNTA']:
    i = next(j for j, x in enumerate(teste) if x['tarefa'] == t)
    print('=' * 100, '\n', teste[i]['messages'][1]['content'])
    print('\n--- BASE ---\n', aval_base.saida.iloc[i][:500]); print('\n--- DESTILADO ---\n', aval_ft.saida.iloc[i][:500])

# %% [markdown]
# ## 6. Exportação GGUF (Q4_K_M) para o `llama.cpp`
# O Unsloth faz o *merge* do LoRA nos pesos em 16 bits e depois quantiza para 4 bits (*k-quants*, blocos com escalas próprias).

# %%
t0 = time.time()
model.save_pretrained_gguf(f'{OUT}/gguf', tokenizer, quantization_method=['q4_k_m', 'q8_0'])
print(f'GGUF exportado em {(time.time()-t0)/60:.1f} min')
ggufs = sorted(glob.glob(f'{OUT}/**/*.gguf', recursive=True) + glob.glob('/content/*.gguf'))
for g in ggufs: print(f'{g}: {os.path.getsize(g)/1e9:.2f} GB')

# %% [markdown]
# ## 7. Quantização: teoria (atividade 1) × arquivos reais
# Memória dos pesos = parâmetros × bytes por parâmetro. O Qwen3-1.7B tem ≈ 2,03 bilhões de parâmetros contando os *embeddings*.

# %%
N = 2.03e9
teoria = {'FP32': 4, 'FP16/BF16': 2, 'INT8 (Q8_0)': 1, 'INT4 (Q4_K_M)': 0.5}
reais = {}
for g in ggufs:
    nome = os.path.basename(g).upper()
    if 'Q4_K_M' in nome: reais['INT4 (Q4_K_M)'] = os.path.getsize(g) / 1e9
    elif 'Q8_0' in nome: reais['INT8 (Q8_0)'] = os.path.getsize(g) / 1e9
    elif 'F16' in nome or 'BF16' in nome: reais['FP16/BF16'] = os.path.getsize(g) / 1e9
quant = pd.DataFrame({'teórico (GB)': {k: N * b / 1e9 for k, b in teoria.items()}, 'arquivo GGUF (GB)': reais})
quant['cabe em 2,8 GB livres?'] = quant['teórico (GB)'].map(lambda v: 'sim' if v < 2.8 else 'não')
display(quant.style.format('{:.2f}', subset=['teórico (GB)', 'arquivo GGUF (GB)'], na_rep='—'))
print('Obs.: o Q4_K_M real é um pouco maior que 0,5 byte/parâmetro porque guarda escalas por bloco e mantém algumas camadas sensíveis em 6 bits.')

# %% [markdown]
# ## 8. Salvar no Drive e baixar

# %%
q4 = next(g for g in ggufs if 'Q4_K_M' in os.path.basename(g).upper())
destino = f'{OUT}/zedorabisco-1.7b-Q4_K_M.gguf'; shutil.copy(q4, destino)
metricas = {'modelo_base': MODELO_BASE, 'lora': {'r': 16, 'alpha': 16, 'treinaveis': treinaveis},
            'dados': {'treino': len(treino), 'val': len(val), 'teste': len(teste)},
            'perplexidade_val': {'base': ppl_base, 'destilado': ppl_ft},
            'teste': {m: {'formato_ok': float(d.formato_ok.mean()), **{t: float(d[d.tarefa == t].tarefa_ok.mean()) for t in nomes},
                          'tokens_medios': float(d.tokens.mean())} for m, d in comp.groupby('modelo')},
            'quantizacao_gb': {k: {'teorico': N * teoria[k] / 1e9, 'real': reais.get(k)} for k in teoria}}
json.dump(metricas, open(f'{OUT}/metricas_slm.json', 'w', encoding='utf8'), ensure_ascii=False, indent=1)
comp.to_csv(f'{OUT}/saidas_teste_base_vs_destilado.csv', index=False)
print(json.dumps(metricas, ensure_ascii=False, indent=1))

with zipfile.ZipFile('/content/resultados_slm.zip', 'w', zipfile.ZIP_DEFLATED) as z:
    for f in ['metricas_slm.json', 'saidas_teste_base_vs_destilado.csv', 'curvas_sft.png', 'base_vs_destilado.png']:
        z.write(f'{OUT}/{f}', f)
try:
    from google.colab import drive, files
    drive.mount('/content/drive')
    pasta = '/content/drive/MyDrive/desenha_ai_so'; os.makedirs(pasta, exist_ok=True)
    shutil.copy(destino, pasta); shutil.copy('/content/resultados_slm.zip', pasta)
    print('Copiado para o Drive:', pasta, '→ baixe o .gguf de lá (o download direto de 1 GB pelo navegador costuma falhar).')
    files.download('/content/resultados_slm.zip')
except Exception as e:
    print('Drive indisponível:', e)
