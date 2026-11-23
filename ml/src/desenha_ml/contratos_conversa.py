"""Gera `contratos/conversa.json`: entradas e leituras da fala do Zé para o TypeScript reproduzir.

A leitura progressiva é conferida em TODOS os prefixos de falas completas: cada ponto em que o streaming
pode parar, inclusive no meio de uma tag.

Exemplo:
    >>> sorted(gerar_contrato_da_conversa())[:3]
    ['entrada_charada', 'entrada_pergunta', 'entrada_veredito']
"""

from dataclasses import asdict

from desenha_ml.categorias import CATEGORIAS
from desenha_ml.contratos_regras import Json
from desenha_ml.conversa import (
    INSTRUCAO_DE_SISTEMA,
    NIVEIS,
    entrada_charada,
    entrada_pergunta,
    entrada_veredito,
    ler_charada,
    ler_fala,
    ler_parcial,
    ler_veredito,
    porcentagem,
)
from desenha_ml.resultado import Erro, Resultado

FALAS_COMPLETAS = (
    "<pensamento>Vaca: malhada, muge, dá leite. Evito a palavra.</pensamento>\n"
    "<resposta>Charada: Malhada e mansa, faz muuu. Quem é?</resposta>",
    "<pensamento> 1º do ensemble é cavalo, vaca em 2º: QUASE. </pensamento>"
    "<resposta>VEREDITO: QUASE\nNARRAÇÃO: Ô trem, quase! A LSTM jurou que era cavalo.</resposta>",
)


def gerar_contrato_da_conversa() -> dict[str, Json]:
    return {
        "versao": 1,
        "instrucao_de_sistema": INSTRUCAO_DE_SISTEMA,
        "porcentagem": [
            {"p": p, "valor": porcentagem(p)} for p in (0.0, 0.004, 0.005, 0.345, 0.625, 0.995, 1.0)
        ],
        "entrada_charada": _casos_de_charada(),
        "entrada_veredito": _casos_de_veredito(),
        "entrada_pergunta": [
            {"pergunta": p, "resultado": _json(entrada_pergunta(p))}
            for p in ("  Como a IA   sabe? ", "", "   ", "a" * 200, "a" * 201, "Ana\t\u00a0quer saber")
        ],
        "ler_fala": [{"texto": t, "resultado": _fala_json(t)} for t in _FALAS_PARA_LER],
        "ler_charada": [{"resposta": r, "resultado": _json(ler_charada(r))} for r in _CHARADAS_PARA_LER],
        "ler_veredito": [{"resposta": r, "resultado": _veredito_json(r)} for r in _VEREDITOS_PARA_LER],
        "ler_parcial": [{"texto": t, **asdict(ler_parcial(t))} for t in _prefixos_das_falas()],
    }


def _json(resultado: Resultado[str]) -> Json:
    if isinstance(resultado, Erro):
        return {"ok": False, "codigo": resultado.codigo}
    return {"ok": True, "valor": resultado.valor}


def _casos_de_charada() -> list[Json]:
    casos: list[Json] = [
        {"palavra": c.pt, "nivel": NIVEIS[i % 3], "resultado": _json(entrada_charada(c.pt, NIVEIS[i % 3]))}
        for i, c in enumerate(CATEGORIAS)
    ]
    casos.append({"palavra": "vaca", "nivel": "facil", "resultado": _json(entrada_charada("vaca", "facil"))})
    return casos


def _casos_de_veredito() -> list[Json]:
    top = [("vaca", 0.625), ("cavalo", 0.2), ("porco", 0.1), ("gato", 0.05), ("cachorro", 0.025)]
    outro = [("xícara de café", 0.4449), ("óculos", 0.3), ("lua", 0.2551), ("sol", 0.0), ("raio", 0.0)]
    casos = [
        ("vaca", 0.345, top, top, top),
        ("lua", 1.0, outro, top, outro),
        ("óculos", 0.5, top, outro, outro),
    ]
    return [
        {
            "alvo": a,
            "fracao": f,
            "cnn": _palpites_json(c),
            "lstm": _palpites_json(lstm),
            "ensemble": _palpites_json(e),
            "texto": entrada_veredito(a, f, c, lstm, e),
        }
        for a, f, c, lstm, e in casos
    ]


def _palpites_json(palpites: list[tuple[str, float]]) -> list[Json]:
    convertidos: list[Json] = []
    for nome, probabilidade in palpites:
        convertidos.append([nome, probabilidade])
    return convertidos


_FALAS_PARA_LER = (
    *FALAS_COMPLETAS,
    "<pensamento> pensei </pensamento>\n<resposta>Charada: Muuu?</resposta>",
    "Olá! <pensamento>x</pensamento><resposta>y</resposta>",
    "<pensamento>x</pensamento><resposta>y</resposta> tchau",
    "<resposta>y</resposta><pensamento>x</pensamento>",
    "<pensamento>x</pensamento><resposta>y",
    "<pensamento>x</pensamento><pensamento>z</pensamento><resposta>y</resposta>",
    "\n\t<pensamento>a\nb</pensamento>\r\n<resposta>c</resposta>\n",
)
_CHARADAS_PARA_LER = ("Charada: Muuu, quem sou?", "Muuu, quem sou eu?", "Charada:   ", "  Charada:Malhada  ")
_VEREDITOS_PARA_LER = (
    "VEREDITO: QUASE\nNARRAÇÃO: Ô trem, quase!",
    "VEREDITO: ACERTOU\r\nNARRAÇÃO: Bão demais!",
    "VEREDITO: TALVEZ\nNARRAÇÃO: x",
    "VEREDITO: ACERTOU",
    "NARRAÇÃO: x\nVEREDITO: ACERTOU",
    "VEREDITO: ERROU\nNARRAÇÃO:   ",
)


def _fala_json(texto: str) -> Json:
    resultado = ler_fala(texto)
    if isinstance(resultado, Erro):
        return {"ok": False, "codigo": resultado.codigo}
    return {
        "ok": True,
        "valor": {"pensamento": resultado.valor.pensamento, "resposta": resultado.valor.resposta},
    }


def _veredito_json(resposta: str) -> Json:
    resultado = ler_veredito(resposta)
    if isinstance(resultado, Erro):
        return {"ok": False, "codigo": resultado.codigo}
    return {"ok": True, "valor": list(resultado.valor)}


def _prefixos_das_falas() -> list[str]:
    return [fala[:n] for fala in FALAS_COMPLETAS for n in range(len(fala) + 1)]
