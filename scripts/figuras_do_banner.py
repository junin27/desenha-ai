"""Figuras do banner (pôster 90 x 120 cm do 5º Workshop de IA), com letras e linhas grossas para ler impresso.

Lê os números dos JSONs de métricas (nada digitado à mão) e desenha com `PIL`: as coordenadas são em
"pixels lógicos" (100 por cm), o desenho sai com resolução 1,5 vez maior (150 px/cm, cerca de 380 dpi) e com
superamostragem, para as linhas ficarem suaves na impressão. Gera, em `docs/banner/figuras/`:
- `arquitetura.png`  (41,6 x 9,0 cm): do desenho do visitante à narração do Zé;
- `resultados.png`   (40,7 x 30,0 cm): quem adivinha mais cedo (redes) e Qwen3 base x Zé destilado (SLM).
As proporções são as das duas formas de imagem do template `Banner Workshop IA.pptx`.

A Figura 1 (`captura-do-jogo.png`, tela do jogo em resolução tripla) vem do navegador, não daqui:
    CATEGORIA=casa ESCALA=3 CLIPE=0,45,1366,712 SOMENTE=4c-desenho-mao ARQUIVO=captura-do-jogo.png \\
    ESCONDER=".barra-do-estande,.video-da-camera,.fundo-de-rabiscos" \\
    node scripts/capturar_telas.mjs docs/banner/figuras 1366 768     (com o build em localhost:4173)

Uso (a partir de `projeto_final/`): python scripts/figuras_do_banner.py
"""

import json
from html import escape
from pathlib import Path

PASTA_DE_SAIDA = Path("docs/banner/figuras")
METRICAS_DAS_REDES = Path("notebooks/resultados/modelos_redes/metricas_redes.json")
METRICAS_DO_SLM = Path("notebooks/resultados/rodada5/metricas_slm.json")

PIXELS_POR_CM = 100
# Para ler impresso a 1,5–2 m: linhas, contornos e pontos 1,5x mais grossos e letras 5% maiores (mais que isso, o texto encosta nas bordas das caixas) que no
# desenho original (as coordenadas e o layout continuam os mesmos).
FATOR_DE_ESPESSURA = 1.5
FATOR_DE_TEXTO = 1.05
AZUL_UNIRV = "#004AAD"
AZUL_CLARO = "#E8F0FB"
TINTA = "#111827"
GRADE = "#B4BCC8"
LARANJA = "#D9822B"
AZUL = "#1F6FBF"
VERDE = "#2E8456"
CINZA_AZULADO = "#A3AEBD"
FAMILIA = "'Segoe UI', Arial, sans-serif"
PESOS = {"normal": 400, "negrito": 700}
# Âncoras no estilo do PIL (horizontal l/m/r + vertical a/m/s) traduzidas para SVG.
ANCORA_HORIZONTAL = {"l": "start", "m": "middle", "r": "end"}
# Distância da linha de base em relação ao ponto pedido, em frações do tamanho da letra (Segoe UI):
# "a" = topo das letras, "m" = meio, "s" = a própria linha de base.
DESLOCAMENTO_DA_BASE = {"a": 0.78, "m": 0.36, "s": 0.0}
# Tamanho dos textos: 100 px lógicos por cm; o tamanho em "pt lógico" do desenho original vira px do SVG.
PX_POR_PONTO = 1.0


def virgula(valor: float, casas: int = 1) -> str:
    return f"{valor:.{casas}f}".replace(".", ",")


def numero(valor: float) -> str:
    return f"{valor:.1f}".rstrip("0").rstrip(".")


