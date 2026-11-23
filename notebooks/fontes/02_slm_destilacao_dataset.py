# %% [markdown]
# # 🤠 Desenha Aí, Sô! — Parte 2: Destilação de Conhecimento (Teacher → Student)
#
# **UniRV · Engenharia de Software · Disciplinas:** Redes Neurais · Small Language Models — **Prof.:** Sandro S. Moreira
# **Discente:** Gilberto Aparecido Dias Junior
#
# ---
#
# No jogo, o SLM **Zé do Rabisco** (locutor de rodeio goiano) tem três trabalhos — e cada um é uma tarefa do dataset:
#
# | Tarefa | Entrada | Saída | Verificação automática na curadoria |
# |---|---|---|---|
# | **CHARADA** | palavra secreta + nível | charada que leva ao desenho | a palavra secreta **não pode vazar** (nem plural/diminutivo) |
# | **VEREDITO** | alvo + top-5 da **CNN**, da **LSTM** e do **ensemble** (saídas reais da Parte 1) | `ACERTOU / QUASE / ERROU` + narração | o veredito tem que bater com a **regra do jogo** |
# | **PERGUNTA** | dúvida de um visitante sobre o projeto/IA | explicação simples e caipira | números citados têm que existir na **ficha técnica** (anti-alucinação) |
#
# **Pipeline** (o mesmo da atividade N2, agora aplicado ao jogo):
# seeds manuais → **Evol-Instruct** (*in-depth* e *in-breadth*) → **Teacher com Chain-of-Thought** (`<pensamento>` / `<resposta>`) →
# **curadoria** (tags, recusas, tamanho, verificações por tarefa, desduplicação, Markdown) → **ShareGPT/ChatML** com *split* treino/val/teste.
#
# A destilação aqui é **em nível de sequência** (*sequence-level KD*, Kim & Rush 2016): a API do Teacher não expõe logits, então o
# Student aprende imitando as sequências (raciocínio + resposta) geradas pelo Teacher. Um detalhe interessante: no modo VEREDITO
# o Student aprende a ler **distribuições de probabilidade** das redes — o mesmo conceito de *soft labels / dark knowledge* da aula.
#
# > Envie para o Colab o `modelos_redes.zip` gerado na Parte 1 (painel *Arquivos*). Sem ele, o notebook gera cenários sintéticos.
# > Chave gratuita do Gemini em https://aistudio.google.com → *Secrets* do Colab com o nome `GEMINI_API_KEY`
# > (opcional: `GROQ_API_KEY` para usar Llama-3.3-70B como Teacher).

# %% [markdown]
# ## 1. Instalação e configuração do Teacher

# %%
%pip install -q google-genai groq matplotlib

# %%
import os, re, json, time, math, random, zipfile, unicodedata, statistics, collections
import matplotlib.pyplot as plt

SEED = 42
rng = random.Random(SEED)
OUT = '/content/slm' if os.path.isdir('/content') else './slm'
ART = os.path.join(OUT, 'artefatos'); os.makedirs(ART, exist_ok=True)

PROVEDOR = 'gemini'                      # 'gemini' ou 'groq'
TEACHER_MODEL = 'gemini-3.5-flash-lite'  # usado com sucesso na atividade N2 (troque por 'gemini-2.5-flash' se preferir)
GROQ_MODEL = 'llama-3.3-70b-versatile'
INTERVALO_S = 4.5                        # respeita ~15 requisições/min do free tier

def segredo(nome):
    try:
        from google.colab import userdata; return userdata.get(nome)
    except Exception:
        return os.environ.get(nome)

if PROVEDOR == 'gemini':
    from google import genai
    from google.genai import types
    cliente = genai.Client(api_key=segredo('GEMINI_API_KEY'))
else:
    from groq import Groq
    cliente = Groq(api_key=segredo('GROQ_API_KEY'))

USO = collections.Counter()
_ultimo = [0.0]
def teacher(prompt, temperatura=0.8, json_saida=True, tentativas=5):
    """Chama o LLM Teacher com controle de taxa e *backoff* exponencial."""
    for t in range(tentativas):
        espera = INTERVALO_S - (time.time() - _ultimo[0])
        if espera > 0: time.sleep(espera)
        _ultimo[0] = time.time()
        try:
            USO['chamadas'] += 1
            if PROVEDOR == 'gemini':
                cfg = types.GenerateContentConfig(temperature=temperatura, max_output_tokens=8192,
                                                  response_mime_type='application/json' if json_saida else 'text/plain')
                r = cliente.models.generate_content(model=TEACHER_MODEL, contents=prompt, config=cfg)
                txt = r.text
            else:
                r = cliente.chat.completions.create(model=GROQ_MODEL, temperature=temperatura, max_tokens=8000,
                        messages=[{'role': 'user', 'content': prompt}],
                        response_format={'type': 'json_object'} if json_saida else None)
                txt = r.choices[0].message.content
            return json.loads(txt) if json_saida else txt
        except Exception as e:
            USO['erros'] += 1
            print(f'  tentativa {t+1} falhou: {type(e).__name__}: {str(e)[:120]}')
            time.sleep(min(60, 5 * 2 ** t))
    return None

