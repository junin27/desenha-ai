"""Figuras do banner (pôster 90 x 120 cm do 5º Workshop de IA), com letras grandes para ler a 1 m.

Lê os números dos JSONs de métricas (nada digitado à mão) e desenha com `PIL`, com o dobro da resolução
e redução no fim, para as linhas ficarem suaves. Gera, em `docs/banner/figuras/`:
- `arquitetura.png`  (41,6 x 12,1 cm): do desenho do visitante à narração do Zé;
- `resultados.png`   (40,7 x 30,0 cm): quem adivinha mais cedo (redes) e Qwen3 base x Zé destilado (SLM).
As proporções são as das duas formas de imagem do template `Banner Workshop IA.pptx`.

Uso (a partir de `projeto_final/`): python scripts/figuras_do_banner.py
"""

import json
from pathlib import Path

from PIL import Image, ImageDraw, ImageFont

PASTA_DE_SAIDA = Path("docs/banner/figuras")
METRICAS_DAS_REDES = Path("notebooks/resultados/modelos_redes/metricas_redes.json")
METRICAS_DO_SLM = Path("notebooks/resultados/rodada5/metricas_slm.json")

PIXELS_POR_CM = 100
SUPERAMOSTRAGEM = 2  # desenha com o dobro da resolução e reduz no fim
AZUL_UNIRV = "#004AAD"
AZUL_CLARO = "#E8F0FB"
TINTA = "#1F2937"
GRADE = "#D9DEE5"
LARANJA = "#D9822B"
AZUL = "#1F6FBF"
VERDE = "#2E8456"
CINZA_AZULADO = "#A3AEBD"
FONTES = {
    "normal": ["segoeui.ttf", "arial.ttf"],
    "negrito": ["segoeuib.ttf", "arialbd.ttf"],
}


def fonte(estilo: str, tamanho: int) -> ImageFont.FreeTypeFont:
    for nome in FONTES[estilo]:
        try:
            return ImageFont.truetype(nome, tamanho * SUPERAMOSTRAGEM)
        except OSError:
            continue
    raise SystemExit(
        f"nenhuma fonte de {FONTES[estilo]} encontrada; instale uma delas ou ajuste FONTES"
    )


def ss(valor: float) -> int:
    return round(valor * SUPERAMOSTRAGEM)


def virgula(valor: float, casas: int = 1) -> str:
    return f"{valor:.{casas}f}".replace(".", ",")


class Quadro:
    """Tela de desenho em pixels lógicos; as chamadas já aplicam a superamostragem."""

    def __init__(self, largura_cm: float, altura_cm: float) -> None:
        self.largura = round(largura_cm * PIXELS_POR_CM)
        self.altura = round(altura_cm * PIXELS_POR_CM)
        self.imagem = Image.new("RGB", (ss(self.largura), ss(self.altura)), "white")
        self.pincel = ImageDraw.Draw(self.imagem)

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
        """`contorno` > 0 desenha um halo branco, para o rótulo não ser riscado pela grade."""
        self.pincel.text(
            (ss(x), ss(y)),
            texto,
            font=fonte(estilo, tamanho),
            fill=cor,
            anchor=ancora,
            stroke_width=ss(contorno),
            stroke_fill="white",
        )

    def retangulo(
        self,
        caixa: tuple[float, float, float, float],
        preenchimento: str,
        borda: str | None = None,
        raio: int = 0,
        espessura: int = 4,
    ) -> None:
        esquerda, topo, direita, base = (ss(v) for v in caixa)
        self.pincel.rounded_rectangle(
            (esquerda, topo, direita, base),
            radius=ss(raio),
            fill=preenchimento,
            outline=borda,
            width=ss(espessura),
        )

    def linha(
        self, pontos: list[tuple[float, float]], cor: str, espessura: int
    ) -> None:
        self.pincel.line(
            [(ss(x), ss(y)) for x, y in pontos],
            fill=cor,
            width=ss(espessura),
            joint="curve",
        )

    def circulo(self, x: float, y: float, raio: int, cor: str) -> None:
        self.pincel.ellipse(
            (ss(x - raio), ss(y - raio), ss(x + raio), ss(y + raio)), fill=cor
        )

    def seta(
        self,
        de: tuple[float, float],
        para: tuple[float, float],
        cor: str = TINTA,
        espessura: int = 10,
    ) -> None:
        self.linha([de, (para[0] - 22, para[1])], cor, espessura)
        ponta = [
            (para[0], para[1]),
            (para[0] - 44, para[1] - 28),
            (para[0] - 44, para[1] + 28),
        ]
        self.pincel.polygon([(ss(x), ss(y)) for x, y in ponta], fill=cor)

    def salvar(self, caminho: Path) -> None:
        caminho.parent.mkdir(parents=True, exist_ok=True)
        pronta = self.imagem.resize((self.largura, self.altura), Image.LANCZOS)
        pronta.save(caminho, optimize=True)
        print(f"{caminho}: {self.largura}x{self.altura}px")


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
        (x, y, x + largura, y + altura), AZUL_CLARO, AZUL_UNIRV, raio=36, espessura=6
    )
    q.retangulo((x, y, x + largura, y + 150), AZUL_UNIRV, raio=36)
    q.retangulo((x, y + 90, x + largura, y + 150), AZUL_UNIRV)
    q.texto(x + largura / 2, y + 75, titulo, "negrito", 76, "white", "mm")
    for indice, linha in enumerate(linhas):
        q.texto(
            x + largura / 2, y + 265 + indice * 150, linha, "normal", 70, TINTA, "mm"
        )


