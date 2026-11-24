# Cadastro do projeto (planilha oficial, prazo 27/11/2026)

Depois do prazo, título, tema e escopo não podem mudar. O texto abaixo descreve só o que já está implementado e testado.

**Título**

> Desenha Aí, Sô! — Redes Neurais que adivinham seus rabiscos e um SLM caipira que julga

**Resumo** (curto)

> Jogo interativo em que o visitante resolve uma charada criada por um Small Language Model e desenha a resposta em 20 segundos. Uma CNN (que vê o desenho como imagem) e uma LSTM (que lê a sequência de traços) tentam reconhecer o rabisco em tempo real, enquanto ele é feito. O Zé do Rabisco, um Qwen3-1.7B destilado de um LLM maior e ajustado com QLoRA, julga o desenho a partir das probabilidades das redes, narra como um locutor de rodeio goiano (com voz) e responde perguntas do público. Tudo roda offline num notebook comum, sem placa de vídeo, graças à quantização em 4 bits.

**Disciplinas:** Redes Neurais e Small Language Models.

**Escopo registrado:** CNN e LSTM treinadas no Google Quick, Draw! (30 categorias) e executadas no navegador (ONNX); SLM Qwen3-1.7B destilado (Teacher Gemini, Evol-Instruct, Chain-of-Thought), fine-tuning QLoRA (Unsloth) e GGUF de 4 bits no llama.cpp; jogo web offline com placar, voz, "Pergunte ao Zé" e comparação do modelo base com o destilado.
