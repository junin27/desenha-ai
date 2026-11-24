"""Prepara a pasta `demo/` COM internet, antes do evento (spec preparacao-da-demo).

Baixa o llama-server (versão fixada) e o GGUF do Qwen3 base, copia o GGUF do Zé destilado (se houver),
gera o build do jogo e grava `demo/manifesto.json` com tamanho e SHA-256 de cada arquivo.

Uso (a partir de `projeto_final/`):
    ml/.venv/Scripts/python scripts/preparar_demo.py [--gguf-do-ze caminho/zedorabisco-1.7b-Q4_K_M.gguf]
"""

import argparse
import shutil
import subprocess
import sys
import urllib.request
import zipfile
from http.client import IncompleteRead
from pathlib import Path

sys.path.insert(0, str(Path(__file__).parent))

from demo_comum import (
    BYTES_POR_BLOCO,
    PASTA_DA_DEMO,
    RAIZ_DO_PROJETO,
    DiscoReal,
    sha256_do_arquivo,
)
from desenha_ml.demo.manifesto import (
    AVISO_SEM_ZE,
    ArquivoDaDemo,
    Manifesto,
    comparar_com_o_disco,
    manifesto_para_json,
    montar_manifesto,
)
from desenha_ml.resultado import Erro, Ok, Resultado

# Versões fixadas (design D2). Só mudam por uma nova change: a linha de comando do llama-server depende da tag.
TAG_DO_LLAMA_CPP = "b12651"
NOME_DO_ZIP_DO_LLAMA_CPP = f"llama-{TAG_DO_LLAMA_CPP}-bin-win-cpu-x64.zip"
URL_DO_LLAMA_CPP = f"https://github.com/ggml-org/llama.cpp/releases/download/{TAG_DO_LLAMA_CPP}/{NOME_DO_ZIP_DO_LLAMA_CPP}"
TAMANHO_DO_ZIP_DO_LLAMA_CPP = 25_096_571
SHA256_DO_ZIP_DO_LLAMA_CPP = (
    "b2d794fa7587aba29f654d717ff9b73e31caeabf50a7766692903008bbe0855d"
)
REPOSITORIO_DO_GGUF_BASE = "unsloth/Qwen3-1.7B-GGUF"
ARQUIVO_DO_GGUF_BASE = "Qwen3-1.7B-Q4_K_M.gguf"
URL_DO_GGUF_BASE = f"https://huggingface.co/{REPOSITORIO_DO_GGUF_BASE}/resolve/main/{ARQUIVO_DO_GGUF_BASE}"
TAMANHO_DO_GGUF_BASE = 1_107_409_472
SHA256_DO_GGUF_BASE = "b139949c5bd74937ad8ed8c8cf3d9ffb1e99c866c823204dc42c0d91fa181897"
NOME_DO_GGUF_BASE_NA_DEMO = "qwen3-1.7b-base-Q4_K_M.gguf"
NOME_DO_GGUF_DO_ZE_NA_DEMO = "zedorabisco-1.7b-Q4_K_M.gguf"
SEGUNDOS_SEM_RESPOSTA = 60


def aviso_do_ze(gguf_do_ze: Path | None) -> str:
    return AVISO_SEM_ZE if gguf_do_ze is None else ""


def baixar_com_conferencia(
    url: str, destino: Path, tamanho_esperado: int, sha256_esperado: str | None
) -> Resultado[Path]:
    """Grava em `<destino>.parcial` e só renomeia depois de conferir tamanho e SHA-256."""
    if _ja_integro(destino, tamanho_esperado, sha256_esperado):
        return Ok(destino)
    destino.parent.mkdir(parents=True, exist_ok=True)
    parcial = destino.with_name(destino.name + ".parcial")
    recebidos = _baixar_para(url, parcial)
    if isinstance(recebidos, Erro):
        parcial.unlink(missing_ok=True)
        return recebidos
    problema = _problema_do_arquivo(parcial, tamanho_esperado, sha256_esperado)
    if problema is not None:
        parcial.unlink(missing_ok=True)
        return problema
    parcial.replace(destino)
    return Ok(destino)


