# Decisões de arquitetura

Decisões que valem para o projeto todo. Decisões de uma mudança específica ficam no `design.md` da change no OpenSpec.

| # | Data | Decisão | Por quê | Alternativas descartadas |
|---|---|---|---|---|
| D-01 | 23/11/2026 | Tema: jogo "Desenha Aí, Sô!" (CNN + LSTM + SLM narrador/juiz/criador de charadas) | Interativo, chama público na feira, integra as duas disciplinas e é original | AgroSoja (tema comum na turma), BloodMNIST (28×28 pouco atraente), espelho de emoções (privacidade, ~70% de acurácia) |
| D-02 | 23/11/2026 | Demo 100% offline em CPU; treino no Colab | Rede instável no evento; o notebook não tem GPU NVIDIA | Servidor na nuvem (depende de internet) |
| D-03 | 23/11/2026 | `ml/`: núcleo funcional + casca imperativa | Em ML quase tudo é transformação de dados; funções puras são fáceis de testar e reutilizar nos notebooks | Clean Architecture completa com portas em Python (cerimônia sem ganho aqui) |
| D-04 | 23/11/2026 | `app/`: arquitetura hexagonal em TypeScript | O valor está em trocar adaptadores (Zé base × destilado, SLM × contingência, ONNX × dublê de teste) sem tocar no domínio | MVC simples (mistura regra e DOM); React (peso desnecessário para uma tela) |
| D-05 | 23/11/2026 | Rasterização própria (cobertura por distância ao segmento, supersample 4×4) em vez de canvas/OpenCV | Fica idêntica em Python e TypeScript e é testável sem navegador; canvas e OpenCV têm antialias diferentes, o que gera diferença entre treino e jogo | Canvas no navegador + OpenCV no treino (divergência difícil de testar) |
| D-06 | 23/11/2026 | Redes no navegador via ONNX (`onnxruntime-web`), SLM via `llama-server` (llama.cpp) com GGUF Q4_K_M | Sem backend Python na demo; o Python local (3.15) não tem onnxruntime; o llama.cpp é o padrão para SLM em CPU | Backend FastAPI + PyTorch (mais peças para falhar no evento) |
| D-07 | 23/11/2026 | Destilação em nível de sequência (SFT nas saídas do Teacher com CoT) | A API do Teacher (Gemini) não expõe logits, então a perda KL nos logits é inviável | KD por logits (precisaria do Teacher local) |
| D-08 | 23/11/2026 | Pontuação do placar usa a regra determinística; a fala do Zé é avaliada contra ela | Placar justo para votação popular; a concordância Zé × regra vira métrica do SLM | Pontuação pela fala do SLM (injusta se ele errar) |
| D-09 | 23/11/2026 | Git só local até o fim; o usuário cria o repositório público depois | Pedido do usuário | — |