print('Teste do Teacher:', teacher('Responda em JSON {"ok": true, "saudacao": "<uma saudação caipira curta>"}'))

# %% [markdown]
# ## 2. Entradas vindas da Parte 1 (Redes Neurais)

# %%
PRED, MET = None, None
for z in ['/content/modelos_redes.zip', 'modelos_redes.zip']:
    if os.path.exists(z):
        with zipfile.ZipFile(z) as f:
            PRED = json.loads(f.read('predicoes_validacao.json'))
            MET = json.loads(f.read('metricas_redes.json'))
            CLASSES = [c['pt'] for c in json.loads(f.read('classes.json'))['classes']]
        print('Parte 1 carregada:', len(PRED), 'predições reais das redes')
        break
if PRED is None:
    print('modelos_redes.zip não encontrado → cenários sintéticos (rode a Parte 1 para usar as saídas reais).')
    CLASSES = ['vaca', 'cavalo', 'porco', 'gato', 'cachorro', 'passarinho', 'peixe', 'cobra', 'aranha', 'borboleta',
               'trator', 'caminhonete', 'celeiro', 'violão', 'chapéu', 'sol', 'lua', 'nuvem', 'raio', 'árvore', 'flor',
               'banana', 'melancia', 'abacaxi', 'casa', 'bicicleta', 'avião', 'fogueira', 'xícara de café', 'óculos']

# %% [markdown]
# ### Ficha técnica do projeto (base de conhecimento para a tarefa PERGUNTA)
# O Teacher só pode usar estes fatos. Na curadoria, qualquer número da resposta que não esteja aqui (nem na pergunta) reprova a amostra.

# %%
def pct(x): return f'{100*x:.1f}%'.replace('.', ',')
if MET:
    r = MET['teste']
    fatos_rn = (f"A CNN acertou {pct(r['CNN']['acuracia'])} dos desenhos de teste, a LSTM {pct(r['LSTM']['acuracia'])} e o ensemble "
                f"(as duas juntas) {pct(r['Ensemble']['acuracia'])}. Foram {MET['dados']['treino']} desenhos de treino. "
                f"A CNN tem {MET['parametros']['cnn']} parâmetros e a LSTM {MET['parametros']['lstm']}. "
                f"Cada rede responde em cerca de {MET['latencia_cpu_ms']['cnn_ms']:.0f} a {max(1, MET['latencia_cpu_ms']['lstm_ms']):.0f} milissegundos no processador.")
else:
    fatos_rn = 'As duas redes acertam a grande maioria dos desenhos completos de teste e respondem em poucos milissegundos.'

FICHA = f"""
- Jogo: Desenha Aí, Sô!, feito por Gilberto Aparecido Dias Junior (Engenharia de Software, UniRV, Rio Verde-GO) para as disciplinas de Redes Neurais e Small Language Models do professor Sandro Moreira.
- Como funciona: o Zé do Rabisco (o SLM) cria uma charada, o visitante desenha a resposta em 20 segundos e duas redes neurais tentam adivinhar o desenho enquanto ele é feito.
- Dados: Google Quick, Draw!, 30 categorias (animais da roça, trator, caminhonete, violão, chapéu, frutas, clima etc.).
- CNN (rede neural convolucional): enxerga o desenho como uma imagem de 28 por 28 pixels; usa filtros convolucionais e blocos residuais.
- LSTM (rede neural recorrente): lê o desenho como uma sequência de traços, ponto a ponto, na ordem em que foi feito; tem memória (portas de esquecer, entrada e saída), por isso consegue adivinhar antes do desenho terminar.
- Ensemble: média ponderada das probabilidades da CNN e da LSTM. {fatos_rn}
- As redes rodam no navegador (formato ONNX), sem internet.
- Zé do Rabisco: modelo Qwen3 de 1,7 bilhão de parâmetros (família Qwen3 da Alibaba, código aberto), ajustado com QLoRA usando a biblioteca Unsloth.
- Destilação: um modelo professor grande (Teacher) gerou exemplos com raciocínio passo a passo; o Zé (Student) aprendeu imitando esses exemplos.
- Quantização: os pesos do Zé foram comprimidos para 4 bits (formato GGUF, Q4_K_M). Em 16 bits o modelo ocupa cerca de 3,4 GB; em 4 bits cerca de 1,1 GB, por isso roda num notebook comum, sem placa de vídeo e sem internet, usando o llama.cpp.
- LoRA: em vez de treinar todos os pesos, treina pequenas matrizes adaptadoras (menos de 2% dos parâmetros).
- Regra do veredito: ACERTOU se o palpite principal do ensemble é o desenho pedido; QUASE se o desenho pedido está entre os 3 primeiros palpites; ERROU nos outros casos.
""".strip()
print(FICHA)