def _ja_integro(
    destino: Path, tamanho_esperado: int, sha256_esperado: str | None
) -> bool:
    if not destino.is_file():
        return False
    return _problema_do_arquivo(destino, tamanho_esperado, sha256_esperado) is None


def _baixar_para(url: str, parcial: Path) -> Resultado[int]:
    recebidos = 0
    try:
        with (
            urllib.request.urlopen(url, timeout=SEGUNDOS_SEM_RESPOSTA) as resposta,
            parcial.open("wb") as saida,
        ):
            while bloco := resposta.read(BYTES_POR_BLOCO):
                saida.write(bloco)
                recebidos += len(bloco)
    except IncompleteRead as interrompido:
        recebidos += len(interrompido.partial)
        esperado = recebidos + (
            interrompido.expected if isinstance(interrompido.expected, int) else 0
        )
        return Erro(
            "download_incompleto",
            f"{url}: conexão caiu com {recebidos} de {esperado} bytes",
        )
    except OSError as falha:
        return Erro(
            "download_incompleto", f"{url}: {falha}; chegaram {recebidos} bytes"
        )
    return Ok(recebidos)


def _problema_do_arquivo(
    arquivo: Path, tamanho_esperado: int, sha256_esperado: str | None
) -> Erro | None:
    tamanho = arquivo.stat().st_size
    if tamanho != tamanho_esperado:
        detalhe = (
            f"{arquivo.name}: chegaram {tamanho} bytes de {tamanho_esperado} esperados"
        )
        return Erro("download_incompleto", detalhe)
    if sha256_esperado is not None and sha256_do_arquivo(arquivo) != sha256_esperado:
        return Erro(
            "download_incompleto",
            f"{arquivo.name}: SHA-256 diferente do esperado {sha256_esperado}",
        )
    return None


def extrair_llama_cpp(zip_do_llama: Path, pasta_llama: Path) -> Resultado[Path]:
    with zipfile.ZipFile(zip_do_llama) as pacote:
        pacote.extractall(pasta_llama)
    servidor = next(pasta_llama.rglob("llama-server.exe"), None)
    if servidor is None:
        return Erro(
            "arquivo_ausente",
            f"llama-server.exe não está em {zip_do_llama}; esperado no pacote oficial",
        )
    return Ok(servidor)


def copiar_gguf_do_ze(origem: Path, pasta_da_demo: Path) -> Resultado[Path]:
    if not origem.is_file():
        return Erro(
            "arquivo_ausente",
            f"GGUF do Zé não encontrado em {origem}; esperado o arquivo do notebook 3",
        )
    destino = pasta_da_demo / "modelos" / NOME_DO_GGUF_DO_ZE_NA_DEMO
    destino.parent.mkdir(parents=True, exist_ok=True)
    shutil.copyfile(origem, destino)
    return Ok(destino)


def gerar_jogo(pasta_da_demo: Path) -> Resultado[Path]:
    """Build do jogo (com `app/public/modelos` dentro) copiado para `demo/jogo`."""
    app = RAIZ_DO_PROJETO / "app"
    if not (app / "public" / "modelos" / "cnn.onnx").is_file():
        return Erro(
            "arquivo_ausente",
            f"{app / 'public' / 'modelos'} sem as redes; rode `bash scripts/copiar_modelos.sh`",
        )
    construcao = subprocess.run(
        ["npm", "run", "build"], cwd=app, shell=True, check=False
    )
    if construcao.returncode != 0:
        return Erro(
            "arquivo_ausente",
            f"`npm run build` falhou com código {construcao.returncode}",
        )
    destino = pasta_da_demo / "jogo"
    shutil.rmtree(destino, ignore_errors=True)
    shutil.copytree(app / "dist", destino)
    return Ok(destino)


def _arquivos_da_pasta(pasta_da_demo: Path, subpasta: str) -> tuple[ArquivoDaDemo, ...]:
    arquivos = sorted(
        path for path in (pasta_da_demo / subpasta).rglob("*") if path.is_file()
    )
    return tuple(_arquivo_da_demo(pasta_da_demo, path) for path in arquivos)


