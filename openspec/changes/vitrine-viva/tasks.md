# Tasks

## 1. Desenhos da vitrine (Python + contrato)

- [x] 1.1 Teste falhando em `ml/tests/test_vitrine.py` para `escolher_desenhos_da_vitrine` (D5: acerto do ensemble ≥ 0,8, 2 a 8 traços, um por categoria, ordem estável); implementar em `desenha_ml/vitrine.py` com type hints e mypy strict
- [x] 1.2 Teste falhando para `exportar_vitrine` (formato JSON: categoria, índice da categoria, traços em pontos inteiros); implementar
- [x] 1.3 Script local `scripts/gerar_desenhos_da_vitrine.py` (em vez da célula no Colab: com o OK do usuário em 26/11, baixa por streaming só as 8 categorias e roda as mesmas redes ONNX do jogo no avaliador de referência do `onnx`), grava `notebooks/resultados/modelos_redes/vitrine_tracos.json` (versionado; `copiar_modelos.sh` leva ao jogo)
- [x] 1.4 Gerar fixture `contratos/vitrine.json` (entrada 28×28 e sequência stroke-3 de cada desenho) com `desenha_ml.contratos`; teste Python do contrato

## 2. Domínio da vitrine (TypeScript, sem DOM)

- [x] 2.1 Teste falhando `test geometria_do_portal...`: escala inicial, matrizes em u = 0 e u = 1 (identidade), recorte do círculo e do retângulo (cenários "Prévia dentro do objeto" e "Fim do portal"); implementar `domain/vitrine/portal.ts`
- [x] 2.2 Teste falhando para a lista de capítulos (11, na ordem da spec) e para a escolha do próximo desenho sem repetir o anterior; implementar `domain/vitrine/capitulos.ts`
- [x] 2.3 Teste de contrato TypeScript: `contratos/vitrine.json` bate com `rasterizar`/`sequenciar` (1e-6) para os desenhos da vitrine

## 3. Aplicação e infraestrutura

- [ ] 3.1 Teste falhando para o caso de uso de palpites por prefixo (frações 0,25/0,5/0,75/1,0; top-3 CNN, LSTM e ensemble; erro do classificador vira "sem palpites") com classificador falso; implementar
- [ ] 3.2 Teste falhando para `ResumoDaVitrine` lido das métricas (cada campo opcional; "92,4%" e "94,7%" com os valores da spec; campo ausente omitido); implementar
- [ ] 3.3 Adaptador que lê `vitrine_tracos.json` e `ficha_da_vitrine.json` com erro como valor; testes com arquivo ausente e malformado
- [ ] 3.4 Script de verificação gera `ficha_da_vitrine.json` (contagem de testes Python/TS e tamanho do GGUF); teste do formato

## 4. Base da apresentação

- [ ] 4.1 Pedir OK ao usuário e instalar `gsap@3.15.1` no app; registrar a URL do comentário de licença em `TEXTOS_DE_TERCEIROS_PERMITIDOS` com teste que prova que é só comentário; teste do build continua sem endereço externo
- [ ] 4.2 Copiar `fundo-roca-toon.mp4` para `app/public/vitrine/`; teste da distribuição confere que o arquivo existe e tem menos de 3 MB
- [ ] 4.3 Controle de entrada (rodinha, teclas, toque, autoplay em 4 s, recomeço em 10 s) com relógio falso; testes dos cenários "Avançar com a tecla", "Visitante parado", "Recomeço do modo vitrine" e "Rodinha não rola a página"
- [ ] 4.4 Motor do portal na apresentação aplicando o domínio 2.1 (medição preguiçosa D3, entrar e afastar); teste em happy-dom: ao fim do portal a cena nova tem transformação e recorte vazios

## 5. Capítulos

- [ ] 5.1 Abertura e o jogo (gota, título, roça com o Zé); teste: primeira tela é a vitrine, sem campo de apelido
- [ ] 5.2 O desenho (traço real ponto a ponto, com o crédito "Quick, Draw! · CC BY 4.0"); testes: categoria igual nos capítulos do desenho, CNN e LSTM, e "Crédito no capítulo do desenho"
- [ ] 5.3 A CNN (grade 28×28 da entrada real, filtros, palpites reais); testes "Mesma entrada" e "Palpite com o desenho completo"
- [ ] 5.4 A LSTM (sequência, células, chute por prefixo); teste "Redes indisponíveis" sem percentuais
- [ ] 5.5 O Zé (SLM), destilação, QLoRA e GGUF com números do `ResumoDaVitrine`; teste "Métrica ausente"
- [ ] 5.6 Engenharia e convite; afastamentos (hexágono do Zé, janela da casa); teste "GGUF dentro do hexágono"

## 6. Integração com o jogo

- [ ] 6.1 `tela-vitrine.ts` no lugar da abertura em `interface-do-jogo.ts`; testes "Jogar pelo convite" e "Pular a história" (apelido em até 2,2 s, foco no campo)
- [ ] 6.2 "Voltar à história" na tela de apelido vinda da vitrine; teste "Voltar ao convite"
- [ ] 6.3 Vitrine parada fora da tela (vídeo pausado, sem novas classificações); teste "Partida em andamento"
- [ ] 6.4 Movimento reduzido (corte direto, vídeo parado, sem autoplay); teste "Reduzir movimento ligado"
- [ ] 6.5 Degradação em notebook lento: medidor de quadros com relógio falso (média < 30 fps por 3 s liga corte direto e pausa o vídeo, sem parar o avanço automático); teste "Taxa baixa"
- [ ] 6.6 "Início" no placar volta à vitrine no capítulo de abertura; teste "Início depois da partida"
- [ ] 6.7 Remover `tela-abertura.ts` e testes da demonstração antiga quando a vitrine cobrir os cenários equivalentes; teste de arquitetura continua verde

## 7. Verificação no navegador

- [ ] 7.1 Build + `vite preview`: percorrer os 11 capítulos em 1366×768 e 1920×1080, medir rolagem e menor fonte (cenários "Telas do estande") e anexar capturas
- [ ] 7.2 Medir FPS entre transições e durante o portal da janela em 1366×768 nesta máquina; repetir no notebook do evento no ensaio de 29/11 (meta: ≥ 30 fps no portal) e registrar em `docs/continuacao.md`

## 8. Documentação

- [ ] 8.1 Atualizar `docs/decisoes.md` (vitrine, portal, GSAP local) e `docs/continuacao.md`

## 9. Fechamento

- [ ] 9.1 Com `visual-tinta-cinetica` arquivada (só quando o usuário pedir), adicionar a esta change o delta de `tela-de-abertura`: REMOVED "Demonstração em loop" e MODIFIED do limite de 1,2 s para 2,2 s
- [ ] 9.2 Verificação completa: `bash scripts/verificar.sh` (pytest, mypy, ruff, vitest, lint, typecheck) e `openspec validate --all --strict` verdes