# %% [markdown]
# ## 3. Persona, formato e *system prompt* do Student
# O *system prompt* do Student é **curto de propósito**: no evento o SLM roda em CPU, e cada token de entrada custa tempo.

# %%
SYSTEM = ('Você é o Zé do Rabisco, locutor de rodeio goiano do jogo Desenha Aí, Sô!. '
          'Raciocine de forma curta dentro de <pensamento>...</pensamento> e responda dentro de <resposta>...</resposta>, '
          'em português, com humor caipira e respeitoso.')

ESTILO = """Persona: Zé do Rabisco, locutor de rodeio de Rio Verde-GO. Fala animada e calorosa, com expressões goianas
("uai", "sô", "trem", "nó", "ô loco", "arreda", "cê", "bão demais") sem exagerar (no máximo 2-3 por resposta), nunca ofensivo,
nunca zomba da pessoa, só brinca com o desenho. Sem emojis, sem Markdown (nada de **, #, listas).
Formato OBRIGATÓRIO de cada exemplo: "<pensamento>raciocínio curto (20 a 70 palavras)</pensamento><resposta>...</resposta>" e nada fora das tags."""

# %% [markdown]
# ## 4. Tarefa CHARADA — seeds manuais + evolução por nível e estilo
#
# **Seeds manuais (10)** mostram ao Teacher o padrão esperado. A evolução cria variações:
# - **In-depth** (mais difícil): nível *fácil* → *médio* (pistas indiretas) → *difícil* (metáfora, sem as características óbvias).
# - **In-breadth** (outro contexto): estilos *adivinha de vó*, *verso rimado de cordel*, *narração de rodeio*, *causo de roça*.

# %%
SEEDS_CHARADA = [
    ('vaca', 'fácil', 'Malhada, mansa e dá leite pro café da manhã. Muuu! Quem é?'),
    ('trator', 'médio', 'Tem roda grande atrás e pequena na frente, puxa a grade na lavoura e não toma água, só óleo. O que é?'),
    ('violão', 'médio', 'Tem cintura mas não usa cinto, tem seis cordas mas não amarra nada, e é dono de toda moda caipira.'),
    ('chapéu', 'fácil', 'Todo peão usa na cabeça pra fugir do sol do meio-dia. O que é?'),
    ('lua', 'difícil', 'De noite sou queijo, de vez em quando sou unha cortada, e nunca chego perto de quem me admira.'),
    ('melancia', 'médio', 'Por fora verde listrada, por dentro vermelha e cheia de pintinha preta. Fruta de beira de rio no calor.'),
    ('cobra', 'fácil', 'Não tem perna, mas anda; não tem braço, mas abraça. Cuidado no meio do pasto!'),
    ('raio', 'difícil', 'Chego antes do barulho, desenho zigue-zague no céu e não gosto de árvore sozinha no pasto.'),
    ('caminhonete', 'médio', 'Cabine na frente, caçamba atrás, leva o peão e a ração pro curral na estrada de chão.'),
    ('fogueira', 'fácil', 'Festa junina sem ela não tem graça: estala, esquenta e assa o milho.'),
]
NIVEIS = {'fácil': 'pistas diretas e bem conhecidas', 'médio': 'pistas indiretas, exige pensar um pouco',
          'difícil': 'metáforas e duplo sentido, evitando as características mais óbvias'}
ESTILOS = {'adivinha': 'adivinha de vó ("o que é, o que é?")', 'cordel': 'dois versos rimados no estilo cordel',
           'rodeio': 'como se anunciasse no rodeio', 'causo': 'mini causo de roça de uma ou duas frases'}

