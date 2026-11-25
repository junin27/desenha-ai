# Conteúdo do banner

> O enunciado exige seguir **rigorosamente o modelo padrão do professor**. O template ainda não está no projeto; este texto segue as seções pedidas (contextualização, arquitetura, dados e treinamento, resultados e conclusões) e deve ser encaixado no layout oficial. Os números são dos resultados reais em `notebooks/resultados/` (redes em `modelos_redes/`; Zé na rodada v7, em `rodada5/`). Atualizado em 25/11/2026, com o Zé v7 aprovado no critério oficial.

## Título
**Desenha Aí, Sô!** — Redes Neurais que adivinham seus rabiscos e um SLM caipira que julga
Gilberto Aparecido Dias Junior · Engenharia de Software · UniRV · Prof. Sandro Silva Moreira

## 1. Contextualização
O visitante resolve uma charada, desenha a resposta em 20 segundos e duas redes neurais tentam reconhecer o desenho **enquanto ele é feito**. Um Small Language Model, o **Zé do Rabisco**, cria a charada, julga o resultado e narra como um locutor de rodeio. A pergunta de pesquisa é: **imagem ou sequência, quem entende melhor um rabisco, e quem adivinha mais cedo?** E, do lado do SLM: um modelo pequeno, destilado de um grande, consegue rodar sem internet num notebook comum?

## 2. Arquitetura
- **CNN residual** (680 mil parâmetros): vê o desenho como imagem 28×28.
- **LSTM bidirecional** com Conv1D (666 mil parâmetros): lê a sequência de traços (Δx, Δy, fim do traço).
- **Ensemble:** média das duas, com o peso escolhido na validação (w_cnn = 0,5).
- **Zé do Rabisco:** Qwen3-1.7B (1,72 bilhão de parâmetros) com adaptadores LoRA (r = 16; 17,4 milhões de parâmetros treináveis, 1,01% do modelo), quantizado em GGUF Q8_0 (8 bits, 1,83 GB) e servido pelo llama.cpp.
- **Desenho no ar (opcional):** o MediaPipe Hand Landmarker, uma rede de visão computacional pronta (não treinada por nós), acha 21 pontos da mão na webcam: indicador desenha, mão fechada apaga e mão aberta parada limpa. Roda no navegador e a imagem da câmera nunca sai do computador.
- **Tudo offline:** redes no navegador (ONNX), SLM em CPU. O mesmo pré-processamento e o mesmo prompt existem em Python (treino) e em TypeScript (jogo), garantidos por testes de contrato.

## 3. Dados e treinamento
- **Redes:** Google Quick, Draw! (CC BY 4.0), 30 categorias, 9.000 desenhos reconhecidos por categoria (210 mil para treino, 30 mil para validação e 30 mil para teste). Metade de cada lote usa desenhos incompletos (30 a 90% dos traços) para ensinar a adivinhar cedo.
- **Dataset destilado do Zé:** Teacher Gemini com Chain-of-Thought (`<pensamento>`/`<resposta>`) e Evol-Instruct (12 perguntas-semente → 81 perguntas). Foram 501 pedidos e **455 amostras aprovadas** por curadoria verificável: 161 charadas, 218 vereditos (196 sobre saídas **reais** das redes e 22 sintéticos, para cobrir casos raros) e 76 respostas a visitantes. As rejeições foram 26 por formato, 15 por veredito errado, 3 charadas que entregavam a resposta, 1 recusa e 1 número inventado. O treino usou a versão revisada do dataset (363 amostras para treino, 46 para validação e 46 para teste), com o veredito vindo da regra e sem a palavra secreta no raciocínio da charada.
- **Fine-tuning:** QLoRA no Unsloth (modelo-base em 4 bits NF4), perda só na resposta, 5 épocas, **6,4 minutos** numa T4 do Colab. A versão final (v7) veio depois de rodadas reprovadas: corrigimos o *packing* do treino (o modelo não aprendia a parar a fala), o veredito passou a vir da regra e as charadas deixaram de citar a palavra secreta.

## 4. Resultados
**Redes (conjunto de teste, 30 mil desenhos):**

| | Acurácia | F1 macro | Top-3 |
|---|---|---|---|
| CNN | 92,4% | 0,924 | 98,8% |
| LSTM | 92,8% | 0,928 | 98,9% |
| **Ensemble** | **94,7%** | **0,947** | **99,3%** |

- **Quem adivinha mais cedo:** com 50% do desenho feito, o ensemble já acerta 78,6%; com 80%, acerta 92,6%.
- **Confusões mais comuns:** cachorro → vaca (10,8%), casa → celeiro (10,3%), cachorro → cavalo (10,3%).
- **Latência em CPU:** ~5 ms por rede, por desenho.

**Zé do Rabisco — Qwen3 base × Zé destilado** (teste oficial: 46 exemplos que o treino nunca viu; Colab, 16 bits):

| | Qwen3 base | Zé destilado |
|---|---|---|
| Formato `<pensamento>`/`<resposta>` | 78,3% | **100%** |
| CHARADA (formato e sem entregar a palavra) | 0% | **100%** |
| VEREDITO igual ao da regra | 0% | **100%** |
| PERGUNTA (sem número inventado) | 62,5% | **100%** |
| Perplexidade na validação | 88,4 | **7,8** |
| Tokens por fala (média) | 179 | 127 |

- **No GGUF que roda no estande** (Q8_0, CPU), no mesmo teste: formato 100%, VEREDITO 100%, PERGUNTA 100% e CHARADA 81,2% (13 de 16: nas 3 falhas o Zé entregou a palavra, e o jogo troca essas charadas por uma de reserva). Nenhuma fala passou de 25 s (a mais longa levou 17,8 s).
- **Quantização (conta da atividade 1 × arquivos reais):** em FP16 o modelo ocuparia 3,44 GB e não cabe nos 2,8 GB livres. Em 8 bits (Q8_0) o arquivo real tem **1,83 GB** e cabe, com 0,97 GB de folga. Em 4 bits (Q4_K_M, 1,11 GB) o Zé **perdeu o formato** na validação (65,2%; veredito 22,7%): por isso o evento usa 8 bits.
- **Velocidade no notebook dos ensaios:** 11 a 13 tokens/s com o Q8_0 em CPU (12,9 no jogo, com *streaming*), primeiro token em cerca de 1,9 s.

## 5. Conclusões
- Imagem e sequência se complementam: o ensemble supera as duas redes sozinhas, e os erros que sobram são entre desenhos parecidos (animais de quatro patas, casa × celeiro).
- A LSTM, que lê a ordem dos traços, permite palpites antes do desenho terminar: é o efeito que o público vê no jogo.
- A destilação com curadoria verificável (regras testadas por código) gerou um dataset sem anotação humana, e o Zé de 1,7 bilhão de parâmetros foi de 0% para 100% em charada e veredito no teste. A quantização leva o SLM para um notebook sem GPU e sem internet, mas **tem custo**: em 4 bits o Zé perdeu o formato do jogo, e em 8 bits ele se manteve.
- **Limites:** o teste do Zé tem só 46 exemplos (22 vereditos, 16 charadas e 8 perguntas), foi consultado mais de uma vez durante as rodadas e a curva de validação estabiliza na 3ª época (sobreajuste leve nas épocas 4 e 5). Os 100% mostram que o Zé aprendeu o formato e as regras do jogo, não uma qualidade geral de linguagem.
- Engenharia: especificação (OpenSpec), TDD, mais de 1.000 testes automatizados (472 em Python e 622 em TypeScript) e contratos entre Python e TypeScript.

**QR code sugerido:** github.com/junin27/desenha-ai
