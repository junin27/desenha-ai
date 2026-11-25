"""Monta o pôster do 5º Workshop de IA a partir do template oficial (`Banner Workshop IA.pptx`, 90 x 120 cm).

Só biblioteca padrão: abre o .pptx (um zip), troca os textos pelos de `TEXTOS` (mantendo fonte, tamanho e
justificação do template), substitui as duas imagens do template pelas figuras de `docs/banner/figuras/` e
acrescenta a captura do jogo. O template original não é alterado. As figuras vêm de
`scripts/figuras_do_banner.py`; os números do texto são os de `docs/banner.md`.

Uso (a partir de `projeto_final/`):
    python scripts/montar_banner.py --template "docs/banner/Banner Workshop IA.pptx" --email seu@academico.unirv.edu.br
"""

import argparse
import re
import struct
import zipfile
from pathlib import Path
from xml.sax.saxutils import escape

SAIDA_PADRAO = Path("docs/banner/Banner Desenha Ai.pptx")
FIGURAS = Path("docs/banner/figuras")
CAPTURA_DO_JOGO = FIGURAS / "captura-do-jogo.png"
EMU_POR_CM = 360000
AZUL_UNIRV = "004AAD"
# A Figura 1 (captura do jogo) tem a largura da coluna, como as outras duas figuras. Para ela caber, a
# Metodologia (título cinza e texto) desce e o diagrama do rodapé fica mais baixo e mais achatado.
Y_DA_CAPTURA_CM = 55.8
ALTURA_DA_LEGENDA_CM = 2.0
DESCIDA_DA_METODOLOGIA_CM = 12.7
Y_DO_DIAGRAMA_CM = 108.3
ALTURA_DO_DIAGRAMA_CM = 9.0
FORMAS_DA_METODOLOGIA = ("Group 29", "TextBox 46", "TextBox 47")

TITULO = "Desenha Aí, Sô!: duas redes neurais e um SLM caipira que adivinham e julgam o seu rabisco"
AUTOR = "Gilberto Aparecido Dias Junior"
EMAIL_PADRAO = "[e-mail acadêmico]"

# **negrito** vira "Open Sans Bold". Cada item da lista é um parágrafo.
TEXTOS = {
    "TextBox 45": [  # Introdução
        (
            "Como reconhecer um desenho enquanto ele ainda está sendo feito? O **Desenha Aí, Sô!** é um jogo para feira: o "
            "visitante recebe uma charada, desenha a resposta em 20 segundos e duas redes neurais tentam adivinhar a cada "
            "traço. Um Small Language Model, o **Zé do Rabisco**, cria a charada, julga o resultado e narra como um locutor "
            "de rodeio."
        ),
        (
            "Duas perguntas guiam o trabalho: imagem ou sequência, quem entende melhor um rabisco e quem adivinha mais cedo? "
            "E um modelo de linguagem pequeno, destilado de um grande, roda sem internet e sem GPU num notebook comum? "
            "Tudo roda offline."
        ),
    ],
    "TextBox 46": [  # Metodologia
        (
            "**Redes neurais.** Google Quick, Draw! (30 categorias, 9 mil desenhos por categoria). Uma CNN residual "
            "(680 mil parâmetros) vê a imagem 28×28; uma LSTM bidirecional (666 mil) lê a sequência de traços; o "
            "ensemble é a média das duas (w = 0,5). Metade dos exemplos usa desenhos incompletos, para adivinhar cedo."
        ),
        (
            "**Zé do Rabisco.** Qwen3-1,7B ajustado com QLoRA (r = 16; 1,01% dos parâmetros) em 455 amostras destiladas "
            "do Gemini e aprovadas por curadoria verificável por código. Roda como GGUF Q8_0 no llama.cpp. No modo "
            "Mão, o MediaPipe (modelo pronto) acha 21 pontos da mão."
        ),
    ],
    "TextBox 48": [  # Resultados e conclusões
        (
            "**Redes** (30 mil desenhos de teste): o ensemble acerta **94,7%** (top-3: 99,3%), contra 92,4% da CNN e 92,8% da "
            "LSTM; com metade do desenho feito, já acerta 78,6%. **Zé** (46 exemplos de teste): do Qwen3 base para o "
            "destilado, o formato foi de 78,3% a 100%, e charada e veredito, de 0% a 100%. No GGUF Q8_0 do estande, a charada "
            "ficou em 81,2% (3 de 16 entregavam a palavra; o jogo usa uma reserva)."
        ),
        (
            "**Conclusões.** Imagem e sequência se complementam. Quantizar tem custo: em 4 bits o Zé perdeu o formato (65% na "
            "validação); em 8 bits (1,83 GB) ele se manteve. O teste do Zé é pequeno e foi consultado mais de uma vez: os "
            "100% mostram que ele aprendeu o jogo, não uma qualidade geral."
        ),
    ],
    "TextBox 51": [  # Referências (ABNT)
        "GOOGLE CREATIVE LAB. The Quick, Draw! Dataset. 2017. Disponível em: github.com/googlecreativelab/quickdraw-dataset.",
        "DETTMERS, T. et al. QLoRA: efficient finetuning of quantized LLMs. 2023. Disponível em: arxiv.org/abs/2305.14314.",
        "HINTON, G.; VINYALS, O.; DEAN, J. Distilling the knowledge in a neural network. 2015. Disponível em: arxiv.org/abs/1503.02531.",
        "YANG, A. et al. Qwen3 technical report. 2025. Disponível em: arxiv.org/abs/2505.09388.",
        "ZHANG, F. et al. MediaPipe Hands: on-device real-time hand tracking. 2020. Disponível em: arxiv.org/abs/2006.10214.",
    ],
}
LEGENDA_DA_CAPTURA = "**Figura 1.** Tela do jogo no modo Mão."


