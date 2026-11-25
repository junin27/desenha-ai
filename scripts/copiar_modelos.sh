#!/usr/bin/env bash
# Copia os artefatos que o jogo usa em tempo de execução para app/public/modelos/ (fora do Git).
#
# Uso (a partir de projeto_final/):
#   bash scripts/copiar_modelos.sh                          # ensaio local: saida/ensaio + saida/dataset_ensaio
#   bash scripts/copiar_modelos.sh modelos_redes.zip        # redes do Colab (zip do notebook 1)
#   bash scripts/copiar_modelos.sh pasta_das_redes charadas_reserva.json [metricas_slm.json]
#
# metricas_redes.json (junto das redes) e metricas_slm.json (notebook 3) são opcionais: alimentam o painel
# técnico, que mostra "—" sem eles.
set -euo pipefail
cd "$(dirname "$0")/.."

ORIGEM_DAS_REDES="${1:-saida/ensaio}"
CHARADAS="${2:-saida/dataset_ensaio/charadas_reserva.json}"
METRICAS_SLM="${3:-}"
DESTINO="app/public/modelos"
ARQUIVOS_DAS_REDES=(cnn.onnx lstm.onnx classes.json teste_paridade_redes.json)

if [[ "$ORIGEM_DAS_REDES" == *.zip ]]; then
  TEMPORARIA="$(mktemp -d)"
  trap 'rm -rf "$TEMPORARIA"' EXIT
  unzip -q "$ORIGEM_DAS_REDES" -d "$TEMPORARIA"
  # O zip pode ter os arquivos na raiz ou dentro de uma pasta: usa a pasta que tem o cnn.onnx.
  ORIGEM_DAS_REDES="$(dirname "$(find "$TEMPORARIA" -name cnn.onnx -print -quit)")"
fi

mkdir -p "$DESTINO"
for arquivo in "${ARQUIVOS_DAS_REDES[@]}"; do
  if [[ ! -f "$ORIGEM_DAS_REDES/$arquivo" ]]; then
    echo "ERRO: falta $ORIGEM_DAS_REDES/$arquivo (esperado o resultado do notebook 1 ou do ensaio local)" >&2
    exit 1
  fi
  cp "$ORIGEM_DAS_REDES/$arquivo" "$DESTINO/"
done

if [[ -f "$CHARADAS" ]]; then
  cp "$CHARADAS" "$DESTINO/charadas_reserva.json"
else
  echo "AVISO: $CHARADAS não encontrado; o jogo usará a charada genérica de reserva." >&2
fi

if [[ -f "$ORIGEM_DAS_REDES/metricas_redes.json" ]]; then
  cp "$ORIGEM_DAS_REDES/metricas_redes.json" "$DESTINO/"
fi
if [[ -n "$METRICAS_SLM" ]]; then
  if [[ -f "$METRICAS_SLM" ]]; then
    cp "$METRICAS_SLM" "$DESTINO/metricas_slm.json"
  else
    echo "AVISO: $METRICAS_SLM não encontrado; o painel mostrará — nas métricas do SLM." >&2
  fi
fi

# Modo Mão (change desenho-com-a-mao): modelo da mão do MediaPipe e o wasm da biblioteca, servidos pelo
# próprio jogo para o desenho com a mão funcionar offline. Sem eles, o jogo cai para o mouse com aviso.
MODELO_DA_MAO="notebooks/resultados/modelo_mao/hand_landmarker.task"
WASM_DA_MAO="app/node_modules/@mediapipe/tasks-vision/wasm"
DESTINO_DA_MAO="app/public/mao"
if [[ -f "$MODELO_DA_MAO" && -d "$WASM_DA_MAO" ]]; then
  mkdir -p "$DESTINO_DA_MAO"
  cp "$MODELO_DA_MAO" "$DESTINO_DA_MAO/"
  cp "$WASM_DA_MAO/vision_wasm_internal.js" "$WASM_DA_MAO/vision_wasm_internal.wasm" "$DESTINO_DA_MAO/"
else
  echo "AVISO: modelo da mão ou wasm do MediaPipe ausente; o modo Mão ficará indisponível." >&2
fi

echo "OK: modelos copiados de $ORIGEM_DAS_REDES para $DESTINO"
ls -la "$DESTINO"
