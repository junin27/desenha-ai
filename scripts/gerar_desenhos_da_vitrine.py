"""Gera vitrine_tracos.json: um desenho real de teste por categoria (change vitrine-viva, D5).

Casca de I/O: baixa as categorias da vitrine do Quick, Draw! (só os primeiros 9.000 reconhecidos de cada,
por streaming), roda as MESMAS redes ONNX do jogo no avaliador de referência do `onnx` e grava o arquivo.
A regra de escolha está em `desenha_ml.vitrine` (testada). Rodar a partir de `projeto_final/`:

    ml/.venv/Scripts/python scripts/gerar_desenhos_da_vitrine.py
"""

import json
from pathlib import Path

import numpy as np
from desenha_ml.dados import processar_exemplo
from desenha_ml.desenho import Desenho
from desenha_ml.ensemble import combinar
from desenha_ml.exportacao_onnx import probabilidades_onnx_cnn, probabilidades_onnx_lstm
from desenha_ml.fonte_quickdraw import baixar_desenhos
from desenha_ml.rasterizacao import ESPESSURA_PADRAO
from desenha_ml.resultado import Erro
from desenha_ml.vitrine import montar_arquivo_da_vitrine
from numpy.typing import NDArray

RAIZ = Path(__file__).resolve().parents[1]
MODELOS = RAIZ / "app" / "public" / "modelos"
# Versionado junto dos modelos das redes; o copiar_modelos.sh leva para o jogo (app/public/modelos é ignorado).
VERSIONADO = RAIZ / "notebooks" / "resultados" / "modelos_redes" / "vitrine_tracos.json"


def classificar_com_as_redes_do_jogo(desenho: Desenho) -> NDArray[np.float64]:
    imagem, sequencia = processar_exemplo((desenho, 1.0, ESPESSURA_PADRAO))
    p_cnn = probabilidades_onnx_cnn(MODELOS / "cnn.onnx", imagem[None])[0]
    p_lstm = probabilidades_onnx_lstm(MODELOS / "lstm.onnx", [sequencia])[0]
    w_cnn = float(
        json.loads((MODELOS / "classes.json").read_text(encoding="utf8"))["w_cnn"]
    )
    combinado = combinar(p_cnn.tolist(), p_lstm.tolist(), w_cnn)
    if isinstance(combinado, Erro):
        raise SystemExit(f"redes falharam: {combinado.codigo} - {combinado.detalhe}")
    return np.asarray(combinado.valor, dtype=np.float64)


def main() -> None:
    arquivo = montar_arquivo_da_vitrine(
        baixar_desenhos, classificar_com_as_redes_do_jogo
    )
    texto = json.dumps(arquivo, ensure_ascii=False, indent=1)
    for destino in (VERSIONADO, MODELOS / "vitrine_tracos.json"):
        destino.write_text(texto + "\n", encoding="utf8", newline="\n")
    nomes = ", ".join(d["categoria"] for d in arquivo["desenhos"])
    print(f"{VERSIONADO} ({len(texto) / 1024:.1f} KB): {nomes}")


if __name__ == "__main__":
    main()
