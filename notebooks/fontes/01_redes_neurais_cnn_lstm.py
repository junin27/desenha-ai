# %% [markdown]
# # 🎨 Desenha Aí, Sô! — Parte 1: Redes Neurais (CNN × LSTM)
#
# **UniRV – Universidade de Rio Verde · Engenharia de Software · 8º período**
# **Disciplinas:** Redes Neurais · Small Language Models — **Prof.:** Sandro S. Moreira
# **Discente:** Gilberto Aparecido Dias Junior
#
# ---
#
# O jogo *Desenha Aí, Sô!* pede que o visitante resolva uma charada (criada pelo SLM) e desenhe a resposta na tela.
# Duas redes neurais tentam reconhecer o rabisco **em tempo real**, olhando o mesmo desenho de formas diferentes:
#
# | Rede | Enxerga o desenho como… | Conceito da disciplina |
# |---|---|---|
# | **CNN** | uma **imagem** 28×28 (pixels) | filtros convolucionais, pooling, blocos residuais |
# | **LSTM** | uma **sequência de traços** (Δx, Δy, levantou a caneta?) | RNN, memória de longo prazo, portas *forget/input/output* |
# | **Ensemble** | média ponderada das duas | combinação de modelos |
#
# Pergunta de pesquisa do banner: **“imagem ou sequência: quem entende melhor um rabisco — e quem adivinha mais cedo?”**
#
# **Dados:** [Google Quick, Draw!](https://github.com/googlecreativelab/quickdraw-dataset) (formato *simplified*, licença CC BY 4.0) — 30 categorias escolhidas com “cara de Goiás”.
#
# **Saídas deste notebook** (baixadas no final em `modelos_redes.zip`): `cnn.onnx`, `lstm.onnx`, `classes.json`,
# `metricas_redes.json`, `teste_paridade.json` (garante que o navegador pré-processa igual ao Python),
# `predicoes_validacao.json` (alimenta o dataset do SLM — Parte 2) e as figuras para o banner.
#
# > **Execução:** Google Colab com GPU (*Ambiente de execução → Alterar o tipo → T4 GPU*). Tempo total ≈ 25–35 min.

# %% [markdown]
# ## 0. Configuração

# %%
%pip install -q onnx onnxruntime onnxscript

# %%
import os, json, math, time, random, urllib.parse, zipfile, io
from concurrent.futures import ThreadPoolExecutor
from multiprocessing import Pool
import numpy as np, pandas as pd, requests, cv2
import matplotlib.pyplot as plt, seaborn as sns
import torch, torch.nn as nn, torch.nn.functional as F
from torch.nn.utils.rnn import pack_padded_sequence
from sklearn.metrics import accuracy_score, f1_score, classification_report, confusion_matrix

SEED = 42
random.seed(SEED); np.random.seed(SEED); torch.manual_seed(SEED)
DEVICE = torch.device('cuda' if torch.cuda.is_available() else 'cpu')
print('PyTorch', torch.__version__, '| dispositivo:', DEVICE, torch.cuda.get_device_name(0) if DEVICE.type == 'cuda' else '')

OUT = '/content/saida' if os.path.isdir('/content') else './saida'
FIG = os.path.join(OUT, 'figuras'); os.makedirs(FIG, exist_ok=True)

# %% [markdown]
# ### Categorias (inglês no dataset → português no jogo)

# %%
CATEGORIAS = [
    ('cow', 'vaca'), ('horse', 'cavalo'), ('pig', 'porco'), ('cat', 'gato'), ('dog', 'cachorro'),
    ('bird', 'passarinho'), ('fish', 'peixe'), ('snake', 'cobra'), ('spider', 'aranha'), ('butterfly', 'borboleta'),
    ('tractor', 'trator'), ('pickup truck', 'caminhonete'), ('barn', 'celeiro'), ('guitar', 'violão'), ('hat', 'chapéu'),
    ('sun', 'sol'), ('moon', 'lua'), ('cloud', 'nuvem'), ('lightning', 'raio'), ('tree', 'árvore'),
    ('flower', 'flor'), ('banana', 'banana'), ('watermelon', 'melancia'), ('pineapple', 'abacaxi'), ('house', 'casa'),
    ('bicycle', 'bicicleta'), ('airplane', 'avião'), ('campfire', 'fogueira'), ('coffee cup', 'xícara de café'), ('eyeglasses', 'óculos'),
]
EN = [c[0] for c in CATEGORIAS]; PT = [c[1] for c in CATEGORIAS]
K = len(CATEGORIAS)
N_TREINO, N_VAL, N_TESTE = 7000, 1000, 1000
N_POR_CLASSE = N_TREINO + N_VAL + N_TESTE
print(K, 'categorias ·', N_POR_CLASSE, 'desenhos por categoria')

