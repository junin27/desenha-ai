# Design

## Context

O rascunho `notebooks/fontes/02_slm_destilacao_dataset.py` tem o pipeline inteiro dentro das células: ficha técnica, *system prompt*, estilo da persona, seeds, Evol-Instruct, prompts do Teacher, *checkpoint*, curadoria (com uma cópia própria da regra do veredito e da detecção de vazamento) e exportação. O pacote já tem as regras compartilhadas (`veredito`, `vazamento`, `ensemble.top_k`) e o padrão de contrato Python → TypeScript. O jogo ainda não tem domínio de conversa. Motivação em `proposal.md`.

## Goals / Non-Goals

**Goals:**
- Um único formato de conversa, provado por contrato nas duas linguagens.
- Curadoria reutilizando as regras já especificadas (veredito, vazamento), sem cópias.
- Geração testável sem rede: o Teacher é uma porta, testada com um dublê.

**Non-Goals:**
- Otimizar o custo de tokens do Teacher além do agrupamento em lotes.
- Qualidade do humor por métrica automática.

## Decisions

### D1 — Módulos
| Módulo | Responsabilidade |
|---|---|
| `conversa.py` | instrução de sistema, entradas das 3 tarefas, leitura da fala (completa, por tarefa, progressiva) |
| `ficha_tecnica.py` | fatos do projeto + números de `metricas_redes.json`; números permitidos |
| `teacher.py` | porta `Teacher` (Protocol), intervalo entre chamadas, novas tentativas com espera crescente, *checkpoint* em JSONL |
| `teacher_apis.py` | adaptadores `TeacherGemini` e `TeacherGroq` (extra `[teacher]`, importados só no notebook) |
| `geracao_dataset.py` | persona, seeds, estilos, montagem dos prompts e dos lotes, Evol-Instruct, casos de VEREDITO |
| `curadoria.py` | reparos, filtros com códigos, desduplicação |
| `exportacao_dataset.py` | separação estratificada, ShareGPT/ChatML, relatório, charadas de reserva |
| `app/src/domain/ze/conversa.ts` | espelho de `conversa.py` |

### D2 — Arredondamento com tolerância
Mesmo problema das changes anteriores (`round()` do Python arredonda para o par; `Math.round` arredonda para cima; e 0,345 vale 0,34499… em binário). Fórmula única nas duas linguagens: `floor(100*p + 0.5 + 1e-9)`.

### D3 — Leitura progressiva
Corta do fim do texto qualquer prefixo de tag ainda incompleto (`<`, `</pen`, `<resp`…) antes de extrair os blocos, para o jogo nunca mostrar meia tag na tela. Implementada por comparação com a lista das 4 tags, sem regex dinâmica, para ser igual nas duas linguagens.

### D4 — Teacher como porta
`Teacher.gerar(prompt: str, temperatura: float) -> dict | None`, que devolve o JSON já interpretado ou `None` após esgotar as tentativas. O relógio e a espera são injetados (`dormir`), para os testes de nova tentativa não esperarem de verdade. Os adaptadores usam `response_mime_type="application/json"` (Gemini) e `response_format={"type": "json_object"}` (Groq).
- **Alternativa descartada:** LangChain (dependência pesada para duas chamadas HTTP).

### D5 — Regra do veredito na curadoria
O caso de VEREDITO traz o top-5 do ensemble já ordenado. A regra esperada é aplicada com `veredito.veredito(alvo, probabilidades)` sobre a distribuição reconstruída a partir do top-5 (as categorias fora do top-5 recebem 0). Assim a regra é exatamente a da spec `julgamento-do-desenho`, sem uma terceira implementação.

### D6 — Execução
O notebook 2 roda no Colab, com a chave em *Secrets*, ou localmente com `GEMINI_API_KEY` no ambiente. São cerca de 110 chamadas de 5 a 6 exemplos cada, com intervalo de 4,5 s (15 RPM do *free tier*): de 10 a 20 min. Modelo padrão: `gemini-3.5-flash-lite` (o mesmo que funcionou na atividade N2), configurável.

## Risks / Trade-offs

- [Teacher erra a regra do veredito com frequência] → a curadoria descarta; se faltar volume, gera-se mais um lote de casos (o *checkpoint* permite incrementar).
- [Free tier esgotado no meio] → *checkpoint* + `GroqTeacher` como alternativa.
- [Falsos positivos de vazamento reduzem as charadas] → o relatório mede; o mínimo é de 60 por tarefa, e 180 pedidos dão margem.
- [Português do Teacher com anglicismos] → filtro de recusa/inglês e persona com exemplos.