class Quadro:
    """Figura vetorial (SVG) em pixels lógicos (100 por cm): nítida em qualquer tamanho de impressão."""

    def __init__(self, largura_cm: float, altura_cm: float) -> None:
        self.largura_cm, self.altura_cm = largura_cm, altura_cm
        self.largura = round(largura_cm * PIXELS_POR_CM)
        self.altura = round(altura_cm * PIXELS_POR_CM)
        self.elementos: list[str] = [
            f'<rect width="{self.largura}" height="{self.altura}" fill="white"/>'
        ]

    def texto(
        self,
        x: float,
        y: float,
        texto: str,
        estilo: str,
        tamanho: int,
        cor: str = TINTA,
        ancora: str = "la",
        contorno: int = 0,
    ) -> None:
        """`contorno` > 0 desenha um halo branco por baixo, para o rótulo não ser riscado pela grade.

        O PowerPoint ignora `dominant-baseline` e `paint-order` no SVG: a altura é ajustada aqui (a linha de
        base fica abaixo do ponto pedido) e o halo é uma cópia branca desenhada antes do texto.
        """
        corpo = tamanho * FATOR_DE_TEXTO * PX_POR_PONTO
        base = y + corpo * DESLOCAMENTO_DA_BASE[ancora[1]]
        atributos = (
            f'x="{numero(x)}" y="{numero(base)}" font-family="{FAMILIA}" font-weight="{PESOS[estilo]}"'
            f' font-size="{numero(corpo)}" text-anchor="{ANCORA_HORIZONTAL[ancora[0]]}"'
        )
        if contorno:
            largura = numero(contorno * 2 * FATOR_DE_ESPESSURA)
            self.elementos.append(
                f'<text {atributos} fill="white" stroke="white" stroke-width="{largura}"'
                f' stroke-linejoin="round">{escape(texto)}</text>'
            )
        self.elementos.append(f'<text {atributos} fill="{cor}">{escape(texto)}</text>')

    def retangulo(
        self,
        caixa: tuple[float, float, float, float],
        preenchimento: str,
        borda: str | None = None,
        raio: int = 0,
        espessura: int = 4,
    ) -> None:
        esquerda, topo, direita, base = caixa
        traco = (
            f' stroke="{borda}" stroke-width="{numero(espessura * FATOR_DE_ESPESSURA)}"'
            if borda
            else ""
        )
        self.elementos.append(
            f'<rect x="{numero(esquerda)}" y="{numero(topo)}" width="{numero(direita - esquerda)}"'
            f' height="{numero(base - topo)}" rx="{raio}" fill="{preenchimento}"{traco}/>'
        )

    def linha(
        self, pontos: list[tuple[float, float]], cor: str, espessura: int
    ) -> None:
        caminho = " ".join(f"{numero(x)},{numero(y)}" for x, y in pontos)
        self.elementos.append(
            f'<polyline points="{caminho}" fill="none" stroke="{cor}"'
            f' stroke-width="{numero(espessura * FATOR_DE_ESPESSURA)}" stroke-linecap="round" stroke-linejoin="round"/>'
        )

    def circulo(self, x: float, y: float, raio: int, cor: str) -> None:
        self.elementos.append(
            f'<circle cx="{numero(x)}" cy="{numero(y)}" r="{numero(raio * FATOR_DE_ESPESSURA)}" fill="{cor}"/>'
        )

    def seta(
        self,
        de: tuple[float, float],
        para: tuple[float, float],
        cor: str = TINTA,
        espessura: int = 18,
    ) -> None:
        self.linha([de, (para[0] - 40, para[1])], cor, espessura)
        ponta = [
            (para[0], para[1]),
            (para[0] - 62, para[1] - 40),
            (para[0] - 62, para[1] + 40),
        ]
        pontos = " ".join(f"{numero(x)},{numero(y)}" for x, y in ponta)
        self.elementos.append(f'<polygon points="{pontos}" fill="{cor}"/>')

    def salvar(self, caminho: Path) -> None:
        caminho.parent.mkdir(parents=True, exist_ok=True)
        svg = (
            f'<svg xmlns="http://www.w3.org/2000/svg" width="{self.largura_cm}cm" height="{self.altura_cm}cm"'
            f' viewBox="0 0 {self.largura} {self.altura}">\n'
            + "\n".join(self.elementos)
            + "\n</svg>\n"
        )
        caminho.write_text(svg, encoding="utf8", newline="\n")
        print(f"{caminho}: {self.largura_cm} x {self.altura_cm} cm, vetorial")