# %% [markdown]
# ## 1. Download (streaming) do Quick, Draw!
#
# Cada categoria é um arquivo `.ndjson` com até centenas de MB. Lemos **em streaming** e paramos ao juntar
# `N_POR_CLASSE` desenhos com `recognized = true` (o próprio jogo do Google reconheceu o desenho — filtro de qualidade).

# %%
def baixar_categoria(en):
    url = 'https://storage.googleapis.com/quickdraw_dataset/full/simplified/' + urllib.parse.quote(en) + '.ndjson'
    desenhos = []
    with requests.get(url, stream=True, timeout=60) as r:
        r.raise_for_status()
        for linha in r.iter_lines():
            d = json.loads(linha)
            if d['recognized'] and len(d['drawing']) > 0:
                desenhos.append(d['drawing'])
                if len(desenhos) >= N_POR_CLASSE:
                    break
    return en, desenhos

t0 = time.time()
with ThreadPoolExecutor(8) as ex:
    brutos = dict(ex.map(baixar_categoria, EN))
print(f'Download concluído em {time.time()-t0:.0f}s ·', {k: len(v) for k, v in list(brutos.items())[:5]}, '...')

# %% [markdown]
# ## 2. Pré-processamento — **o mesmo código existe em JavaScript no jogo**
#
# Para o modelo funcionar no navegador, o desenho do visitante precisa passar **exatamente** pelas mesmas
# transformações do treino. A especificação abaixo foi implementada aqui e em `app/js/preprocess.js`:
#
# 1. **Normalização:** alinha no canto superior esquerdo e escala para que a maior dimensão vá a 255 (padrão do *simplified*).
# 2. **Imagem (CNN):** desenha os traços (espessura 16, pontas arredondadas, *antialias*) numa tela 280×280, centralizados
#    numa caixa de 220 px; depois faz a **média de blocos 10×10 → 28×28** com valores em [0, 1].
# 3. **Sequência (LSTM):** formato *stroke-3* — para cada ponto, `(Δx/255, Δy/255, fim_do_traço)`; o primeiro ponto usa a posição absoluta; no máximo 130 pontos.
# 4. **Desenho parcial:** pegamos só os primeiros *p*% dos pontos e **renormalizamos** — é o que o jogo vê enquanto a pessoa ainda desenha.

# %%
TELA, CAIXA, ESPESSURA, MAX_PONTOS = 280, 220, 16, 130

def normalizar(tracos):
    xs = np.concatenate([np.asarray(t[0], np.float64) for t in tracos])
    ys = np.concatenate([np.asarray(t[1], np.float64) for t in tracos])
    mx, my = xs.min(), ys.min()
    s = 255.0 / max(xs.max() - mx, ys.max() - my, 1.0)
    return [((np.asarray(t[0], np.float64) - mx) * s, (np.asarray(t[1], np.float64) - my) * s) for t in tracos]

def prefixo(tracos, frac):
    """Primeiros `frac` dos pontos (pelo menos 2), mantendo a ordem dos traços."""
    total = sum(len(t[0]) for t in tracos)
    resta = max(2, int(math.ceil(frac * total)))
    out = []
    for xs, ys in tracos:
        if resta <= 0: break
        n = min(len(xs), resta)
        out.append((list(xs[:n]), list(ys[:n]))); resta -= n
    return out

