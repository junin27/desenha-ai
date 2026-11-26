# Troca as figuras de gráfico e diagrama do pôster (PNG) pelas versões vetoriais (SVG) de
# docs/banner/figuras/, na mesma posição e tamanho. Vetor não tem pixel: linhas e letras saem nítidas em
# qualquer tamanho de impressão. Usa o PowerPoint (COM), que guarda sozinho a imagem reserva que o formato
# SVG exige dentro do .pptx.
#
# Uso (a partir de projeto_final/, depois de figuras_do_banner.py e montar_banner.py):
#   powershell -ExecutionPolicy Bypass -File scripts/vetorizar_figuras_do_banner.ps1

param(
    [string]$Banner = "docs\banner\Banner Desenha Ai.pptx",
    [string]$Figuras = "docs\banner\figuras"
)

# Formas do template que recebem as figuras (montar_banner.py põe arquitetura em image1 e resultados em image2).
$Trocas = @(
    @{ Forma = "Freeform 38"; Svg = "arquitetura.svg"; Nome = "Figura arquitetura (vetor)" },
    @{ Forma = "Freeform 39"; Svg = "resultados.svg"; Nome = "Figura resultados (vetor)" }
)
$MSO_FALSO = 0
$MSO_VERDADEIRO = -1

$caminhoDoBanner = (Resolve-Path $Banner).Path
$powerpoint = New-Object -ComObject PowerPoint.Application
try {
    $apresentacao = $powerpoint.Presentations.Open($caminhoDoBanner, $MSO_FALSO, $MSO_FALSO, $MSO_FALSO)
    $slide = $apresentacao.Slides(1)
    foreach ($troca in $Trocas) {
        $antiga = $slide.Shapes($troca.Forma)
        $svg = (Resolve-Path (Join-Path $Figuras $troca.Svg)).Path
        $nova = $slide.Shapes.AddPicture($svg, $MSO_FALSO, $MSO_VERDADEIRO, $antiga.Left, $antiga.Top, $antiga.Width, $antiga.Height)
        $nova.Name = $troca.Nome
        # A nova figura fica na mesma camada da antiga (logo acima dela) e a antiga sai.
        while ($nova.ZOrderPosition -gt $antiga.ZOrderPosition + 1) { $nova.ZOrder(3) }
        $antiga.Delete()
        Write-Output ("{0} -> {1}" -f $troca.Forma, $troca.Svg)
    }
    $apresentacao.Save()
    $apresentacao.Close()
}
finally {
    $powerpoint.Quit()
}