def caixa_com_titulo(
    q: Quadro,
    x: float,
    y: float,
    largura: float,
    altura: float,
    titulo: str,
    linhas: list[str],
) -> None:
    q.retangulo(
        (x, y, x + largura, y + altura), AZUL_CLARO, AZUL_UNIRV, raio=36, espessura=10
    )
    q.retangulo((x, y, x + largura, y + 150), AZUL_UNIRV, raio=36)
    q.retangulo((x, y + 90, x + largura, y + 150), AZUL_UNIRV)
    q.texto(x + largura / 2, y + 75, titulo, "negrito", 88, "white", "mm")
    for indice, linha in enumerate(linhas):
        q.texto(
            x + largura / 2, y + 255 + indice * 125, linha, "normal", 78, TINTA, "mm"
        )


def arquitetura() -> Quadro:
    q = Quadro(41.6, 9.0)
    largura, altura, topo, folga = 900, 600, 30, 150
    textos = [
        (
            "1. Desenho",
            ["Mouse ou mão no ar", "(webcam + MediaPipe)", "20 s, traço a traço"],
        ),
        (
            "2. Redes neurais",
            ["CNN: imagem 28×28", "LSTM: sequência", "Ensemble: média"],
        ),
        (
            "3. Regra fixa",
            ["Acertou, quase, errou", "+ pontuação fixa", "(não depende do Zé)"],
        ),
        (
            "4. Zé do Rabisco",
            ["Qwen3-1,7B + QLoRA", "GGUF Q8_0 (llama.cpp)", "charada e narração"],
        ),
    ]
    for indice, (titulo, linhas) in enumerate(textos):
        x = 40 + indice * (largura + folga)
        caixa_com_titulo(q, x, topo, largura, altura, titulo, linhas)
        if indice < len(textos) - 1:
            q.seta(
                (x + largura + 14, topo + altura / 2),
                (x + largura + folga - 14, topo + altura / 2),
            )
    rodape = (
        "Tudo offline: redes no navegador (ONNX) e SLM em CPU, sem internet e sem GPU"
    )
    q.texto(q.largura / 2, topo + altura + 135, rodape, "negrito", 84, AZUL_UNIRV, "mm")
    return q


def curva_antecipada() -> dict[str, dict[str, float]]:
    metricas: dict[str, dict[str, dict[str, float]]] = json.loads(
        METRICAS_DAS_REDES.read_text(encoding="utf8")
    )
    return metricas["curva_antecipada"]


def painel_das_redes(q: Quadro, topo: float, base: float) -> None:
    curvas = curva_antecipada()
    esquerda, direita, cima, baixo = 430, q.largura - 200, topo + 250, base - 270
    titulo = "Redes: quem adivinha mais cedo? (acurácia × % do desenho feito)"
    q.texto(60, topo + 25, titulo, "negrito", 100, AZUL_UNIRV)

    def para_x(percentual: float) -> float:  # eixo x: 20% a 100% do desenho
        return esquerda + (percentual - 20) / 80 * (direita - esquerda)

    def para_y(acuracia: float) -> float:  # eixo y: 20% a 100% de acurácia
        return baixo - (acuracia - 0.2) / 0.8 * (baixo - cima)

    for nivel in (0.2, 0.4, 0.6, 0.8, 1.0):
        q.linha([(esquerda, para_y(nivel)), (direita, para_y(nivel))], GRADE, 5)
        q.texto(
            esquerda - 28,
            para_y(nivel),
            f"{round(nivel * 100)}%",
            "normal",
            80,
            TINTA,
            "rm",
        )
    for percentual in range(20, 101, 20):
        q.texto(
            para_x(percentual), baixo + 36, f"{percentual}%", "normal", 80, TINTA, "ma"
        )
    q.texto(
        (esquerda + direita) / 2,
        baixo + 150,
        "% do desenho concluído",
        "normal",
        84,
        TINTA,
        "ma",
    )
    estilo = {
        "CNN": (LARANJA, 14, 20),
        "LSTM": (AZUL, 20, 28),
        "Ensemble": (VERDE, 30, 38),
    }
    # As três curvas são parecidas: a mais grossa (Ensemble) vai primeiro e as outras por cima, mais finas.
    for nome in ("Ensemble", "LSTM", "CNN"):
        cor, espessura, raio = estilo[nome]
        pontos = [(para_x(float(p) * 100), para_y(a)) for p, a in curvas[nome].items()]
        q.linha(pontos, cor, espessura)
        for x, y in pontos:
            q.circulo(x, y, raio, cor)
    for fracao in ("0.5", "0.8"):
        valor = curvas["Ensemble"][fracao]
        x, y = para_x(float(fracao) * 100), para_y(valor)
        rotulo = f"{virgula(valor * 100)}%"
        q.texto(x - 20, y - 140, rotulo, "negrito", 92, VERDE, "mm", contorno=12)
    for indice, nome in enumerate(estilo):
        y = baixo - 400 + indice * 130  # legenda embaixo à direita, onde não há curva
        x = esquerda + 1800
        q.linha([(x, y), (x + 140, y)], estilo[nome][0], 20)
        q.circulo(x + 70, y, 26, estilo[nome][0])
        q.texto(x + 180, y, nome, "normal", 88, TINTA, "lm")


