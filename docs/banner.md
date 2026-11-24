# Conteúdo do banner

> O enunciado exige seguir **rigorosamente o modelo padrão do professor**. O template ainda não está no projeto; este texto segue as seções pedidas (contextualização, arquitetura, dados e treinamento, resultados e conclusões) e deve ser encaixado no layout oficial. Os números são dos resultados reais em `notebooks/resultados/`. **[PENDENTE]** marca o que depende da rodada completa do notebook 3.

## Título
**Desenha Aí, Sô!** — Redes Neurais que adivinham seus rabiscos e um SLM caipira que julga
Gilberto Aparecido Dias Junior · Engenharia de Software · UniRV · Prof. Sandro Silva Moreira

## 1. Contextualização
O visitante resolve uma charada, desenha a resposta em 20 segundos e duas redes neurais tentam reconhecer o desenho **enquanto ele é feito**. Um Small Language Model, o **Zé do Rabisco**, cria a charada, julga o resultado e narra como um locutor de rodeio. A pergunta de pesquisa é: **imagem ou sequência, quem entende melhor um rabisco, e quem adivinha mais cedo?** E, do lado do SLM: um modelo pequeno, destilado de um grande, consegue rodar sem internet num notebook comum?

## 2. Arquitetura
- **CNN residual** (680 mil parâmetros): vê o desenho como imagem 28×28.
- **LSTM bidirecional** com Conv1D (666 mil parâmetros): lê a sequência de traços (Δx, Δy, fim do traço).
- **Ensemble:** média das duas, com o peso escolhido na validação (w_cnn = 0,5).
- **Zé do Rabisco:** Qwen3-1.7B (2,03 bilhões de parâmetros) com adaptadores LoRA (r = 16; 17,4 milhões de parâmetros treináveis, 0,86% do modelo), quantizado em GGUF Q4_K_M e servido pelo llama.cpp.
- **Tudo offline:** redes no navegador (ONNX), SLM em CPU. O mesmo pré-processamento e o mesmo prompt existem em Python (treino) e em TypeScript (jogo), garantidos por testes de contrato.

## 3. Dados e treinamento
- **Redes:** Google Quick, Draw! (CC BY 4.0), 30 categorias, 9.000 desenhos reconhecidos por categoria (210 mil para treino, 30 mil para validação e 30 mil para teste). Metade de cada lote usa desenhos incompletos (30 a 90% dos traços) para ensinar a adivinhar cedo.
- **Dataset destilado do Zé:** Teacher Gemini com Chain-of-Thought (`<pensamento>`/`<resposta>`) e Evol-Instruct (12 perguntas-semente → 81 perguntas). Foram 501 pedidos e **455 amostras aprovadas** por curadoria verificável: 161 charadas, 218 vereditos (feitos sobre as saídas **reais** das redes) e 76 respostas a visitantes. As rejeições foram 26 por formato, 15 por veredito errado, 3 charadas que entregavam a resposta, 1 recusa e 1 número inventado.
- **Fine-tuning:** QLoRA no Unsloth (4 bits NF4), perda só na resposta, 5 épocas. **[PENDENTE: dados da rodada completa]**

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

**Zé do Rabisco:**
- **Quantização (conta da atividade 1):** em FP16 o modelo ocuparia 4,06 GB e não cabe nos 2,8 GB livres; em 4 bits o arquivo real tem **1,11 GB** (cabe, com 1,7 GB de margem).
- **No ensaio** (10 passos, não vale como resultado final), a perplexidade na validação caiu de 88,4 para 14,2.
- **Base × destilado no teste** (formato, charada sem vazar, veredito correto, resposta sem número inventado): **[PENDENTE: rodada completa]**
- **Velocidade no notebook do estande:** ~12 a 13 tokens/s (medida com o Qwen3 base; **[PENDENTE: medir com o Zé treinado]**).

## 5. Conclusões
- Imagem e sequência se complementam: o ensemble supera as duas redes sozinhas, e os erros que sobram são entre desenhos parecidos (animais de quatro patas, casa × celeiro).
- A LSTM, que lê a ordem dos traços, permite palpites antes do desenho terminar: é o efeito que o público vê no jogo.
- A destilação com curadoria verificável (regras testadas por código) gerou um dataset confiável sem anotação humana; a quantização em 4 bits leva o SLM para um notebook sem GPU e sem internet. **[PENDENTE: confirmar com o critério de aprovação do Zé]**
- Engenharia: especificação (OpenSpec), TDD, mais de 800 testes automatizados e contratos entre Python e TypeScript.

**QR code sugerido:** github.com/junin27/desenha-ai
