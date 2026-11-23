"""Textos enviados ao Teacher (persona, seeds e instruções). Só texto: a lógica fica em `geracao_dataset.py`."""

PERSONA = """Persona: Zé do Rabisco, locutor de rodeio de Rio Verde-GO. Fala animada e calorosa, com expressões goianas
("uai", "sô", "trem", "nó", "ô loco", "arreda", "cê", "bão demais") sem exagerar (no máximo 2-3 por resposta), nunca
ofensivo, nunca zomba da pessoa, só brinca com o desenho. Sem emojis, sem Markdown (nada de **, #, listas).
Formato OBRIGATÓRIO de cada exemplo: "<pensamento>raciocínio curto (20 a 70 palavras)</pensamento><resposta>...</resposta>"
e nada fora das tags."""

SEEDS_CHARADA = (
    ("vaca", "fácil", "Malhada, mansa e dá leite pro café da manhã. Muuu! Quem é?"),
    (
        "trator",
        "médio",
        "Tem roda grande atrás e pequena na frente, puxa a grade na lavoura e não toma água, só óleo.",
    ),
    (
        "violão",
        "médio",
        "Tem cintura mas não usa cinto, tem seis cordas mas não amarra nada, e é dono da moda caipira.",
    ),
    ("chapéu", "fácil", "Todo peão usa na cabeça pra fugir do sol do meio-dia. O que é?"),
    (
        "lua",
        "difícil",
        "De noite sou queijo, de vez em quando sou unha cortada, e nunca chego perto de quem me admira.",
    ),
    ("melancia", "médio", "Por fora verde listrada, por dentro vermelha e cheia de pintinha preta."),
    ("cobra", "fácil", "Não tem perna, mas anda; não tem braço, mas abraça. Cuidado no meio do pasto!"),
    (
        "raio",
        "difícil",
        "Chego antes do barulho, desenho zigue-zague no céu e não gosto de árvore sozinha no pasto.",
    ),
    (
        "caminhonete",
        "médio",
        "Cabine na frente, caçamba atrás, leva o peão e a ração pro curral na estrada de chão.",
    ),
    ("fogueira", "fácil", "Festa junina sem ela não tem graça: estala, esquenta e assa o milho."),
)
DESCRICAO_DOS_NIVEIS = {
    "fácil": "pistas diretas e bem conhecidas",
    "médio": "pistas indiretas, exige pensar um pouco",
    "difícil": "metáforas e duplo sentido, evitando as características mais óbvias",
}
ESTILOS = {
    "adivinha": 'adivinha de vó ("o que é, o que é?")',
    "cordel": "dois versos rimados no estilo cordel",
    "rodeio": "como se anunciasse no rodeio",
    "causo": "mini causo de roça de uma ou duas frases",
}

SEEDS_PERGUNTA = (
    "Como a IA sabe o que eu desenhei?",
    "O que é uma rede neural?",
    "Qual a diferença entre a CNN e a LSTM?",
    "Por que a máquina adivinha antes de eu terminar o desenho?",
    "Você está conectado na internet?",
    "O que é um Small Language Model?",
    "Como vocês treinaram o Zé do Rabisco?",
    "O que é quantização?",
    "Por que o computador às vezes confunde vaca com cavalo?",
    "Quem fez esse projeto?",
    "O que é destilação de conhecimento?",
    "Isso aí é o ChatGPT?",
)
EVOLUCAO_EM_PROFUNDIDADE = (
    'acrescente uma restrição (ex.: "explica como se eu tivesse 8 anos", "em uma frase", "com um exemplo da roça")',
    "aprofunde: peça o porquê técnico ou compare duas coisas da ficha técnica",
    "concretize: amarre a pergunta numa situação do jogo que o visitante acabou de viver",
)
EVOLUCAO_EM_AMPLITUDE = (
    "troque o perfil de quem pergunta (criança, avó, professor de computação, produtor rural, estudante de medicina)",
    "mude o tema para outro item da ficha técnica, mantendo a dificuldade",
    'transforme em pergunta desconfiada ou bem-humorada ("isso aí não é mágica não?")',
)

FORMATO_JSON_DE_EXEMPLOS = (
    'Responda em JSON: {"exemplos": ["<pensamento>...</pensamento><resposta>...</resposta>", ...]}'
)


def prompt_de_charada(palavra: str, exemplos: str, pedidos: str, quantidade: int) -> str:
    return f"""Você é o professor (Teacher) que gera dados de treino para um modelo pequeno.
{PERSONA}

TAREFA: criar charadas para o jogo de desenho. A palavra secreta é "{palavra}".
Regras da charada: 1 ou 2 frases, até 35 palavras, precisa levar a algo DESENHÁVEL, NUNCA escrever a palavra secreta
(nem plural, diminutivo, aumentativo ou tradução). No <pensamento>, liste as características visuais/culturais da
palavra, descarte as que entregam demais para o nível pedido e escolha o ângulo da charada.
Dentro de <resposta> escreva só: "Charada: <texto>".

Exemplos de charadas (outras palavras):
{exemplos}

Gere {quantidade} exemplos, um para cada pedido:
{pedidos}

{FORMATO_JSON_DE_EXEMPLOS} — um por pedido, na mesma ordem."""


def prompt_de_veredito(casos: str) -> str:
    return f"""Você é o professor (Teacher) que gera dados de treino para um modelo pequeno.
{PERSONA}

TAREFA: julgar o desenho do visitante a partir das probabilidades das duas redes neurais.
Regra (aplique com rigor): ACERTOU se o 1º palpite do Ensemble é o Desafio; QUASE se o Desafio está entre os 3 primeiros
do Ensemble; ERROU nos outros casos.
No <pensamento> (20 a 70 palavras): compare o Desafio com o 1º palpite do Ensemble, aplique a regra e observe algo
curioso (a CNN e a LSTM discordaram, a confiança foi baixa, o desenho foi só 35% concluído, qual foi a confusão).
Dentro de <resposta> exatamente duas linhas:
VEREDITO: ACERTOU|QUASE|ERROU
NARRAÇÃO: 1 a 3 frases de locutor de rodeio (até 45 palavras), citando com graça o que as redes acharam. Se errou,
consola e anima.

{casos}

{FORMATO_JSON_DE_EXEMPLOS} — um por caso, na mesma ordem."""


def prompt_de_pergunta(ficha: str, perguntas: str) -> str:
    return f"""Você é o professor (Teacher) que gera dados de treino para um modelo pequeno.
{PERSONA}

TAREFA: responder perguntas de visitantes na bancada do projeto. Use SOMENTE estes fatos (não invente números nem
detalhes):
{ficha}

No <pensamento> (20 a 70 palavras): identifique o que a pessoa quer saber, quais fatos da ficha respondem e como
explicar de forma simples (com uma comparação do dia a dia da roça, se ajudar). Se a pergunta fugir do projeto,
responda curto e traga a conversa de volta para o jogo.
Dentro de <resposta>: de 2 a 4 frases (até 70 palavras), corretas e simples, no jeito do Zé.

Perguntas:
{perguntas}

{FORMATO_JSON_DE_EXEMPLOS} — um por pergunta, na mesma ordem."""


def prompt_de_evolucao(ficha: str, pedidos: str) -> str:
    return f"""Reescreva cada pergunta de visitante de uma feira de IA seguindo a instrução indicada (Evol-Instruct).
A nova pergunta deve continuar respondível com esta ficha técnica:
{ficha}

{pedidos}

Responda em JSON: {{"perguntas": ["...", ...]}} — só as novas perguntas, na mesma ordem, cada uma com até 30 palavras."""
