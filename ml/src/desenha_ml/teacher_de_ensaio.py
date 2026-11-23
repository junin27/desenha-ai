"""Teacher determinístico e offline, para ensaiar o pipeline do dataset sem gastar a cota da API.

Lê os itens do próprio prompt e responde no formato pedido. Alguns erros são de propósito (uma charada que
vaza a palavra, um veredito contra a regra), para o ensaio mostrar a curadoria rejeitando.
Não serve para treinar o Zé: as respostas são modelos fixos.

Exemplo:
    >>> TeacherDeEnsaio().gerar("sem pedidos", 0.5)
    {'exemplos': []}
"""

import re
from dataclasses import dataclass

from desenha_ml.geracao_dataset import veredito_esperado

_PALAVRA_SECRETA = re.compile(r'A palavra secreta é "([^"]+)"')
_PEDIDO_DE_CHARADA = re.compile(r"^\d+\. nível (\S+)", flags=re.MULTILINE)
_CASO = re.compile(r"Desafio: (.+)\n.*\n.*\n.*\nEnsemble: (.+)")
_PERGUNTA = re.compile(r"^\d+\. (.+)$", flags=re.MULTILINE)
_ORIGINAL = re.compile(r'Original: "(.+?)" →')
_PALPITE = re.compile(r"([^,]+?) (\d+)%")  # nomes podem ter espaço ("xícara de café"), mas nunca vírgula
ERRO_A_CADA = 7  # um em cada 7 itens sai errado de propósito

PENSAMENTO = (
    "Vou separar o que importa no pedido, lembrar das regras do jogo, escolher um jeito simples e "
    "caipira de falar e conferir se não estou entregando a resposta nem inventando nada."
)


@dataclass
class TeacherDeEnsaio:
    chamadas: int = 0

    def gerar(self, prompt: str, temperatura: float) -> object | None:
        self.chamadas += 1
        if "Original:" in prompt:
            return {
                "perguntas": [
                    f"{texto} Explica com um exemplo da roça?" for texto in _ORIGINAL.findall(prompt)
                ]
            }
        if "TAREFA: criar charadas" in prompt:
            return {"exemplos": self._charadas(prompt)}
        if "TAREFA: julgar o desenho" in prompt:
            return {"exemplos": self._vereditos(prompt)}
        if "TAREFA: responder perguntas" in prompt:
            return {"exemplos": self._respostas(prompt)}
        return {"exemplos": []}

    def _charadas(self, prompt: str) -> list[str]:
        encontrada = _PALAVRA_SECRETA.search(prompt)
        palavra = encontrada.group(1) if encontrada else "coisa"
        return [
            _fala(_charada(palavra, nivel, i)) for i, nivel in enumerate(_PEDIDO_DE_CHARADA.findall(prompt))
        ]

    def _vereditos(self, prompt: str) -> list[str]:
        falas = []
        for i, (alvo, linha_do_ensemble) in enumerate(_CASO.findall(prompt)):
            palpites = [(nome.strip(), int(p) / 100) for nome, p in _PALPITE.findall(linha_do_ensemble)]
            veredito = veredito_esperado(alvo, palpites) if i % ERRO_A_CADA else "ACERTOU"
            primeiro = palpites[0][0] if palpites else "nada"
            narracao = f"Uai! O desafio era {alvo} e o ensemble cravou {primeiro}."
            falas.append(_fala(f"VEREDITO: {veredito}\nNARRAÇÃO: {narracao}"))
        return falas

    def _respostas(self, prompt: str) -> list[str]:
        perguntas = _PERGUNTA.findall(prompt.rsplit("Perguntas:", 1)[-1])
        return [
            _fala(f"Uai, sô, sobre isso: {pergunta} A gente explica com calma aqui na bancada.")
            for pergunta in perguntas
        ]


def _fala(resposta: str) -> str:
    return f"<pensamento>{PENSAMENTO}</pensamento><resposta>{resposta}</resposta>"


def _charada(palavra: str, nivel: str, indice: int) -> str:
    """Uma em cada ERRO_A_CADA cita a palavra secreta de propósito (a curadoria deve rejeitar)."""
    pista = f"tem {palavra}" if indice % ERRO_A_CADA == 0 else "tem forma conhecida"
    return (
        f"Charada: Ô trem {nivel}: {pista}, aparece na roça de Goiás e cabe num desenho de vinte segundos. "
        f"Quem é número {indice} do {palavra[::-1]}?"
    )
