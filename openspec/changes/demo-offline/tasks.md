# Tasks

## 1. Núcleo puro `desenha_ml.demo` (TDD)

- [ ] 1.1 `manifesto`: SHA-256 por arquivo, comparação com o disco (ausente, tamanho, hash), modo ensaio e (de)serialização do `manifesto.json`: testes "Manifesto completo", "Preparação repetida" e "Sem o GGUF do Zé" → implementar
- [ ] 1.2 `servidores`: linhas de comando do destilado, do base e do modo ensaio, e decisão de memória: testes "Linhas de comando dos servidores", "Modo ensaio" e "Memória curta" → implementar
- [ ] 1.3 `saude` e `navegador`: interpretação do `/health`, prazo de 90 s com mensagem e últimas 20 linhas do registro, escolha Chrome/Edge e argumentos de tela cheia: testes "Servidor que não sobe" e "Sem Chrome" → implementar
- [ ] 1.4 `checklist`: itens ✓/✗/⚠ com ação, voz pt-BR a partir da lista de vozes, fala real (formato e 25 s) e resultado final com código de saída: testes "Arquivo corrompido", "Sem voz pt-BR", "Zé respondendo" e "Só avisos" → implementar

## 2. Casca (scripts e arquivos de um clique)

- [ ] 2.1 `scripts/preparar_demo.py`: download com arquivo `.parcial` e conferência de tamanho, extração do llama.cpp, cópia dos GGUF e das redes, build do jogo e manifesto; *tag* do llama.cpp fixada e registrada no design: testes com servidor HTTP local para "Download interrompido" e "Preparação repetida"
- [ ] 2.2 `scripts/iniciar_demo.py` + `Iniciar Desenha Aí.bat`: Job Object, memória, servidores, espera por saúde, navegador e Ctrl+C: teste do Job Object com um processo filho de longa duração ("Ctrl+C") e conferência manual do `.bat`
- [ ] 2.3 `scripts/conferir_demo.py` + `Conferir Desenha Aí.bat`: leitura das vozes no registro, memória, portas e fala real; teste da leitura das vozes com uma lista simulada
- [ ] 2.4 `docs/checklist_evento.md` (cenário "Checklist disponível"), seção "Como rodar a demo" no README e `demo/` no `.gitignore`

## 3. Ensaio real e verificação

- [ ] 3.1 Preparação de verdade (download do llama.cpp e do Qwen3 base) e demo no modo ensaio: jogo servido pela porta 8080, charada e veredito gerados pelo modelo real por *streaming*, CORS da porta 8081 conferido, tokens/s no painel; capturas a 1366×768 em `docs/capturas/`
- [ ] 3.2 `Conferir Desenha Aí.bat` nesta máquina: resultado registrado em `docs/capturas/README.md` (incluindo o aviso da voz, se continuar sem pt-BR)
- [ ] 3.3 `bash scripts/verificar.sh` verde (pytest, mypy, ruff, vitest, lint, typecheck, build) e `openspec validate --all --strict`

## Workflow follow-up

- Quando o notebook 3 entregar o GGUF do Zé: rodar a preparação com ele, conferir e repetir o ensaio fora do modo ensaio.
- Arquivar `jogo-web`, `bancada-do-ze` e `demo-offline` depois do ensaio com o Zé treinado.