def bloco_da_forma(xml: str, nome: str) -> tuple[int, int]:
    """Posição inicial e final do `<p:sp>` com esse nome no XML do slide."""
    marca = xml.index(f'name="{nome}"')
    inicio = xml.rfind("<p:sp>", 0, marca)
    return inicio, xml.index("</p:sp>", marca) + len("</p:sp>")


def modelos_do_paragrafo(forma: str) -> tuple[str, str]:
    propriedades = re.search(r"<a:pPr.*?</a:pPr>", forma, re.DOTALL)
    corrida = re.search(r"<a:rPr.*?</a:rPr>", forma, re.DOTALL)
    if propriedades is None or corrida is None:
        raise SystemExit(
            "o template não tem a formatação de parágrafo esperada; confira o arquivo"
        )
    return propriedades.group(0), corrida.group(0)


def corridas(texto: str, formato_normal: str) -> str:
    """Divide em trechos normais e **negrito**, cada um com a formatação do template."""
    formato_negrito = formato_normal.replace(
        'lang="en-US"', 'lang="pt-BR" b="true"'
    ).replace('typeface="Open Sans"', 'typeface="Open Sans Bold"')
    normal = formato_normal.replace('lang="en-US"', 'lang="pt-BR"')
    partes = []
    for indice, trecho in enumerate(texto.split("**")):
        if trecho:
            formato = formato_negrito if indice % 2 else normal
            partes.append(f"<a:r>{formato}<a:t>{escape(trecho)}</a:t></a:r>")
    return "".join(partes)


def trocar_paragrafos(xml: str, nome: str, textos: list[str]) -> str:
    inicio, fim = bloco_da_forma(xml, nome)
    forma = xml[inicio:fim]
    propriedades, corrida = modelos_do_paragrafo(forma)
    paragrafos = "".join(
        f"<a:p>{propriedades}{corridas(t, corrida)}</a:p>" for t in textos
    )
    ponto = forma.index("<a:lstStyle/>") + len("<a:lstStyle/>")
    nova = forma[:ponto] + paragrafos + "</p:txBody></p:sp>"
    return xml[:inicio] + nova + xml[fim:]


