# Cadastro do projeto (formulário oficial, prazo 27/11/2026)

Depois do prazo, título, tema e escopo não podem mudar. O texto abaixo descreve só o que já está implementado e testado.

## Campos do formulário (os mesmos da planilha "PROJETOS VALIDADOS - 24_11")

| Campo | O que pôr |
|---|---|
| Endereço de e-mail | o e-mail **institucional** (`…@academico.unirv.edu.br`): todos os aprovados usaram esse domínio |
| Nome completo do acadêmico 1 | nome completo |
| Nome completo do acadêmico 2 | em branco (projeto individual) |
| Disciplinas Cursadas pelo Acadêmico (s) | **Redes Neurais** e **Pequenos Modelos de Linguagem e IA Corporativa (TES 2)**, com esses nomes exatos |
| Título do projeto | ver abaixo |
| Breve descrição do projeto | ver abaixo |

**Título**

> Desenha Aí, Sô!: redes neurais que adivinham seu rabisco e um SLM caipira que julga e narra

**Breve descrição**

> Jogo interativo em que o visitante resolve uma charada criada por um Small Language Model e desenha a resposta em 20 segundos. Uma CNN, que vê o desenho como imagem, e uma LSTM, que lê a sequência de traços, foram treinadas no Google Quick, Draw! e tentam reconhecer o rabisco em tempo real, enquanto ele é feito. O Zé do Rabisco, um Qwen3-1.7B treinado por destilação de um LLM maior e ajustado com QLoRA, julga o desenho a partir das probabilidades das redes, narra como um locutor de rodeio goiano e responde perguntas do público. Tudo roda offline num notebook comum, sem placa de vídeo, com o modelo quantizado em 8 bits (GGUF Q8_0). No workshop, os visitantes jogam e veem as redes e o SLM trabalhando ao vivo.

## Padrão da planilha de 24/11 (verde = aprovado, vermelho = reprovado)

- **Os 7 projetos distintos foram aprovados**; nenhum foi barrado pelo conteúdo, inclusive um com SLM destilado (Qwen3-0.6B) parecido com o nosso.
- **Os 5 vermelhos são repetições:** 3 são o segundo integrante da dupla enviando o mesmo projeto (o primeiro envio ficou verde) e 2 são uma dupla que usou o título "Jokenpô Neural", já aprovado para outra aluna.
- Conclusão: **um envio só por projeto** e **título que ninguém usou**. O nosso é único.