def painel_do_slm(q: Quadro, topo: float, base: float) -> None:
    teste = json.loads(METRICAS_DO_SLM.read_text(encoding="utf8"))["teste"]
    base_do_zero, destilado = teste["base"], teste["destilado"]
    grupos = [
        ("Formato", base_do_zero["formato"], destilado["formato"]),
        (
            "Charada",
            base_do_zero["por_tarefa"]["CHARADA"],
            destilado["por_tarefa"]["CHARADA"],
        ),
        (
            "Veredito",
            base_do_zero["por_tarefa"]["VEREDITO"],
            destilado["por_tarefa"]["VEREDITO"],
        ),
        (
            "Pergunta",
            base_do_zero["por_tarefa"]["PERGUNTA"],
            destilado["por_tarefa"]["PERGUNTA"],
        ),
    ]
    esquerda, direita, cima, baixo = 430, q.largura - 200, topo + 420, base - 220
    q.texto(
        60,
        topo + 25,
        "Zé do Rabisco: Qwen3 base × destilado (teste de 46 exemplos)",
        "negrito",
        100,
        AZUL_UNIRV,
    )
    for indice, (nome, cor) in enumerate(
        (("Qwen3 base", CINZA_AZULADO), ("Zé destilado", VERDE))
    ):
        x = esquerda + 40 + indice * 900
        q.retangulo((x, topo + 175, x + 90, topo + 265), cor, TINTA, espessura=5)
        q.texto(x + 125, topo + 220, nome, "normal", 88, TINTA, "lm")
    for nivel in (0, 0.25, 0.5, 0.75, 1.0):
        y = baixo - nivel * (baixo - cima)
        q.linha([(esquerda, y), (direita, y)], GRADE, 5)
        q.texto(esquerda - 28, y, f"{round(nivel * 100)}%", "normal", 74, TINTA, "rm")
    largura_do_grupo = (direita - esquerda) / len(grupos)
    for indice, (nome, valor_base, valor_destilado) in enumerate(grupos):
        centro = esquerda + (indice + 0.5) * largura_do_grupo
        for lado, (valor, cor) in enumerate(
            ((valor_base, CINZA_AZULADO), (valor_destilado, VERDE))
        ):
            x0 = centro - 315 + lado * 320
            alto = baixo - valor * (baixo - cima)
            q.retangulo((x0, alto, x0 + 310, baixo), cor, TINTA, espessura=5)
            q.texto(
                x0 + 155,
                alto - 22,
                f"{round(valor * 100)}%",
                "negrito",
                94,
                TINTA,
                "ms",
                contorno=12,
            )
        q.texto(centro, baixo + 40, nome, "negrito", 90, TINTA, "ma")


def resultados() -> Quadro:
    q = Quadro(40.7, 30.0)
    painel_das_redes(q, 0, q.altura * 0.49)
    painel_do_slm(q, q.altura * 0.5, q.altura)
    return q


def main() -> None:
    arquitetura().salvar(PASTA_DE_SAIDA / "arquitetura.svg")
    resultados().salvar(PASTA_DE_SAIDA / "resultados.svg")


if __name__ == "__main__":
    main()