def trocar_texto_simples(xml: str, nome: str, texto: str) -> str:
    inicio, fim = bloco_da_forma(xml, nome)
    forma = re.sub(
        r"<a:t>.*?</a:t>",
        f"<a:t>{escape(texto)}</a:t>",
        xml[inicio:fim],
        count=1,
        flags=re.DOTALL,
    )
    return xml[:inicio] + forma + xml[fim:]


def posicao_da_forma(xml: str, nome: str) -> tuple[int, int, int, int]:
    inicio, fim = bloco_da_forma(xml, nome)
    achou = re.search(
        r'<a:off x="(\d+)" y="(\d+)"/><a:ext cx="(\d+)" cy="(\d+)"/>', xml[inicio:fim]
    )
    if achou is None:
        raise SystemExit(f"forma {nome} sem posição no template")
    return tuple(int(v) for v in achou.groups())  # type: ignore[return-value]


def descer_forma(xml: str, nome: str, centimetros: float) -> str:
    """Desce uma forma (ou grupo) do slide; a primeira posição depois do nome é a da própria forma."""
    inicio = xml.index(f'name="{nome}"')
    achou = re.compile(r'<a:off x="(\d+)" y="(\d+)"/>').search(xml, inicio)
    if achou is None:
        raise SystemExit(f"forma {nome} sem posição no template")
    y = int(achou.group(2)) + round(centimetros * EMU_POR_CM)
    return (
        xml[: achou.start()]
        + f'<a:off x="{achou.group(1)}" y="{y}"/>'
        + xml[achou.end() :]
    )


def tamanho_do_png(dados: bytes) -> tuple[int, int]:
    """Largura e altura lidas do cabeçalho do PNG (sem precisar do Pillow)."""
    largura, altura = struct.unpack(">II", dados[16:24])
    return int(largura), int(altura)


def reposicionar_forma(xml: str, nome: str, y_cm: float, altura_cm: float) -> str:
    """Muda o `y` e a altura de uma forma; a imagem de fundo estica junto."""
    inicio = xml.index(f'name="{nome}"')
    achou = re.compile(
        r'<a:off x="(\d+)" y="\d+"/><a:ext cx="(\d+)" cy="\d+"/>'
    ).search(xml, inicio)
    if achou is None:
        raise SystemExit(f"forma {nome} sem posição no template")
    novo = (
        f'<a:off x="{achou.group(1)}" y="{round(y_cm * EMU_POR_CM)}"/>'
        f'<a:ext cx="{achou.group(2)}" cy="{round(altura_cm * EMU_POR_CM)}"/>'
    )
    return xml[: achou.start()] + novo + xml[achou.end() :]


def figura_do_jogo(xml: str, imagem_png: bytes) -> str:
    """Figura 1: a captura do jogo na largura da coluna, com a legenda de uma linha embaixo."""
    x, _, largura, _ = posicao_da_forma(xml, "TextBox 45")
    y = round(Y_DA_CAPTURA_CM * EMU_POR_CM)
    largura_png, altura_png = tamanho_do_png(imagem_png)
    altura = round(largura * altura_png / largura_png)
    imagem = (
        '<p:pic><p:nvPicPr><p:cNvPr id="100" name="Captura do jogo" descr="Tela de desenho do jogo no modo Mão"/>'
        '<p:cNvPicPr><a:picLocks noChangeAspect="1"/></p:cNvPicPr><p:nvPr/></p:nvPicPr>'
        '<p:blipFill><a:blip r:embed="rId5"/><a:stretch><a:fillRect/></a:stretch></p:blipFill>'
        f'<p:spPr><a:xfrm><a:off x="{x}" y="{y}"/><a:ext cx="{largura}" cy="{altura}"/></a:xfrm>'
        '<a:prstGeom prst="rect"><a:avLst/></a:prstGeom><a:ln w="38100"><a:solidFill>'
        f'<a:srgbClr val="{AZUL_UNIRV}"/></a:solidFill></a:ln></p:spPr></p:pic>'
    )
    inicio, fim = bloco_da_forma(xml, "TextBox 45")
    propriedades, corrida = modelos_do_paragrafo(xml[inicio:fim])
    centralizado = propriedades.replace('algn="just"', 'algn="ctr"')
    y_da_legenda = y + altura + round(0.25 * EMU_POR_CM)
    legenda = (
        '<p:sp><p:nvSpPr><p:cNvPr name="Legenda da captura" id="101"/><p:cNvSpPr txBox="true"/><p:nvPr/></p:nvSpPr>'
        f'<p:spPr><a:xfrm rot="0"><a:off x="{x}" y="{y_da_legenda}"/>'
        f'<a:ext cx="{largura}" cy="{round(ALTURA_DA_LEGENDA_CM * EMU_POR_CM)}"/></a:xfrm>'
        '<a:prstGeom prst="rect"><a:avLst/></a:prstGeom></p:spPr>'
        '<p:txBody><a:bodyPr anchor="t" rtlCol="false" tIns="0" lIns="0" bIns="0" rIns="0"><a:spAutoFit/></a:bodyPr>'
        f"<a:lstStyle/><a:p>{centralizado}{corridas(LEGENDA_DA_CAPTURA, corrida)}</a:p></p:txBody></p:sp>"
    )
    return imagem + legenda