def _arquivo_da_demo(pasta_da_demo: Path, caminho: Path) -> ArquivoDaDemo:
    relativo = caminho.relative_to(pasta_da_demo).as_posix()
    return ArquivoDaDemo(relativo, caminho.stat().st_size, sha256_do_arquivo(caminho))


def gravar_manifesto(
    pasta_da_demo: Path, gguf_do_ze: Path | None
) -> Resultado[Manifesto]:
    comuns = (
        *_arquivos_da_pasta(pasta_da_demo, "llama"),
        _arquivo_da_demo(
            pasta_da_demo, pasta_da_demo / "modelos" / NOME_DO_GGUF_BASE_NA_DEMO
        ),
        *_arquivos_da_pasta(pasta_da_demo, "jogo"),
    )
    ze = (
        None
        if gguf_do_ze is None
        else _arquivo_da_demo(
            pasta_da_demo, pasta_da_demo / "modelos" / NOME_DO_GGUF_DO_ZE_NA_DEMO
        )
    )
    manifesto = montar_manifesto(
        versao_do_llama_cpp=TAG_DO_LLAMA_CPP,
        origem_do_gguf_base=f"{REPOSITORIO_DO_GGUF_BASE}:{ARQUIVO_DO_GGUF_BASE}",
        arquivos_comuns=comuns,
        gguf_do_ze=ze,
    )
    (pasta_da_demo / "manifesto.json").write_text(
        manifesto_para_json(manifesto), encoding="utf8", newline="\n"
    )
    divergencias = comparar_com_o_disco(manifesto, DiscoReal(pasta_da_demo))
    if divergencias:
        return Erro(
            "arquivo_ausente",
            "; ".join(divergencia.detalhe for divergencia in divergencias),
        )
    return Ok(manifesto)


def preparar(pasta_da_demo: Path, gguf_do_ze: Path | None) -> Resultado[Manifesto]:
    zip_do_llama = baixar_com_conferencia(
        URL_DO_LLAMA_CPP,
        pasta_da_demo / "cache" / NOME_DO_ZIP_DO_LLAMA_CPP,
        TAMANHO_DO_ZIP_DO_LLAMA_CPP,
        SHA256_DO_ZIP_DO_LLAMA_CPP,
    )
    if isinstance(zip_do_llama, Erro):
        return zip_do_llama
    servidor = extrair_llama_cpp(zip_do_llama.valor, pasta_da_demo / "llama")
    base = baixar_com_conferencia(
        URL_DO_GGUF_BASE,
        pasta_da_demo / "modelos" / NOME_DO_GGUF_BASE_NA_DEMO,
        TAMANHO_DO_GGUF_BASE,
        SHA256_DO_GGUF_BASE,
    )
    ze = (
        Ok(None) if gguf_do_ze is None else copiar_gguf_do_ze(gguf_do_ze, pasta_da_demo)
    )
    jogo = gerar_jogo(pasta_da_demo)
    for etapa in (servidor, base, ze, jogo):
        if isinstance(etapa, Erro):
            return etapa
    return gravar_manifesto(pasta_da_demo, gguf_do_ze)


def main() -> int:
    parser = argparse.ArgumentParser(description=(__doc__ or "").splitlines()[0])
    parser.add_argument(
        "--gguf-do-ze",
        type=Path,
        default=None,
        help="GGUF do notebook 3 (sem ele: modo ensaio)",
    )
    argumentos = parser.parse_args()
    resultado = preparar(PASTA_DA_DEMO, argumentos.gguf_do_ze)
    if isinstance(resultado, Erro):
        print(f"ERRO: {resultado.detalhe}", file=sys.stderr)
        return 1
    print(
        f"OK: demo preparada em {PASTA_DA_DEMO} ({len(resultado.valor.arquivos)} arquivos conferidos)"
    )
    if aviso := aviso_do_ze(argumentos.gguf_do_ze):
        print(f"AVISO: {aviso}")
    return 0


if __name__ == "__main__":
    sys.exit(main())
