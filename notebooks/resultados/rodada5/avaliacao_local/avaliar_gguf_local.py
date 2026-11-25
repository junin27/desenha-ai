"""Avalia o GGUF do Zé no llama-server local, com as entradas de teste e a mesma régua do notebook 3.

Uso: python avaliar_gguf_local.py <gguf> <dataset_slm.zip> <modelos_redes.zip> <saida.json> <temperatura> [passadas]
"""

import json
import subprocess
import sys
import time
import urllib.request
import zipfile
from collections import Counter

from desenha_ml.avaliacao_do_ze import avaliar_saida, resumir
from desenha_ml.ficha_tecnica import montar_ficha
from desenha_ml.prompt_qwen import PARADA, prompt_de_inferencia

SERVIDOR = r"C:\Users\lokao\Documents\Projetos Software\desenha-ai\.claude\worktrees\desenha-ai-continuacao-1fa518\demo\llama\llama-server.exe"
PORTA = 8090


def pedir(prompt: str, temperatura: float) -> tuple[str, float, int]:
    corpo = {"prompt": prompt, "n_predict": 300, "stop": [PARADA], "stream": False, "temperature": temperatura, "repeat_penalty": float(sys.argv[7]) if len(sys.argv) > 7 else 1.0}
    pedido = urllib.request.Request(f"http://127.0.0.1:{PORTA}/completion", data=json.dumps(corpo).encode(),
                                    headers={"Content-Type": "application/json"})
    inicio = time.monotonic()
    with urllib.request.urlopen(pedido, timeout=180) as resposta:
        dados = json.loads(resposta.read())
    return dados["content"].strip(), time.monotonic() - inicio, int(dados.get("tokens_predicted", 0))


def main() -> None:
    gguf, zip_dataset, zip_redes, saida, temperatura = sys.argv[1:6]
    passadas = int(sys.argv[6]) if len(sys.argv) > 6 else 1
    with zipfile.ZipFile(zip_redes) as z:
        ficha = montar_ficha(json.loads(z.read("metricas_redes.json")))
    with zipfile.ZipFile(zip_dataset) as z:
        linhas = [json.loads(l) for l in z.read(f"zedorabisco_{__import__("os").environ.get("DIVISAO", "teste")}_chatml.jsonl").decode("utf8").splitlines() if l]
    exemplos = [{"lote_id": "teste", "tarefa": l["tarefa"], "entrada": l["messages"][1]["content"], "meta": l["meta"],
                 "saida": None} for l in linhas]
    servidor = subprocess.Popen([SERVIDOR, "-m", gguf, "--port", str(PORTA), "-c", "2048", "--threads", "8",
                                 "--parallel", "1"], stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
    try:
        for _ in range(120):
            try:
                urllib.request.urlopen(f"http://127.0.0.1:{PORTA}/health", timeout=2)
                break
            except OSError:
                time.sleep(1)
        registros = []
        for passada in range(passadas):
            for exemplo in exemplos:
                texto, segundos, tokens = pedir(prompt_de_inferencia(exemplo["entrada"]), float(temperatura))
                avaliada = avaliar_saida(exemplo, texto, ficha, tokens)
                registros.append({"passada": passada, "tarefa": exemplo["tarefa"], "entrada": exemplo["entrada"],
                                  "saida": texto, "segundos": segundos, "tokens": tokens,
                                  "formato_ok": avaliada.formato_ok, "tarefa_ok": avaliada.tarefa_ok,
                                  "codigo": avaliada.codigo})
                print(passada, exemplo["tarefa"], avaliada.tarefa_ok, f"{segundos:.1f}s", tokens, flush=True)
                avaliadas_ate_aqui = registros
        resumo = resumir([avaliar_saida(e, r["saida"], ficha, r["tokens"])
                          for r, e in zip(registros, exemplos * passadas)])
        json.dump({"temperatura": float(temperatura), "repeat_penalty": sys.argv[7] if len(sys.argv) > 7 else "1.0", "passadas": passadas, "resumo": vars(resumo),
                   "codigos": Counter(r["codigo"] for r in registros if r["codigo"]),
                   "acima_de_25s": sum(r["segundos"] > 25 for r in registros),
                   "segundos_max": max(r["segundos"] for r in registros), "registros": registros},
                  open(saida, "w", encoding="utf8"), ensure_ascii=False, indent=1)
        print("RESUMO", vars(resumo))
        del avaliadas_ate_aqui
    finally:
        servidor.terminate()
        servidor.wait(timeout=30)


if __name__ == "__main__":
    main()