def montar(template: Path, saida: Path, email: str) -> None:
    with zipfile.ZipFile(template) as origem:
        arquivos = {nome: origem.read(nome) for nome in origem.namelist()}
    xml = arquivos["ppt/slides/slide1.xml"].decode("utf8")
    xml = trocar_texto_simples(xml, "TextBox 41", TITULO)
    xml = trocar_texto_simples(xml, "TextBox 42", AUTOR)
    xml = trocar_texto_simples(xml, "TextBox 43", f" {email}")
    for nome, textos in TEXTOS.items():
        xml = trocar_paragrafos(xml, nome, textos)
    for forma in FORMAS_DA_METODOLOGIA:
        xml = descer_forma(xml, forma, DESCIDA_DA_METODOLOGIA_CM)
    xml = reposicionar_forma(
        xml, "Freeform 38", Y_DO_DIAGRAMA_CM, ALTURA_DO_DIAGRAMA_CM
    )
    captura = CAPTURA_DO_JOGO.read_bytes()
    xml = xml.replace("</p:spTree>", figura_do_jogo(xml, captura) + "</p:spTree>")
    relacoes = arquivos["ppt/slides/_rels/slide1.xml.rels"].decode("utf8")
    relacoes = relacoes.replace(
        "</Relationships>",
        '<Relationship Id="rId5" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/image" '
        'Target="../media/image4.png"/></Relationships>',
    )
    arquivos["ppt/slides/slide1.xml"] = xml.encode("utf8")
    arquivos["ppt/slides/_rels/slide1.xml.rels"] = relacoes.encode("utf8")
    arquivos["ppt/media/image1.png"] = (
        FIGURAS / "arquitetura.png"
    ).read_bytes()  # forma "Freeform 38"
    arquivos["ppt/media/image2.png"] = (
        FIGURAS / "resultados.png"
    ).read_bytes()  # forma "Freeform 39"
    arquivos["ppt/media/image4.png"] = captura
    saida.parent.mkdir(parents=True, exist_ok=True)
    with zipfile.ZipFile(saida, "w", zipfile.ZIP_DEFLATED) as destino:
        for nome, conteudo in arquivos.items():
            destino.writestr(nome, conteudo)
    print(f"{saida}: {saida.stat().st_size / 1e6:.1f} MB")


def main() -> None:
    parser = argparse.ArgumentParser(description=(__doc__ or "").splitlines()[0])
    parser.add_argument(
        "--template", type=Path, default=Path("docs/banner/Banner Workshop IA.pptx")
    )
    parser.add_argument("--saida", type=Path, default=SAIDA_PADRAO)
    parser.add_argument(
        "--email", default=EMAIL_PADRAO, help="e-mail acadêmico que vai abaixo do nome"
    )
    argumentos = parser.parse_args()
    montar(argumentos.template, argumentos.saida, argumentos.email)


if __name__ == "__main__":
    main()
