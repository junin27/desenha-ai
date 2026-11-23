"""Itens do checklist do evento: ✓, ✗ ou ⚠ com a ação para corrigir (spec checklist-do-evento).

Cada função recebe o que a casca mediu (disco, registro do Windows, resposta do servidor) e só decide.

Exemplo:
    >>> formatar_item(ItemDoChecklist("Voz", "ok", "Maria", ""))
    '✓ Voz: Maria'
"""

from collections.abc import Mapping, Sequence
from dataclasses import dataclass
from typing import Literal

from desenha_ml.conversa import ler_charada, ler_fala
from desenha_ml.demo.manifesto import Divergencia
from desenha_ml.demo.servidores import (
    GIB,
    RESERVA_DE_CONTEXTO_E_BUFFERS,
)
from desenha_ml.resultado import Erro

Situacao = Literal["ok", "falha", "aviso"]
OcupacaoDaPorta = Literal["livre", "da_demo", "outro"]
SIMBOLOS: Mapping[Situacao, str] = {"ok": "✓", "falha": "✗", "aviso": "⚠"}
CODIGO_DO_IDIOMA_PT_BR = 0x416
SEGUNDOS_MAXIMOS_DA_FALA = 25.0
MENSAGEM_PRONTO = "Pronto para o evento"
MENSAGEM_NAO_PRONTO = "Não pronto"
ACAO_REFAZER_A_PREPARACAO = "rode a preparação de novo"
ACAO_INSTALAR_A_VOZ = (
    'instale a voz "Microsoft Maria" em Configurações > Hora e idioma > Fala > Adicionar vozes '
    "(Português do Brasil); sem ela o jogo funciona, só que mudo"
)


@dataclass(frozen=True)
class ItemDoChecklist:
    titulo: str
    situacao: Situacao
    detalhe: str
    acao: str


@dataclass(frozen=True)
class VozInstalada:
    nome: str
    idioma: str  # atributo "Language" do registro, ex.: "416;9" (hexadecimal)


@dataclass(frozen=True)
class ResultadoFinal:
    mensagem: str
    codigo_de_saida: int


def item_de_arquivos(divergencias: Sequence[Divergencia]) -> ItemDoChecklist:
    if not divergencias:
        return ItemDoChecklist("Arquivos da demo", "ok", "tamanho e SHA-256 conferem", "")
    detalhe = "; ".join(f"{divergencia.caminho} ({divergencia.motivo})" for divergencia in divergencias)
    return ItemDoChecklist("Arquivos da demo", "falha", detalhe, ACAO_REFAZER_A_PREPARACAO)


def item_de_portas(ocupacao: Mapping[int, OcupacaoDaPorta]) -> ItemDoChecklist:
    ocupadas = [porta for porta, estado in ocupacao.items() if estado == "outro"]
    if not ocupadas:
        return ItemDoChecklist("Portas", "ok", "8080 e 8081 livres ou da própria demo", "")
    detalhe = f"porta(s) {', '.join(str(porta) for porta in ocupadas)} ocupada(s) por outro programa"
    return ItemDoChecklist(
        "Portas", "falha", detalhe, "feche o programa que usa a porta ou reinicie o notebook"
    )


def item_de_memoria(memoria_livre: int, tamanho_do_gguf_do_ze: int) -> ItemDoChecklist:
    necessaria = tamanho_do_gguf_do_ze + RESERVA_DE_CONTEXTO_E_BUFFERS
    detalhe = f"{memoria_livre / GIB:.1f} GiB livres; o Zé destilado precisa de {necessaria / GIB:.1f} GiB"
    if memoria_livre >= necessaria:
        return ItemDoChecklist("Memória", "ok", detalhe, "")
    return ItemDoChecklist(
        "Memória", "falha", detalhe, "fechar navegador e outros programas e conferir de novo"
    )


def item_de_voz(vozes: Sequence[VozInstalada]) -> ItemDoChecklist:
    em_portugues = [voz for voz in vozes if _e_pt_br(voz.idioma)]
    if em_portugues:
        return ItemDoChecklist("Voz pt-BR", "ok", em_portugues[0].nome, "")
    return ItemDoChecklist(
        "Voz pt-BR", "aviso", "nenhuma voz local em português do Brasil", ACAO_INSTALAR_A_VOZ
    )


def _e_pt_br(idioma: str) -> bool:
    primeiro = idioma.split(";", maxsplit=1)[0].strip()
    try:
        return int(primeiro, 16) == CODIGO_DO_IDIOMA_PT_BR
    except ValueError:
        return False


def item_dos_modelos(*, modo_ensaio: bool, base_sobe: bool) -> ItemDoChecklist:
    if modo_ensaio:
        detalhe = "modo ensaio: o Zé destilado ainda não existe, o Qwen3 base ocupa a vaga dele"
        return ItemDoChecklist(
            "Zé destilado × base", "aviso", detalhe, "rode o notebook 3 e a preparação com o GGUF"
        )
    if not base_sobe:
        detalhe = "Qwen3 base não cabe na memória livre; a comparação vai usar a reserva"
        return ItemDoChecklist(
            "Zé destilado × base", "aviso", detalhe, "feche outros programas para liberar memória"
        )
    return ItemDoChecklist("Zé destilado × base", "ok", "os dois modelos sobem juntos", "")


def item_do_ze(resposta: str | None, segundos: float, tokens: int) -> ItemDoChecklist:
    """`None` = o servidor não respondeu. A charada passa pela mesma leitura que o jogo usa."""
    titulo = "Fala real do Zé"
    if resposta is None:
        return ItemDoChecklist(
            titulo, "falha", "sem resposta do servidor", "suba a demo e confira o registro"
        )
    problema = _problema_da_charada(resposta)
    if problema is not None:
        detalhe = f"{problema}; recebido {resposta[:80]!r}"
        return ItemDoChecklist(titulo, "falha", detalhe, "confira se o GGUF certo está na porta 8080")
    if segundos > SEGUNDOS_MAXIMOS_DA_FALA:
        detalhe = f"charada em {segundos:.1f} s; o limite é {SEGUNDOS_MAXIMOS_DA_FALA:.0f} s"
        return ItemDoChecklist(titulo, "falha", detalhe, "feche outros programas; a CPU está lenta demais")
    velocidade = f"{tokens / segundos:.1f}".replace(".", ",") if segundos > 0 else "?"
    return ItemDoChecklist(titulo, "ok", f"charada em {segundos:.1f} s, {velocidade} tokens/s", "")


def _problema_da_charada(resposta: str) -> str | None:
    fala = ler_fala(resposta)
    if isinstance(fala, Erro):
        return fala.detalhe
    charada = ler_charada(fala.valor.resposta)
    return charada.detalhe if isinstance(charada, Erro) else None


def resultado_final(itens: Sequence[ItemDoChecklist]) -> ResultadoFinal:
    falhas = [item.titulo for item in itens if item.situacao == "falha"]
    if falhas:
        return ResultadoFinal(f"{MENSAGEM_NAO_PRONTO}: {', '.join(falhas)}", 1)
    avisos = [item.titulo for item in itens if item.situacao == "aviso"]
    sufixo = f" (avisos: {', '.join(avisos)})" if avisos else ""
    return ResultadoFinal(f"{MENSAGEM_PRONTO}{sufixo}", 0)


def formatar_item(item: ItemDoChecklist) -> str:
    linha = f"{SIMBOLOS[item.situacao]} {item.titulo}: {item.detalhe}"
    return linha if not item.acao else f"{linha}\n    → {item.acao}"