def arquitetura() -> Quadro:
    q = Quadro(41.6, 12.1)
    largura, altura, topo, folga = 900, 760, 60, 150
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
            ["Acertou, quase ou errou", "+ pontuação fixa", "(não depende do Zé)"],
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
    q.texto(
        q.largura / 2,
        topo + altura + 190,
        "Tudo offline: redes no navegador (ONNX) e SLM em CPU, sem internet e sem GPU",
        "negrito",
        74,
        AZUL_UNIRV,
        "mm",
    )
    return q


def curva_antecipada() -> dict[str, dict[str, float]]:
    metricas: dict[str, dict[str, dict[str, float]]] = json.loads(
        METRICAS_DAS_REDES.read_text(encoding="utf8")
    )
    return metricas["curva_antecipada"]


def painel_das_redes(q: Quadro, topo: float, base: float) -> None:
    curvas = curva_antecipada()
    esquerda, direita, cima, baixo = 360, q.largura - 170, topo + 200, base - 190
    q.texto(
        esquerda - 300,
        topo + 20,
        "Redes: quem adivinha mais cedo? (acurácia × % do desenho feito)",
        "negrito",
        84,
        AZUL_UNIRV,
    )

    def para_x(percentual: float) -> float:  # eixo x: 20% a 100% do desenho
        return esquerda + (percentual - 20) / 80 * (direita - esquerda)

    def para_y(acuracia: float) -> float:  # eixo y: 20% a 100% de acurácia
        return baixo - (acuracia - 0.2) / 0.8 * (baixo - cima)

    for nivel in (0.2, 0.4, 0.6, 0.8, 1.0):
        q.linha([(esquerda, para_y(nivel)), (direita, para_y(nivel))], GRADE, 3)
        q.texto(
            esquerda - 24,
            para_y(nivel),
            f"{round(nivel * 100)}%",
            "normal",
            60,
            TINTA,
            "rm",
        )
    for percentual in range(20, 101, 20):
        q.texto(
            para_x(percentual), baixo + 30, f"{percentual}%", "normal", 60, TINTA, "ma"
        )
    q.texto(
        (esquerda + direita) / 2,
        baixo + 105,
        "% do desenho concluído",
        "normal",
        62,
        TINTA,
        "ma",
    )
    estilo = {"CNN": (LARANJA, 8), "LSTM": (AZUL, 8), "Ensemble": (VERDE, 13)}
    for nome, (cor, espessura) in estilo.items():
        pontos = [(para_x(float(p) * 100), para_y(a)) for p, a in curvas[nome].items()]
        q.linha(pontos, cor, espessura)
        for x, y in pontos:
            q.circulo(x, y, 15, cor)
    for fracao, deslocamento in (("0.5", (-40, -120)), ("0.8", (-40, -120))):
        valor = curvas["Ensemble"][fracao]
        x, y = para_x(float(fracao) * 100), para_y(valor)
        q.texto(
            x + deslocamento[0],
            y + deslocamento[1],
            f"{virgula(valor * 100)}%",
            "negrito",
            66,
            VERDE,
            "mm",
            contorno=8,
        )
    for indice, nome in enumerate(estilo):
        x = esquerda + 1850 + indice * 0  # legenda embaixo à direita, onde não há curva
        y = baixo - 330 + indice * 105
        q.linha([(x, y), (x + 90, y)], estilo[nome][0], 12)
        q.circulo(x + 45, y, 16, estilo[nome][0])
        q.texto(x + 120, y, nome, "normal", 66, TINTA, "lm")