def prompt_charada(palavra, pedidos):
    exemplos = '\n'.join(f'- palavra "{p}", nível {n}: {c}' for p, n, c in rng.sample(SEEDS_CHARADA, 4))
    itens = '\n'.join(f'{i+1}. nível {n} ({NIVEIS[n]}), estilo {ESTILOS[e]}' for i, (n, e) in enumerate(pedidos))
    return f"""Você é o professor (Teacher) que gera dados de treino para um modelo pequeno.
{ESTILO}

TAREFA: criar charadas para o jogo de desenho. A palavra secreta é "{palavra}".
Regras da charada: 1 ou 2 frases, até 35 palavras, precisa levar a algo DESENHÁVEL, NUNCA escrever a palavra secreta
(nem plural, diminutivo, aumentativo ou tradução). No <pensamento>, liste as características visuais/culturais da palavra,
descarte as que entregam demais para o nível pedido e escolha o ângulo da charada.
Dentro de <resposta> escreva só: "Charada: <texto>".

Exemplos de charadas (outras palavras):
{exemplos}

Gere {len(pedidos)} exemplos, um para cada pedido:
{itens}

Responda em JSON: {{"exemplos": ["<pensamento>...</pensamento><resposta>Charada: ...</resposta>", ...]}}"""

def entrada_charada(palavra, nivel):
    return f'TAREFA: CHARADA\nPalavra secreta: {palavra}\nNível: {nivel}'

# %% [markdown]
# ## 5. Tarefa VEREDITO — cenários com as saídas **reais** da CNN e da LSTM
# A regra é determinística; o Teacher precisa chegar nela pelo raciocínio, e a curadoria descarta quem errar.

# %%
def regra(alvo, ens):
    nomes = [n for n, _ in ens]
    return 'ACERTOU' if nomes[0] == alvo else ('QUASE' if alvo in nomes[:3] else 'ERROU')

def fmt_top(lst): return ', '.join(f'{n} {round(100*p)}%' for n, p in lst)

def entrada_veredito(c):
    return (f"TAREFA: VEREDITO\nDesafio: {c['alvo']}\nDesenho concluído: {round(100*c['fracao_desenho'])}%\n"
            f"CNN (imagem): {fmt_top(c['cnn'])}\nLSTM (traços): {fmt_top(c['lstm'])}\nEnsemble: {fmt_top(c['ensemble'])}")

def cenario_sintetico():
    alvo = rng.choice(CLASSES); tipo = rng.choice(['ACERTOU', 'QUASE', 'ERROU'])
    outros = rng.sample([c for c in CLASSES if c != alvo], 6)
    def dist(primeiro):
        ps = sorted([rng.random() ** 2 for _ in range(5)], reverse=True); s = sum(ps); ps = [p / s for p in ps]
        ordem = ([alvo] + outros[:4]) if primeiro else (outros[:1] + [alvo] + outros[1:4] if tipo == 'QUASE' else outros[:5])
        return [[n, round(p, 3)] for n, p in zip(ordem, ps)]
    ens = dist(tipo == 'ACERTOU')
    return {'alvo': alvo, 'fracao_desenho': rng.choice([0.35, 0.5, 0.7, 1.0]), 'cnn': dist(rng.random() < .6), 'lstm': dist(rng.random() < .5), 'ensemble': ens}