def rasterizar(tn, espessura=ESPESSURA):
    w = max(float(np.max(t[0])) for t in tn); h = max(float(np.max(t[1])) for t in tn)
    s2 = CAIXA / 255.0
    ox, oy = (TELA - w * s2) / 2, (TELA - h * s2) / 2
    img = np.zeros((TELA, TELA), np.uint8)
    SH = 4  # coordenadas com 4 bits de subpixel
    for xs, ys in tn:
        pts = np.stack([(xs * s2 + ox) * (1 << SH), (ys * s2 + oy) * (1 << SH)], 1).round().astype(np.int32)
        if len(pts) == 1:
            cv2.circle(img, tuple(pts[0]), (espessura // 2) << SH, 255, -1, cv2.LINE_AA, SH)
        else:
            cv2.polylines(img, [pts], False, 255, espessura, cv2.LINE_AA, SH)
    return img.reshape(28, 10, 28, 10).mean(axis=(1, 3)).round().astype(np.uint8)  # 0..255

def sequenciar(tn, max_pontos=MAX_PONTOS):
    pts = []
    for xs, ys in tn:
        for j in range(len(xs)):
            pts.append((xs[j], ys[j], 1.0 if j == len(xs) - 1 else 0.0))
    a = np.asarray(pts[:max_pontos], np.float32)
    seq = np.zeros_like(a)
    seq[0, :2] = a[0, :2] / 255.0
    seq[1:, :2] = np.diff(a[:, :2], axis=0) / 255.0
    seq[:, 2] = a[:, 2]
    return seq

def processar(args):
    """Retorna imagem e sequência do desenho completo e de um prefixo aleatório (aumento de dados)."""
    tracos, frac, esp = args
    tn = normalizar(tracos)
    tp = normalizar(prefixo(tracos, frac))
    return rasterizar(tn, esp), sequenciar(tn), rasterizar(tp, esp), sequenciar(tp)

# visualização da especificação
ex = brutos['cow'][0]
fig, ax = plt.subplots(1, 4, figsize=(12, 3))
for a, f in zip(ax, [0.25, 0.5, 0.75, 1.0]):
    a.imshow(rasterizar(normalizar(prefixo(ex, f))), cmap='gray'); a.set_title(f'{int(f*100)}% dos pontos'); a.axis('off')
plt.suptitle('“vaca” como a CNN enxerga (28×28) conforme o desenho avança'); plt.tight_layout()
plt.savefig(f'{FIG}/desenho_progressivo.png', dpi=150); plt.show()

# %%
def montar_split(inicio, fim, com_parcial):
    tarefas, rotulos = [], []
    rng = np.random.default_rng(SEED + inicio)
    for k, en in enumerate(EN):
        for tr in brutos[en][inicio:fim]:
            esp = int(rng.integers(12, 21)) if com_parcial else ESPESSURA  # espessura variável no treino
            tarefas.append((tr, float(rng.uniform(0.3, 0.9)), esp)); rotulos.append(k)
    with Pool(os.cpu_count()) as p:
        res = p.map(processar, tarefas, chunksize=512)
    def empilhar_seq(lst):
        L = np.array([len(s) for s in lst], np.int64)
        S = np.zeros((len(lst), MAX_PONTOS, 3), np.float16)
        for i, s in enumerate(lst): S[i, :len(s)] = s
        return S, L
    img = np.stack([r[0] for r in res]); S, L = empilhar_seq([r[1] for r in res])
    out = {'img': img, 'seq': S, 'len': L, 'y': np.array(rotulos, np.int64), 'tracos': [t[0] for t in tarefas]}
    if com_parcial:
        out['img_p'] = np.stack([r[2] for r in res]); out['seq_p'], out['len_p'] = empilhar_seq([r[3] for r in res])
    return out

t0 = time.time()
treino = montar_split(0, N_TREINO, True)
val = montar_split(N_TREINO, N_TREINO + N_VAL, False)
teste = montar_split(N_TREINO + N_VAL, N_POR_CLASSE, False)
print(f'Pré-processamento: {time.time()-t0:.0f}s | treino {len(treino["y"])} · val {len(val["y"])} · teste {len(teste["y"])}')
print('Comprimento das sequências (treino): média %.1f · p95 %d · truncadas em %d: %.1f%%' % (
    treino['len'].mean(), np.percentile(treino['len'], 95), MAX_PONTOS, 100 * (treino['len'] == MAX_PONTOS).mean()))

# %%
fig, ax = plt.subplots(3, 10, figsize=(15, 5))
for k in range(K):
    i = np.where(treino['y'] == k)[0][0]
    a = ax.flat[k]; a.imshow(treino['img'][i], cmap='gray'); a.set_title(PT[k], fontsize=9); a.axis('off')
plt.suptitle('Uma amostra por categoria (entrada da CNN)'); plt.tight_layout()
plt.savefig(f'{FIG}/amostras.png', dpi=150); plt.show()

# %% [markdown]
# ## 3. Arquiteturas
#
# ### 3.1 CNN `RabiscoNet` (do zero) — mesma família da CNN residual usada no BloodMNIST
# Entrada 1×28×28 → *stem* conv 3×3 → 3 estágios residuais (32→64→128 canais, *stride* 2) → *Global Average Pooling* → Dropout → Dense(30).
#
# ### 3.2 LSTM `TracoLSTM`
# Entrada (T×3) → 2 convoluções 1D (extraem padrões locais do traço) → **LSTM bidirecional de 2 camadas** (128 unidades, Dropout 0,3) →
# estados ocultos finais (ida + volta) → Dense(30). As sequências têm tamanhos diferentes, então usamos `pack_padded_sequence`.

# %%
class Bloco(nn.Module):
    def __init__(s, cin, cout, stride=1):
        super().__init__()
        s.c1 = nn.Conv2d(cin, cout, 3, stride, 1, bias=False); s.b1 = nn.BatchNorm2d(cout)
        s.c2 = nn.Conv2d(cout, cout, 3, 1, 1, bias=False); s.b2 = nn.BatchNorm2d(cout)
        s.atalho = nn.Sequential() if stride == 1 and cin == cout else nn.Sequential(
            nn.Conv2d(cin, cout, 1, stride, bias=False), nn.BatchNorm2d(cout))
    def forward(s, x):
        return F.relu(s.b2(s.c2(F.relu(s.b1(s.c1(x))))) + s.atalho(x))

class RabiscoNet(nn.Module):
    def __init__(s, k=K):
        super().__init__()
        s.stem = nn.Sequential(nn.Conv2d(1, 32, 3, 1, 1, bias=False), nn.BatchNorm2d(32), nn.ReLU())
        s.estagios = nn.Sequential(Bloco(32, 32), Bloco(32, 64, 2), Bloco(64, 64), Bloco(64, 128, 2), Bloco(128, 128))
        s.cabeca = nn.Sequential(nn.AdaptiveAvgPool2d(1), nn.Flatten(), nn.Dropout(0.3), nn.Linear(128, k))
    def forward(s, x):  # x em [0,1]
        return s.cabeca(s.estagios(s.stem((x - 0.1) / 0.25)))

class TracoLSTM(nn.Module):
    def __init__(s, k=K, h=128):
        super().__init__()
        s.conv = nn.Sequential(nn.Conv1d(3, 64, 5, padding=2), nn.ReLU(), nn.Conv1d(64, 96, 5, padding=2), nn.ReLU())
        s.lstm = nn.LSTM(96, h, num_layers=2, batch_first=True, bidirectional=True, dropout=0.3)
        s.fc = nn.Sequential(nn.Dropout(0.3), nn.Linear(2 * h, k))
    def features(s, x):
        return s.conv(x.transpose(1, 2)).transpose(1, 2)
    def forward(s, x, L):
        p = pack_padded_sequence(s.features(x), L.cpu(), batch_first=True, enforce_sorted=False)
        _, (hn, _) = s.lstm(p)
        return s.fc(torch.cat([hn[-2], hn[-1]], 1))

n_par = lambda m: sum(p.numel() for p in m.parameters())
print(f'RabiscoNet: {n_par(RabiscoNet()):,} parâmetros | TracoLSTM: {n_par(TracoLSTM()):,} parâmetros')

# %% [markdown]
# ## 4. Treinamento
# - **Aumento de dados:** 50% dos exemplos de cada lote são **desenhos parciais** (30–90% dos pontos) — ensina a rede a adivinhar cedo;
#   na CNN também aplicamos rotação ±12°, escala 0,9–1,1 e translação ±2 px na GPU; espessura do traço variável (12–20).
# - **Otimização:** AdamW + OneCycle (*warm-up* + decaimento cosseno), *label smoothing* 0,1, checkpoint pela **acurácia de validação**.

# %%
def to_dev(a, dtype=torch.float32): return torch.as_tensor(a).to(DEVICE, dtype)

Xi, Xip = to_dev(treino['img']) / 255, to_dev(treino['img_p']) / 255
Xs, Xsp = to_dev(treino['seq']), to_dev(treino['seq_p'])
Ls, Lsp = torch.as_tensor(treino['len']), torch.as_tensor(treino['len_p'])
Yt = to_dev(treino['y'], torch.long)
Vi, Vs, VL, Vy = to_dev(val['img']) / 255, to_dev(val['seq']), torch.as_tensor(val['len']), val['y']
Ti, Ts, TL, Ty = to_dev(teste['img']) / 255, to_dev(teste['seq']), torch.as_tensor(teste['len']), teste['y']

def aug_img(x):
    B = x.shape[0]
    ang = (torch.rand(B, device=DEVICE) * 2 - 1) * math.radians(12)
    esc = 0.9 + torch.rand(B, device=DEVICE) * 0.2
    tx, ty = [(torch.rand(B, device=DEVICE) * 2 - 1) * (2 / 14) for _ in range(2)]
    th = torch.stack([torch.stack([torch.cos(ang) / esc, -torch.sin(ang) / esc, tx], 1),
                      torch.stack([torch.sin(ang) / esc, torch.cos(ang) / esc, ty], 1)], 1)
    return F.grid_sample(x, F.affine_grid(th, x.shape, align_corners=False), align_corners=False)

@torch.no_grad()
def prever(modelo, tipo, X, L=None, bs=2048):
    modelo.eval(); out = []
    for i in range(0, len(X), bs):
        if tipo == 'cnn': lo = modelo(X[i:i+bs].unsqueeze(1))
        else: lo = modelo(X[i:i+bs], L[i:i+bs])
        out.append(F.softmax(lo.float(), 1).cpu())
    return torch.cat(out).numpy()

def treinar(modelo, tipo, epocas, lr, bs=512):
    modelo.to(DEVICE)
    opt = torch.optim.AdamW(modelo.parameters(), lr=lr, weight_decay=1e-4)
    passos = math.ceil(len(Yt) / bs)
    sch = torch.optim.lr_scheduler.OneCycleLR(opt, lr, total_steps=epocas * passos, pct_start=0.15)
    crit = nn.CrossEntropyLoss(label_smoothing=0.1)
    hist, melhor, pesos = [], -1, None
    for ep in range(1, epocas + 1):
        modelo.train(); t0 = time.time(); perm = torch.randperm(len(Yt), device=DEVICE); soma = acertos = 0
        for i in range(passos):
            idx = perm[i*bs:(i+1)*bs]
            parcial = torch.rand(len(idx), device=DEVICE) < 0.5
            if tipo == 'cnn':
                x = torch.where(parcial[:, None, None], Xip[idx], Xi[idx]).unsqueeze(1)
                lo = modelo(aug_img(x))
            else:
                pc = parcial.cpu(); ic = idx.cpu()
                L = torch.where(pc, Lsp[ic], Ls[ic])
                x = torch.where(parcial[:, None, None], Xsp[idx], Xs[idx])[:, :int(L.max())]
                lo = modelo(x, L)
            loss = crit(lo, Yt[idx])
            opt.zero_grad(set_to_none=True); loss.backward()
            nn.utils.clip_grad_norm_(modelo.parameters(), 1.0)  # protege a LSTM contra exploding gradients
            opt.step(); sch.step()
            soma += loss.item() * len(idx); acertos += (lo.argmax(1) == Yt[idx]).sum().item()
        pv = prever(modelo, tipo, Vi if tipo == 'cnn' else Vs, None if tipo == 'cnn' else VL)
        va = accuracy_score(Vy, pv.argmax(1)); vl = float(-np.log(pv[np.arange(len(Vy)), Vy] + 1e-9).mean())
        hist.append(dict(epoca=ep, loss=soma/len(Yt), acc=acertos/len(Yt), val_loss=vl, val_acc=va))
        marca = ''
        if va > melhor:
            melhor, pesos, marca = va, {k: v.detach().clone() for k, v in modelo.state_dict().items()}, '  <- melhor'
        print(f'[{tipo.upper()}] época {ep:2d} | loss {soma/len(Yt):.4f} acc {acertos/len(Yt):.4f} | val_loss {vl:.4f} val_acc {va:.4f} | {time.time()-t0:.0f}s{marca}')
    modelo.load_state_dict(pesos)
    return pd.DataFrame(hist)

cnn = RabiscoNet(); hist_cnn = treinar(cnn, 'cnn', epocas=15, lr=3e-3)

# %%
lstm = TracoLSTM(); hist_lstm = treinar(lstm, 'lstm', epocas=15, lr=2e-3)

# %%
fig, ax = plt.subplots(1, 2, figsize=(12, 4))
for h, nome, cor in [(hist_cnn, 'CNN', '#d9822b'), (hist_lstm, 'LSTM', '#2b6cb0')]:
    ax[0].plot(h.epoca, h.loss, '--', c=cor, label=f'{nome} treino'); ax[0].plot(h.epoca, h.val_loss, c=cor, label=f'{nome} validação')
    ax[1].plot(h.epoca, h.acc, '--', c=cor, label=f'{nome} treino'); ax[1].plot(h.epoca, h.val_acc, c=cor, label=f'{nome} validação')
ax[0].set_title('Loss'); ax[1].set_title('Acurácia'); [a.set_xlabel('época') or a.legend() or a.grid(alpha=.3) for a in ax]
plt.tight_layout(); plt.savefig(f'{FIG}/curvas_treino.png', dpi=150); plt.show()
print('Obs.: a acurácia de treino é medida com 50% de desenhos parciais + augmentation, por isso fica abaixo da validação (desenhos completos).')

# %% [markdown]
# ## 5. Ensemble e avaliação no conjunto de teste (nunca usado no treino nem na escolha de hiperparâmetros)
# O peso do ensemble `w·CNN + (1−w)·LSTM` é escolhido **na validação**.

# %%
pv_c, pv_l = prever(cnn, 'cnn', Vi), prever(lstm, 'lstm', Vs, VL)
ws = np.linspace(0, 1, 21)
acc_w = [accuracy_score(Vy, (w * pv_c + (1 - w) * pv_l).argmax(1)) for w in ws]
W_CNN = float(ws[int(np.argmax(acc_w))])
print(f'Peso escolhido na validação: w_CNN = {W_CNN:.2f} (acurácia val {max(acc_w):.4f})')

pt_c, pt_l = prever(cnn, 'cnn', Ti), prever(lstm, 'lstm', Ts, TL)
pt_e = W_CNN * pt_c + (1 - W_CNN) * pt_l
resultados = {}
for nome, p in [('CNN', pt_c), ('LSTM', pt_l), ('Ensemble', pt_e)]:
    yp = p.argmax(1); top3 = (np.argsort(-p, 1)[:, :3] == Ty[:, None]).any(1).mean()
    resultados[nome] = dict(acuracia=accuracy_score(Ty, yp), f1_macro=f1_score(Ty, yp, average='macro'), top3=float(top3))
tab = pd.DataFrame(resultados).T
display(tab.style.format('{:.4f}'))

# %%
print(classification_report(Ty, pt_e.argmax(1), target_names=PT, digits=3))
cm = confusion_matrix(Ty, pt_e.argmax(1), normalize='true')
plt.figure(figsize=(13, 11))
sns.heatmap(cm, xticklabels=PT, yticklabels=PT, cmap='Blues', vmin=0, vmax=1, cbar_kws={'label': 'proporção'})
plt.title('Matriz de confusão normalizada — Ensemble (teste)'); plt.xlabel('previsto'); plt.ylabel('real')
plt.tight_layout(); plt.savefig(f'{FIG}/matriz_confusao.png', dpi=150); plt.show()

off = cm.copy(); np.fill_diagonal(off, 0)
pares = sorted([(off[i, j], PT[i], PT[j]) for i in range(K) for j in range(K) if off[i, j] > 0], reverse=True)[:8]
print('Confusões mais frequentes (real → previsto):')
for v, a, b in pares: print(f'  {a:>14s} → {b:<14s} {v*100:.1f}%')

# %% [markdown]
# ## 6. Quem adivinha mais cedo? (reconhecimento com desenho parcial)
# Para 3.000 desenhos de teste, simulamos o desenho **sendo feito**: 20%, 30%, …, 100% dos pontos.

# %%
rng = np.random.default_rng(0); amostra = rng.choice(len(Ty), 3000, replace=False)
FRACS = [0.2, 0.3, 0.4, 0.5, 0.6, 0.7, 0.8, 0.9, 1.0]
curva = {n: [] for n in ['CNN', 'LSTM', 'Ensemble']}
for f in FRACS:
    res = [ (rasterizar(tp), sequenciar(tp)) for tp in (normalizar(prefixo(teste['tracos'][i], f)) for i in amostra) ]
    xi = to_dev(np.stack([r[0] for r in res])) / 255
    L = torch.as_tensor([len(r[1]) for r in res]); S = np.zeros((len(res), MAX_PONTOS, 3), np.float32)
    for j, r in enumerate(res): S[j, :len(r[1])] = r[1]
    pc, pl = prever(cnn, 'cnn', xi), prever(lstm, 'lstm', to_dev(S), L)
    yt = Ty[amostra]
    for n, p in [('CNN', pc), ('LSTM', pl), ('Ensemble', W_CNN * pc + (1 - W_CNN) * pl)]:
        curva[n].append(accuracy_score(yt, p.argmax(1)))

plt.figure(figsize=(8, 4.5))
for n, c in [('CNN', '#d9822b'), ('LSTM', '#2b6cb0'), ('Ensemble', '#2f855a')]:
    plt.plot([f * 100 for f in FRACS], curva[n], 'o-', c=c, label=n, lw=2)
plt.xlabel('% do desenho concluído'); plt.ylabel('acurácia'); plt.grid(alpha=.3); plt.legend()
plt.title('Reconhecimento antecipado: acurácia × quanto do desenho já foi feito')
plt.tight_layout(); plt.savefig(f'{FIG}/reconhecimento_antecipado.png', dpi=150); plt.show()
display(pd.DataFrame(curva, index=[f'{int(f*100)}%' for f in FRACS]).T.style.format('{:.3f}'))

# %% [markdown]
# ## 7. Exportação para ONNX (roda no navegador com `onnxruntime-web`, 100% offline)
# Os modelos exportados já incluem o **softmax** na saída. A LSTM é exportada sem `pack_padded_sequence`
# (no jogo o lote tem 1 desenho, sem *padding*), com o eixo de tempo dinâmico.

# %%
import onnx, onnxruntime as ort

class CNNExport(nn.Module):
    def __init__(s, m): super().__init__(); s.m = m
    def forward(s, imagem): return F.softmax(s.m(imagem), 1)

class LSTMExport(nn.Module):
    def __init__(s, m): super().__init__(); s.m = m
    def forward(s, sequencia):
        _, (hn, _) = s.m.lstm(s.m.features(sequencia))
        return F.softmax(s.m.fc(torch.cat([hn[-2], hn[-1]], 1)), 1)

def exportar(mod, exemplo, nome_in, eixos, arquivo):
    mod = mod.cpu().eval()
    kw = dict(input_names=[nome_in], output_names=['probs'], dynamic_axes={nome_in: eixos, 'probs': {0: 'lote'}})
    try:   # exportador clássico (TorchScript): gera o operador LSTM nativo do ONNX
        torch.onnx.export(mod, (exemplo,), arquivo, opset_version=17, dynamo=False, **kw)
    except TypeError:  # PyTorch antigo, sem o argumento `dynamo`
        torch.onnx.export(mod, (exemplo,), arquivo, opset_version=17, **kw)
    except Exception as e:  # PyTorch novo sem o exportador clássico -> exportador dynamo
        print('Exportador clássico indisponível (', type(e).__name__, ') -> usando dynamo=True')
        torch.onnx.export(mod, (exemplo,), arquivo, dynamo=True, **kw)
    onnx.checker.check_model(onnx.load(arquivo))
    print(f'{arquivo}: {os.path.getsize(arquivo)/1024:.0f} KB')

exportar(CNNExport(cnn), torch.zeros(1, 1, 28, 28), 'imagem', {0: 'lote'}, f'{OUT}/cnn.onnx')
exportar(LSTMExport(lstm), torch.zeros(1, 20, 3), 'sequencia', {0: 'lote', 1: 'tempo'}, f'{OUT}/lstm.onnx')
cnn.to(DEVICE); lstm.to(DEVICE)

# %% [markdown]
# ### 7.1 Conferência PyTorch × ONNX e latência em CPU

# %%
sc = ort.InferenceSession(f'{OUT}/cnn.onnx', providers=['CPUExecutionProvider'])
sl = ort.InferenceSession(f'{OUT}/lstm.onnx', providers=['CPUExecutionProvider'])
dif_c = dif_l = 0
tc, tl = [], []
for i in range(200):
    xi = teste['img'][i][None, None].astype(np.float32) / 255
    xs = teste['seq'][i][:teste['len'][i]][None].astype(np.float32)
    t0 = time.perf_counter(); oc = sc.run(None, {'imagem': xi})[0]; tc.append(time.perf_counter() - t0)
    t0 = time.perf_counter(); ol = sl.run(None, {'sequencia': xs})[0]; tl.append(time.perf_counter() - t0)
    dif_c = max(dif_c, np.abs(oc - pt_c[i]).max()); dif_l = max(dif_l, np.abs(ol - pt_l[i]).max())
print(f'Diferença máx. PyTorch×ONNX — CNN: {dif_c:.2e} | LSTM: {dif_l:.2e}')
LAT = dict(cnn_ms=1000 * float(np.median(tc)), lstm_ms=1000 * float(np.median(tl)))
print(f'Latência mediana em CPU (1 desenho): CNN {LAT["cnn_ms"]:.2f} ms | LSTM {LAT["lstm_ms"]:.2f} ms')
assert dif_c < 1e-3 and dif_l < 1e-3, 'ONNX divergente do PyTorch!'

# %% [markdown]
# ## 8. Arquivos para o jogo e para a Parte 2 (SLM)
# - `teste_paridade.json`: 8 desenhos com o resultado esperado do pré-processamento e das redes → o jogo roda um **autoteste** ao abrir.
# - `predicoes_validacao.json`: saídas **reais** das redes em desenhos de validação (completos e parciais). Viram as entradas do
#   modo *VEREDITO* no dataset destilado do SLM — o SLM aprende a interpretar as probabilidades (*soft labels*) dessas redes.

# %%
classes = [{'id': k, 'en': EN[k], 'pt': PT[k]} for k in range(K)]
json.dump({'classes': classes, 'w_cnn': W_CNN, 'tela': TELA, 'caixa': CAIXA, 'espessura': ESPESSURA, 'max_pontos': MAX_PONTOS},
          open(f'{OUT}/classes.json', 'w', encoding='utf8'), ensure_ascii=False, indent=1)

paridade = []
for i in rng.choice(len(Ty), 8, replace=False):
    tr = teste['tracos'][i]; tn = normalizar(tr); im = rasterizar(tn); sq = sequenciar(tn)
    paridade.append({'classe': PT[Ty[i]], 'tracos': [[list(map(float, t[0])), list(map(float, t[1]))] for t in tr],
                     'imagem': (im / 255).round(4).flatten().tolist(), 'sequencia': sq.round(5).tolist(),
                     'probs_cnn': sc.run(None, {'imagem': (im[None, None] / 255).astype(np.float32)})[0][0].round(5).tolist(),
                     'probs_lstm': sl.run(None, {'sequencia': sq[None]})[0][0].round(5).tolist()})
json.dump(paridade, open(f'{OUT}/teste_paridade.json', 'w'))

def top5(p): return [[PT[j], round(float(p[j]), 3)] for j in np.argsort(-p)[:5]]
preds, idxs = [], rng.choice(len(Vy), 1500, replace=False)
for n, i in enumerate(idxs):
    f = [0.35, 0.5, 0.7, 1.0][n % 4]
    tp = normalizar(prefixo(val['tracos'][i], f)); im = rasterizar(tp); sq = sequenciar(tp)
    pc = sc.run(None, {'imagem': (im[None, None] / 255).astype(np.float32)})[0][0]
    pl = sl.run(None, {'sequencia': sq[None]})[0][0]
    preds.append({'alvo': PT[Vy[i]], 'fracao_desenho': f, 'cnn': top5(pc), 'lstm': top5(pl), 'ensemble': top5(W_CNN * pc + (1 - W_CNN) * pl)})
json.dump(preds, open(f'{OUT}/predicoes_validacao.json', 'w', encoding='utf8'), ensure_ascii=False)

metricas = {'teste': resultados, 'w_cnn': W_CNN, 'reconhecimento_antecipado': {'fracoes': FRACS, **curva},
            'parametros': {'cnn': n_par(cnn), 'lstm': n_par(lstm)}, 'latencia_cpu_ms': LAT,
            'tamanho_kb': {'cnn': os.path.getsize(f'{OUT}/cnn.onnx') // 1024, 'lstm': os.path.getsize(f'{OUT}/lstm.onnx') // 1024},
            'dados': {'categorias': K, 'treino': int(len(Yt)), 'val': int(len(Vy)), 'teste': int(len(Ty))},
            'confusoes': [[a, b, round(float(v), 3)] for v, a, b in pares]}
json.dump(metricas, open(f'{OUT}/metricas_redes.json', 'w', encoding='utf8'), ensure_ascii=False, indent=1, default=float)
print(json.dumps(metricas, ensure_ascii=False, indent=1, default=float)[:1500])

# %%
zip_path = '/content/modelos_redes.zip' if os.path.isdir('/content') else 'modelos_redes.zip'
with zipfile.ZipFile(zip_path, 'w', zipfile.ZIP_DEFLATED) as z:
    for raiz, _, arqs in os.walk(OUT):
        for a in arqs: z.write(os.path.join(raiz, a), os.path.relpath(os.path.join(raiz, a), OUT))
print('Gerado:', zip_path, f'({os.path.getsize(zip_path)/1e6:.1f} MB)')
try:
    from google.colab import files; files.download(zip_path)
except ImportError:
    pass

# %% [markdown]
# ## 9. Conclusões (preencher com os números obtidos)
# - **Imagem × sequência:** compare acurácia/F1 da CNN e da LSTM na tabela da Seção 5. O ensemble combina as duas visões.
# - **Reconhecimento antecipado:** a curva da Seção 6 mostra qual rede “chuta certo” com menos traços — é o efeito que o público vê no jogo.
# - **Confusões:** animais de quatro patas (vaca × cavalo × cachorro × porco) tendem a se confundir — o SLM usa essa informação
#   (“quase achei que era um cavalo!”) na narração do veredito.
# - **Implantação:** os modelos têm poucas centenas de KB e respondem em ~1 ms na CPU, o que permite inferência a cada traço no navegador.
