#!/usr/bin/env bash
# Verificação completa do projeto. Falha no primeiro erro (pipefail evita que um `| tail` esconda falhas).
set -euo pipefail
cd "$(dirname "$0")/.."

PY=ml/.venv/Scripts/python
[ -x "$PY" ] || PY=ml/.venv/bin/python

echo "== Python: ruff, mypy --strict, pytest"
"$PY" -m ruff check ml
"$PY" -m ruff format --check ml
"$PY" -m mypy --config-file ml/pyproject.toml ml/src ml/tests
"$PY" -m pytest ml

echo "== TypeScript: typecheck, lint, testes"
npm --prefix app run -s typecheck
npm --prefix app run -s lint
npm --prefix app test --silent

echo "== OpenSpec"
openspec validate --all --strict

echo "OK: verificação completa passou."
