#!/usr/bin/env bash
# Copia os artefatos que o jogo usa em tempo de execução para app/public/modelos/ (fora do Git).
#
# Uso (a partir de projeto_final/):
#   bash scripts/copiar_modelos.sh                          # ensaio local: saida/ensaio + saida/dataset_ensaio
#   bash scripts/copiar_modelos.sh modelos_redes.zip        # redes do Colab (zip do notebook 1)
#   bash scripts/copiar_modelos.sh pasta_das_redes charadas_reserva.json
set -euo pipefail
cd "$(dirname "$0")/.."

ORIGEM_DAS_REDES="${1:-saida/ensaio}"
CHARADAS="${2:-saida/dataset_ensaio/charadas_reserva.json}"
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

echo "OK: modelos copiados de $ORIGEM_DAS_REDES para $DESTINO"
ls -la "$DESTINO"