N_VEREDITO = 240
if PRED:  # balanceia os três vereditos
    por_tipo = collections.defaultdict(list)
    for c in PRED: por_tipo[regra(c['alvo'], c['ensemble'])].append(c)
    print({k: len(v) for k, v in por_tipo.items()})
    cenarios = []
    for k in ['ACERTOU', 'QUASE', 'ERROU']:
        cenarios += rng.sample(por_tipo[k], min(len(por_tipo[k]), N_VEREDITO // 3))
    while len(cenarios) < N_VEREDITO: cenarios.append(cenario_sintetico())
else:
    cenarios = [cenario_sintetico() for _ in range(N_VEREDITO)]
rng.shuffle(cenarios)
print(entrada_veredito(cenarios[0]), '\n→ regra:', regra(cenarios[0]['alvo'], cenarios[0]['ensemble']))

def prompt_veredito(lote):
    casos = '\n\n'.join(f'CASO {i+1}:\n{entrada_veredito(c)}' for i, c in enumerate(lote))
    return f"""Você é o professor (Teacher) que gera dados de treino para um modelo pequeno.
{ESTILO}

TAREFA: julgar o desenho do visitante a partir das probabilidades das duas redes neurais.
Regra (aplique com rigor): ACERTOU se o 1º palpite do Ensemble é o Desafio; QUASE se o Desafio está entre os 3 primeiros do Ensemble;
ERROU nos outros casos.
No <pensamento> (20 a 70 palavras): compare o Desafio com o 1º palpite do Ensemble, aplique a regra, e observe algo curioso
(ex.: a CNN e a LSTM discordaram, a confiança foi baixa, o desenho foi só 35% concluído, qual foi a confusão).
Dentro de <resposta> exatamente duas linhas:
VEREDITO: ACERTOU|QUASE|ERROU
NARRAÇÃO: 1 a 3 frases de locutor de rodeio (até 45 palavras), citando com graça o que as redes acharam. Se errou, consola e anima.

{casos}

Responda em JSON: {{"exemplos": ["<pensamento>...</pensamento><resposta>VEREDITO: ...\\nNARRAÇÃO: ...</resposta>", ...]}} — um por caso, na mesma ordem."""

# %% [markdown]
# ## 6. Tarefa PERGUNTA — Evol-Instruct completo (WizardLM)
# 12 perguntas-semente → 2 gerações de evolução, cada pergunta gera um filho **in-depth** e um **in-breadth**.

# %%
SEEDS_PERGUNTA = [
    'Como a IA sabe o que eu desenhei?', 'O que é uma rede neural?', 'Qual a diferença entre a CNN e a LSTM?',
    'Por que a máquina adivinha antes de eu terminar o desenho?', 'Você está conectado na internet?',
    'O que é um Small Language Model?', 'Como vocês treinaram o Zé do Rabisco?', 'O que é quantização?',
    'Por que o computador às vezes confunde vaca com cavalo?', 'Quem fez esse projeto?',
    'O que é destilação de conhecimento?', 'Isso aí é o ChatGPT?']
EVOL_DEPTH = ['acrescente uma restrição (ex.: "explica como se eu tivesse 8 anos", "em uma frase", "com um exemplo da roça")',
              'aprofunde: peça o porquê técnico ou compare duas coisas da ficha técnica',
              'concretize: amarre a pergunta numa situação do jogo que o visitante acabou de viver']
EVOL_BREADTH = ['troque o perfil de quem pergunta (criança, avó, professor de computação, produtor rural, estudante de medicina)',
                'mude o tema para outro item da ficha técnica, mantendo a dificuldade',
                'transforme em pergunta desconfiada ou bem-humorada ("isso aí não é mágica não?")']

def evoluir(perguntas):
    pedidos = []
    for p in perguntas:
        pedidos.append({'origem': p, 'tipo': 'in_depth', 'instrucao': rng.choice(EVOL_DEPTH)})
        pedidos.append({'origem': p, 'tipo': 'in_breadth', 'instrucao': rng.choice(EVOL_BREADTH)})
    novos = []
    for i in range(0, len(pedidos), 8):
        lote = pedidos[i:i+8]
        lista = '\n'.join(f'{j+1}. Original: "{x["origem"]}" → {x["instrucao"]}' for j, x in enumerate(lote))
        r = teacher(f"""Reescreva cada pergunta de visitante de uma feira de IA seguindo a instrução indicada (Evol-Instruct).
A nova pergunta deve continuar respondível com esta ficha técnica:\n{FICHA}\n\n{lista}\n
Responda em JSON: {{"perguntas": ["...", ...]}} — só as novas perguntas, na mesma ordem, cada uma com até 30 palavras.""", 0.9)
        for x, q in zip(lote, (r or {}).get('perguntas', [])):
            if isinstance(q, str) and 5 <= len(q.split()) <= 40 and q.strip() != x['origem']:
                novos.append({'pergunta': q.strip(), 'evolucao': x['tipo']})
    return novos

perguntas = [{'pergunta': p, 'evolucao': 'seed'} for p in SEEDS_PERGUNTA]
geracao = perguntas
for g in range(2):
    geracao = evoluir([x['pergunta'] for x in geracao])
    perguntas += geracao
    print(f'geração {g+1}: +{len(geracao)} → {len(perguntas)} perguntas')
json.dump(perguntas, open(f'{ART}/perguntas_evoluidas.json', 'w', encoding='utf8'), ensure_ascii=False, indent=1)
for x in perguntas[-4:]: print(' ', x['evolucao'], '|', x['pergunta'])

def entrada_pergunta(q): return f'TAREFA: PERGUNTA\nVisitante: {q}'

def prompt_pergunta(lote):
    qs = '\n'.join(f'{i+1}. {q}' for i, q in enumerate(lote))
    return f"""Você é o professor (Teacher) que gera dados de treino para um modelo pequeno.
{ESTILO}

TAREFA: responder perguntas de visitantes na bancada do projeto. Use SOMENTE estes fatos (não invente números nem detalhes):
{FICHA}

No <pensamento> (20 a 70 palavras): identifique o que a pessoa quer saber, quais fatos da ficha respondem e como explicar
de forma simples (com uma comparação do dia a dia da roça, se ajudar). Se a pergunta fugir do projeto, responda curto e traga a conversa de volta para o jogo.
Dentro de <resposta>: de 2 a 4 frases (até 70 palavras), corretas e simples, no jeito do Zé.

Perguntas:
{qs}

Responda em JSON: {{"exemplos": ["<pensamento>...</pensamento><resposta>...</resposta>", ...]}} — um por pergunta, na mesma ordem."""

# %% [markdown]
# ## 7. Geração com o Teacher (Chain-of-Thought), com *checkpoint*
# Cada resposta é gravada em `artefatos/dataset_bruto.jsonl`; se a sessão cair, rodar de novo continua de onde parou.

# %%
BRUTO = f'{ART}/dataset_bruto.jsonl'
feitos = set()
if os.path.exists(BRUTO):
    for l in open(BRUTO, encoding='utf8'): feitos.add(json.loads(l)['lote_id'])
print('Lotes já gerados:', len(feitos))

def gravar(lote_id, tarefa, entradas, metas, saida):
    exs = (saida or {}).get('exemplos', [])
    with open(BRUTO, 'a', encoding='utf8') as f:
        for i, ent in enumerate(entradas):
            f.write(json.dumps({'lote_id': lote_id, 'tarefa': tarefa, 'entrada': ent, 'meta': metas[i],
                                'saida': exs[i] if i < len(exs) and isinstance(exs[i], str) else None}, ensure_ascii=False) + '\n')

# CHARADA: 30 palavras × 6 pedidos (3 níveis × 2 estilos sorteados) = 180
tarefas = []
for p in CLASSES:
    pedidos = [(n, e) for n in NIVEIS for e in rng.sample(list(ESTILOS), 2)]
    tarefas.append(('charada_' + p, 'CHARADA', prompt_charada(p, pedidos),
                    [entrada_charada(p, n) for n, _ in pedidos], [{'palavra': p, 'nivel': n, 'estilo': e} for n, e in pedidos]))
for i in range(0, len(cenarios), 6):
    lote = cenarios[i:i+6]
    tarefas.append((f'veredito_{i}', 'VEREDITO', prompt_veredito(lote), [entrada_veredito(c) for c in lote],
                    [{'regra': regra(c['alvo'], c['ensemble']), 'fonte': 'real' if PRED and c in PRED else 'sintetico'} for c in lote]))
for i in range(0, len(perguntas), 5):
    lote = perguntas[i:i+5]
    tarefas.append((f'pergunta_{i}', 'PERGUNTA', prompt_pergunta([x['pergunta'] for x in lote]),
                    [entrada_pergunta(x['pergunta']) for x in lote], [{'evolucao': x['evolucao'], 'pergunta': x['pergunta']} for x in lote]))
print(len(tarefas), 'chamadas ao Teacher previstas')

t0 = time.time()
for n, (lid, tarefa, prompt, entradas, metas) in enumerate(tarefas):
    if lid in feitos: continue
    saida = teacher(prompt, temperatura=0.3 if tarefa == 'VEREDITO' else 0.8)
    gravar(lid, tarefa, entradas, metas, saida)
    if n % 10 == 0: print(f'{n+1}/{len(tarefas)} · {time.time()-t0:.0f}s · uso {dict(USO)}')
print('Geração concluída:', dict(USO))

# %% [markdown]
# ## 8. Curadoria e limpeza
#
# | # | Filtro | Ação |
# |---|---|---|
# | 1 | saída vazia/ausente | rejeita |
# | 2 | tags: exatamente um `<pensamento>` e um `<resposta>`, fechados, nessa ordem, nada fora | rejeita |
# | 3 | recusas (“como uma IA…”, “não posso”) e inglês | rejeita |
# | 4 | tamanho do pensamento (12–90 palavras) e da resposta (por tarefa) | rejeita |
# | 5 | CHARADA: palavra secreta vazou (sem acento, plural, diminutivo) | rejeita |
# | 6 | VEREDITO: linha `VEREDITO:` ≠ regra do jogo, ou sem `NARRAÇÃO:` | rejeita |
# | 7 | PERGUNTA: número que não existe na ficha nem na pergunta (alucinação) | rejeita |
# | 8 | Markdown (`**`, `#`, listas) e emojis | **repara** |
# | 9 | quase-duplicatas (Jaccard de trigramas > 0,7 na mesma tarefa) | rejeita |

# %%
def sem_acento(s): return ''.join(c for c in unicodedata.normalize('NFD', s.lower()) if unicodedata.category(c) != 'Mn')
RE_TAGS = re.compile(r'^\s*<pensamento>(.+?)</pensamento>\s*<resposta>(.+?)</resposta>\s*$', re.S)
RE_RECUSA = re.compile(r'como (uma|um) (ia|modelo)|não posso|nao posso|sou apenas um|as an ai|i cannot|i\'m sorry', re.I)
RE_EMOJI = re.compile('[\U0001F300-\U0001FAFF\u2600-\u27BF]')
NUMS_FICHA = set(re.findall(r'\d+(?:[.,]\d+)?', FICHA))

def reparar(txt):
    rep = []
    novo = re.sub(r'\*\*|__|^#+\s*|^\s*[-*•]\s+', '', txt, flags=re.M)
    if novo != txt: rep.append('markdown')
    novo2 = RE_EMOJI.sub('', novo)
    if novo2 != novo: rep.append('emoji')
    return re.sub(r'[ \t]+', ' ', novo2).strip(), rep

def vazou(palavra, texto):
    t = re.findall(r'[a-z]+', sem_acento(texto))
    for w in re.findall(r'[a-z]+', sem_acento(palavra)):
        if len(w) < 3 or w == 'de': continue
        raiz = w[:max(3, len(w) - 1)]
        if any(x == w or x.startswith(raiz) for x in t): return True
    return False

def curar(reg):
    s = reg['saida']
    if not s: return None, 'vazia', []
    s, rep = reparar(s)
    m = RE_TAGS.match(s)
    if not m or s.count('<pensamento>') != 1 or s.count('<resposta>') != 1: return None, 'tags_invalidas', rep
    pens, resp = m.group(1).strip(), m.group(2).strip()
    if RE_RECUSA.search(s): return None, 'recusa', rep
    if re.search(r'\b(the|and|with|drawing)\b', s, re.I): return None, 'ingles', rep
    if not 12 <= len(pens.split()) <= 90: return None, 'tamanho_pensamento', rep
    nr, t = len(resp.split()), reg['tarefa']
    if t == 'CHARADA':
        if not resp.startswith('Charada:') or not 6 <= nr <= 45: return None, 'charada_formato', rep
        if vazou(reg['meta']['palavra'], resp): return None, 'charada_vazou_palavra', rep
    elif t == 'VEREDITO':
        mv = re.match(r'VEREDITO:\s*(ACERTOU|QUASE|ERROU)\s*\n\s*NARRA[ÇC][ÃA]O:\s*(.+)$', resp, re.S)
        if not mv: return None, 'veredito_formato', rep
        if mv.group(1) != reg['meta']['regra']: return None, 'veredito_errado', rep
        if len(mv.group(2).split()) > 60: return None, 'tamanho_resposta', rep
    else:
        if not 10 <= nr <= 95: return None, 'tamanho_resposta', rep
        nums = set(re.findall(r'\d+(?:[.,]\d+)?', resp)) - NUMS_FICHA - set(re.findall(r'\d+(?:[.,]\d+)?', reg['entrada']))
        if nums - {'1', '2', '3', '4', '5', '8'}: return None, 'numero_alucinado', rep
    return f'<pensamento>{pens}</pensamento>\n<resposta>{resp}</resposta>', None, rep

def trigramas(s):
    w = re.findall(r'\w+', sem_acento(s)); return {tuple(w[i:i+3]) for i in range(len(w) - 2)}

brutos = [json.loads(l) for l in open(BRUTO, encoding='utf8')]
aprovados, rejeicoes, reparos = [], collections.Counter(), collections.Counter()
vistos = collections.defaultdict(list)
for reg in brutos:
    txt, motivo, rep = curar(reg)
    if motivo: rejeicoes[motivo] += 1; continue
    tg = trigramas(txt.split('<resposta>')[1])
    if any(len(tg & o) / max(1, len(tg | o)) > 0.7 for o in vistos[reg['tarefa']]):
        rejeicoes['duplicata'] += 1; continue
    vistos[reg['tarefa']].append(tg)
    for r in rep: reparos[r] += 1
    aprovados.append({**reg, 'saida': txt})

print(f'Brutos: {len(brutos)} → aprovados: {len(aprovados)} ({100*len(aprovados)/max(1,len(brutos)):.1f}%)')
print('Rejeições:', dict(rejeicoes)); print('Reparos:', dict(reparos))
print('Por tarefa:', collections.Counter(a['tarefa'] for a in aprovados))

# %% [markdown]
# ## 9. Exportação ShareGPT / ChatML com *split* estratificado (80% treino · 10% validação · 10% teste)
# O conjunto de **teste** não é usado no treino: serve para comparar o **Qwen3 base × Zé destilado** na Parte 3.

# %%
por_tarefa = collections.defaultdict(list)
for a in aprovados: por_tarefa[a['tarefa']].append(a)
splits = {'treino': [], 'val': [], 'teste': []}
for t, lst in por_tarefa.items():
    rng.shuffle(lst); n = len(lst); nv = max(3, round(0.1 * n))
    splits['teste'] += lst[:nv]; splits['val'] += lst[nv:2*nv]; splits['treino'] += lst[2*nv:]

def para_sharegpt(a):
    return {'conversations': [{'from': 'system', 'value': SYSTEM}, {'from': 'human', 'value': a['entrada']}, {'from': 'gpt', 'value': a['saida']}],
            'tarefa': a['tarefa'], 'meta': a['meta']}
def para_chatml(a):
    return {'messages': [{'role': 'system', 'content': SYSTEM}, {'role': 'user', 'content': a['entrada']}, {'role': 'assistant', 'content': a['saida']}],
            'tarefa': a['tarefa'], 'meta': a['meta']}

for nome, lst in splits.items():
    rng.shuffle(lst)
    with open(f'{OUT}/zedorabisco_{nome}.jsonl', 'w', encoding='utf8') as f:
        for a in lst: f.write(json.dumps(para_sharegpt(a), ensure_ascii=False) + '\n')
    with open(f'{OUT}/zedorabisco_{nome}_chatml.jsonl', 'w', encoding='utf8') as f:
        for a in lst: f.write(json.dumps(para_chatml(a), ensure_ascii=False) + '\n')
    print(f'{nome:7s}: {len(lst):4d} amostras ·', dict(collections.Counter(a["tarefa"] for a in lst)))

# charadas de reserva para o modo offline/contingência do jogo
reserva = collections.defaultdict(list)
for a in aprovados:
    if a['tarefa'] == 'CHARADA':
        reserva[a['meta']['palavra']].append(re.search(r'Charada:\s*(.+?)</resposta>', a['saida'], re.S).group(1).strip())
json.dump(reserva, open(f'{OUT}/charadas_reserva.json', 'w', encoding='utf8'), ensure_ascii=False, indent=1)
print('\nExemplo (treino):'); print(json.dumps(para_chatml(splits['treino'][0]), ensure_ascii=False, indent=1)[:1500])

# %% [markdown]
# ## 10. Estatísticas para o relatório e o banner

# %%
def palavras(a, tag): return len(re.search(f'<{tag}>(.+?)</{tag}>', a['saida'], re.S).group(1).split())
fig, ax = plt.subplots(1, 3, figsize=(15, 4))
cont = collections.Counter(a['tarefa'] for a in aprovados)
ax[0].bar(cont.keys(), cont.values(), color=['#d9822b', '#2b6cb0', '#2f855a']); ax[0].set_title('Amostras aprovadas por tarefa')
ax[1].barh(list(rejeicoes.keys()) or ['nenhuma'], list(rejeicoes.values()) or [0], color='#c53030'); ax[1].set_title('Motivos de rejeição')
for t, c in zip(['CHARADA', 'VEREDITO', 'PERGUNTA'], ['#d9822b', '#2b6cb0', '#2f855a']):
    ax[2].hist([palavras(a, 'pensamento') + palavras(a, 'resposta') for a in por_tarefa[t]], bins=15, alpha=.6, label=t, color=c)
ax[2].set_title('Palavras por amostra (pensamento + resposta)'); ax[2].legend()
plt.tight_layout(); plt.savefig(f'{OUT}/estatisticas_dataset.png', dpi=150); plt.show()

rel = {'teacher': TEACHER_MODEL if PROVEDOR == 'gemini' else GROQ_MODEL, 'uso_api': dict(USO), 'brutos': len(brutos),
       'aprovados': len(aprovados), 'taxa_aprovacao': round(len(aprovados) / max(1, len(brutos)), 3),
       'por_tarefa': dict(cont), 'rejeicoes': dict(rejeicoes), 'reparos': dict(reparos),
       'splits': {k: len(v) for k, v in splits.items()},
       'evolucao_perguntas': dict(collections.Counter(x['evolucao'] for x in perguntas)),
       'veredito_fonte': dict(collections.Counter(a['meta'].get('fonte') for a in por_tarefa['VEREDITO']))}
json.dump(rel, open(f'{OUT}/relatorio_dataset.json', 'w', encoding='utf8'), ensure_ascii=False, indent=1)
print(json.dumps(rel, ensure_ascii=False, indent=1))

# %%
zip_path = '/content/dataset_slm.zip' if os.path.isdir('/content') else 'dataset_slm.zip'
with zipfile.ZipFile(zip_path, 'w', zipfile.ZIP_DEFLATED) as z:
    for raiz, _, arqs in os.walk(OUT):
        for a in arqs: z.write(os.path.join(raiz, a), os.path.relpath(os.path.join(raiz, a), OUT))
print('Gerado:', zip_path)
try:
    from google.colab import files; files.download(zip_path)
except ImportError:
    pass