def painel_do_slm(q: Quadro, topo: float, base: float) -> None:
    teste = json.loads(METRICAS_DO_SLM.read_text(encoding="utf8"))["teste"]
    grupos = [
        (
            "Formato",
            ["formato"],
            teste["base"]["formato"],
            teste["destilado"]["formato"],
        ),
        (
            "Charada",
            ["CHARADA"],
            teste["base"]["por_tarefa"]["CHARADA"],
            teste["destilado"]["por_tarefa"]["CHARADA"],
        ),
        (
            "Veredito",
            ["VEREDITO"],
            teste["base"]["por_tarefa"]["VEREDITO"],
            teste["destilado"]["por_tarefa"]["VEREDITO"],
        ),
        (
            "Pergunta",
            ["PERGUNTA"],
            teste["base"]["por_tarefa"]["PERGUNTA"],
            teste["destilado"]["por_tarefa"]["PERGUNTA"],
        ),
    ]
    esquerda, direita, cima, baixo = 360, q.largura - 170, topo + 330, base - 150
    q.texto(
        esquerda - 300,
        topo + 20,
        "Zé do Rabisco: Qwen3 base × destilado (teste de 46 exemplos)",
        "negrito",
        84,
        AZUL_UNIRV,
    )
    for indice, (nome, cor) in enumerate(
        (("Qwen3 base", CINZA_AZULADO), ("Zé destilado", VERDE))
    ):
        x = esquerda + 40 + indice * 620
        q.retangulo((x, topo + 175, x + 70, topo + 235), cor)
        q.texto(x + 95, topo + 205, nome, "normal", 64, TINTA, "lm")
    for nivel in (0, 0.25, 0.5, 0.75, 1.0):
        y = baixo - nivel * (baixo - cima)
        q.linha([(esquerda, y), (direita, y)], GRADE, 3)
        q.texto(esquerda - 24, y, f"{round(nivel * 100)}%", "normal", 56, TINTA, "rm")
    largura_do_grupo = (direita - esquerda) / len(grupos)
    for indice, (nome, _, base_valor, destilado_valor) in enumerate(grupos):
        centro = esquerda + (indice + 0.5) * largura_do_grupo
        for lado, (valor, cor) in enumerate(
            ((base_valor, CINZA_AZULADO), (destilado_valor, VERDE))
        ):
            x0 = centro - 250 + lado * 255
            alto = baixo - valor * (baixo - cima)
            q.retangulo((x0, alto, x0 + 245, baixo), cor)
            q.texto(
                x0 + 122,
                alto - 18,
                f"{round(valor * 100)}%",
                "negrito",
                64,
                TINTA,
                "ms",
                contorno=8,
            )
        q.texto(centro, baixo + 35, nome, "negrito", 64, TINTA, "ma")


def resultados() -> Quadro:
    q = Quadro(40.7, 30.0)
    painel_das_redes(q, 0, q.altura * 0.5)
    painel_do_slm(q, q.altura * 0.5 + 30, q.altura)
    return q


def main() -> None:
    arquitetura().salvar(PASTA_DE_SAIDA / "arquitetura.png")
    resultados().salvar(PASTA_DE_SAIDA / "resultados.png")


if __name__ == "__main__":
    main()
