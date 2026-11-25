# Tasks

## 1. Domínio: gestos e limpeza (TDD, puro)

- [ ] 1.1 `domain/mao/pontos.ts` e `domain/mao/gestos.ts`: testes com pontos sintéticos (indicador esticado → `lapis`; mão fechada → `borracha`; cinco esticados → `mao_aberta`; outra forma → `nenhum`; polegar solto não atrapalha o `lapis`) → implementar. Verifica: `npm --prefix app test -- gestos`
- [ ] 1.2 `EstabilizadorDeGesto`: testes (só troca após 3 quadros iguais; um quadro ruidoso não troca) → implementar. Verifica: `npm --prefix app test -- gestos`
- [ ] 1.3 `domain/mao/limpeza.ts`: testes (3 s parada dispara; 2 s e depois anda 10% zera; trocar de gesto zera; fração do anel) → implementar. Verifica: `npm --prefix app test -- limpeza`
- [ ] 1.4 `domain/mao/coordenadas.ts`: testes (espelhamento do X; margem de 15% mapeia para as bordas do quadro; suavização α = 0,5; centro da palma) → implementar. Verifica: `npm --prefix app test -- coordenadas`

## 1B. Lápis, partículas, som e painel (modo Mouse primeiro)

- [ ] 1B.1 `domain/desenho/balde.ts`: testes de `preencherArea` (pinta a área fechada e não vaza para fora; tolera a borda suavizada; mesma cor não faz nada) → implementar. Verifica: `npm --prefix app test -- balde`
- [ ] 1B.2 `presentation/lapis/desgaste.ts` e `presentation/lapis/particulas.ts` (puros): testes do desgaste (encurta com a distância, para no mínimo e continua; volta inteiro) e da física (gravidade, quique, assentada não muda de posição e só desbota; limite de 600 desbota as antigas) → implementar. Verifica: `npm --prefix app test -- desgaste particulas`
- [ ] 1B.3 `presentation/lapis/lapis-no-quadro.ts`: SVG próprio por ferramenta (lápis de cor, borracha virada, balde, conta-gotas) com a ponta no ponto; some fora do quadro; testes em jsdom da posição da âncora e da ferramenta mostrada. Verifica: `npm --prefix app test -- lapis-no-quadro`
- [ ] 1B.4 `presentation/lapis/som-do-desenho.ts` atrás de uma interface (`SomDoDesenho`), com dublê nos testes: toque ao encostar, volume pela velocidade, silêncio ao parar, desligado não toca; preferência salva. Verifica: `npm --prefix app test -- som-do-desenho`
- [ ] 1B.5 Captura com cor e espessura por traço e as três camadas (pintura, traços, partículas); painel com ferramentas, espessuras, 16 cores e cor atual; balde e conta-gotas; testes da tela de desenho (começo da rodada com Lápis/média/tinta; traço vermelho manda os mesmos pontos; borracha não apaga a pintura; conta-gotas volta ao Lápis). Verifica: `npm --prefix app test -- tela-desenho paleta`
- [ ] 1B.6 Conferência no navegador (modo Mouse): desenhar, colorir, balde, conta-gotas, borracha; capturas sem rolagem a 1366×768 e 1920×1080; `bash scripts/verificar.sh` verde.

## 2. Portas e adaptadores

- [ ] 2.1 Portas `DetectorDeMao` e `CameraDoEstande` em `application/portas.ts`; teste de arquitetura continua verde. Verifica: `npm --prefix app test -- arquitetura`
- [ ] 2.2 Baixar `@mediapipe/tasks-vision` (npm) e o `hand_landmarker.task` (download autorizado); script de cópia para `app/public/mao/` integrado ao `copiar_modelos.sh`; teste de build: wasm e modelo no `dist`, nada carregado de fora (lista fechada atualizada se preciso). Verifica: `npm --prefix app run build && npm --prefix app test -- build`
- [ ] 2.3 `infrastructure/mao/detector-mediapipe.ts` e `camera-do-navegador.ts`: teste do adaptador da câmera com `getUserMedia` falso (permissão negada vira erro esperado, não exceção; desligar para as trilhas) → implementar; o detector real é conferido no navegador (tarefa 5.1). Verifica: `npm --prefix app test -- camera`

## 3. Captura e controle da mão

- [ ] 3.1 `CapturaDoDesenho` com a interface de fonte (começar, continuar, terminar, apagar em): os testes atuais continuam verdes e um teste novo prova que traços vindos da fonte da mão saem iguais aos do mouse. Verifica: `npm --prefix app test -- captura`
- [ ] 3.2 `presentation/mao/controle-da-mao.ts` com `DetectorFalso` e relógio falso: `lapis` desenha e termina o traço ao sumir; `borracha` apaga; mão aberta parada 3 s limpa; troca de modo termina o traço e mantém os traços. Verifica: `npm --prefix app test -- controle-da-mao`

## 4. Telas

- [ ] 4.1 Seletor de modo (Mouse/Mão) na tela de apelido e na de desenho, salvo nas preferências do estande; teste: escolha lembrada após recarregar; troca durante o desenho não apaga nem pausa. Verifica: `npm --prefix app test -- seletor-de-modo`
- [ ] 4.2 Miniatura espelhada com os pontos e o nome do gesto; câmera ligada só no desenho em modo Mão; aviso "Câmera indisponível: desenhe com o mouse" e volta ao Mouse quando falha. Verifica: `npm --prefix app test -- miniatura`
- [ ] 4.3 O lápis da tarefa 1B.3 segue o dedo no modo Mão (indicador no lápis, palma na borracha e na mão aberta) e some quando a mão some. Verifica: `npm --prefix app test -- lapis-no-quadro controle-da-mao`
- [ ] 4.4 `main.ts` liga câmera, detector e controle; o CSS das peças novas passa no teste de estilo (paleta, contraste, 24 px). Verifica: `bash scripts/verificar.sh`

## 5. Conferência real

- [ ] 5.1 Na máquina com webcam: desenhar uma casa com o dedo, apagar com a mão fechada, limpar com a mão aberta parada 3 s, trocar Mouse↔Mão no meio da rodada; medir quadros por segundo com as redes ligadas (meta ≥ 10). Registrar em `docs/capturas/README.md`.
- [ ] 5.2 Capturas novas (`scripts/capturar_telas.mjs`) do modo Mouse com o lápis no quadro; nenhuma tela com rolagem; `bash scripts/verificar.sh` verde.

## Workflow follow-up

- Banner e pitch: uma linha sobre o desenho no ar (MediaPipe, 21 pontos, offline).
- Checklist da demo: liberar a câmera para `localhost` no navegador do evento.
- Arquivar esta change depois da `visual-tinta-cinetica` (as duas tocam a tela de desenho).
