# Tasks

## 1. Aplicação: portas e partida (TDD com dublês)

- [x] 1.1 Portas e dublês (`ClassificadorFalso`, `NarradorFalso`, `PlacarEmMemoria`, `RelogioFalso`, `SorteadorFixo`) e teste de arquitetura verde com a nova camada
- [x] 1.2 `Partida` — etapas, nome inválido e categorias sem repetição: testes → implementar
- [x] 1.3 Charada com reserva (falha, demora, formato inválido, vazamento): testes → implementar
- [x] 1.4 Tempo do desenho, vitória antecipada, botão Pronto e rodada sem traço: testes com o `RelogioFalso` → implementar
- [x] 1.5 Veredito e pontos pela regra, discordância do Zé e narração-modelo: testes → implementar
- [x] 1.6 Fim da partida gravando no placar: teste da partida completa (135 + 30 + 0 = 165) → implementar

## 2. Infraestrutura (TDD)

- [x] 2.1 `PlacarLocalStorage`: testes de persistência, dados corrompidos e zerar → implementar
- [ ] 2.2 `ReservaDeArquivo` + narrações-modelo (D6): testes de coerência com o veredito → implementar
- [ ] 2.3 `NarradorLlamaServer`: testes com `fetch` falso (corpo do pedido, SSE em pedaços, leitura progressiva, servidor desligado, 25 s, tokens/s) → implementar
- [ ] 2.4 Instalar `onnxruntime-web` (e `onnxruntime-node` só para testes); `ClassificadorOnnx` com sessões injetadas: teste de paridade com `teste_paridade_redes.json` do ensaio local (pulado sem os modelos) → implementar
- [ ] 2.5 Palpite mais recente vence e limite de 250 ms durante o traço: testes → implementar

## 3. Apresentação e composição

- [ ] 3.1 Canvas com Pointer Events (mouse/toque/caneta), botão Limpar e conversão para traços: testes com happy-dom → implementar
- [ ] 3.2 Telas por etapa (início com aviso de paridade e placar, charada ao vivo, desenho com cronômetro e top-3, veredito, fim): testes do essencial → implementar
- [ ] 3.3 `main.ts` (composição), CSS legível (≥ 24 px) e `scripts/copiar_modelos.sh`; atalho Ctrl+Shift+Z para zerar o placar
- [ ] 3.4 Autoteste de paridade ao abrir, com o aviso "Redes divergentes do treino"

## 4. Verificação no navegador e build

- [ ] 4.1 `npm run build` + teste que varre o `dist/` em busca de `http(s)://` externos (spec "Build sem endereços externos")
- [ ] 4.2 Abrir o build no painel de navegador com os modelos do ensaio local: jogar uma partida sem o `llama-server` (reserva) e tirar capturas a 1366×768 e 1920×1080
- [ ] 4.3 `bash scripts/verificar.sh` verde e `openspec validate --all --strict`

## Workflow follow-up

- Testar com o `llama-server` real e o GGUF do Zé na change `demo-offline`.
- Change `bancada-do-ze` em seguida (voz, Pergunte ao Zé, base × destilado, painel técnico).
