# Pitch (2 a 3 minutos, na bancada)

> Fale enquanto o visitante joga: o jogo é a demonstração. Em negrito, a frase-chave de cada parte.

**0:00 · Gancho (convide para jogar)**
"Bora desenhar? O Zé do Rabisco vai te dar uma charada, você tem 20 segundos pra desenhar a resposta, e a inteligência artificial tenta adivinhar **enquanto você desenha**."

**0:20 · Enquanto desenha (Redes Neurais)**
"Tá vendo essas barrinhas mudando? São duas redes neurais olhando o mesmo desenho de jeitos diferentes. A **CNN** vê como uma foto de 28 por 28 pixels. A **LSTM** lê a ordem dos seus traços, como quem lê uma frase. Por isso ela consegue chutar antes de você terminar. Juntas, elas acertam **94,7%** dos desenhos de teste. E dá pra desenhar no ar: se você escolher o modo Mão, a webcam acha 21 pontos da sua mão e o indicador vira lápis, tudo aqui no notebook."

**0:50 · Veredito (SLM)**
"Agora o Zé julga. Ele é um modelo de linguagem pequeno, o Qwen3 de 1,7 bilhão de parâmetros, que eu ensinei com um modelo grande, o Gemini, como professor. É a **destilação de conhecimento**. Ele lê as probabilidades das redes e decide se você acertou, quase acertou ou errou. Depois narra igual locutor de rodeio."

**1:20 · O pulo do gato (quantização e offline)**
"Detalhe: está tudo rodando **aqui no notebook, sem internet e sem placa de vídeo**. Em 16 bits o Zé ocuparia 3,4 GB; comprimido em **8 bits** ele cabe em 1,8 GB. Isso é a quantização. Eu testei 4 bits também, mas ele perdia o formato do jogo, então ficamos com 8."

**1:45 · Prova de que o treino funcionou (bancada)**
Aperte F2 (painel técnico) ou troque para o Qwen3 base: "Olha o modelo antes do treino: ele nem segue o formato do jogo. Depois do fine-tuning com QLoRA, o Zé acerta **100%** dos vereditos do teste (46 exemplos que ele nunca viu) e segue o formato do jogo em todos. O base errava todos os vereditos."

**2:10 · Fechamento**
"Quer perguntar alguma coisa pro Zé sobre como ele funciona? Pode digitar ali. E se gostou, vota na gente!"

## Perguntas prováveis

- **"Isso é o ChatGPT?"** — Não: é um modelo aberto de 1,7 bilhão de parâmetros (o ChatGPT tem centenas de bilhões), rodando local e treinado só para este jogo.
- **"Como sabe que acertou?"** — A regra é fixa: se o 1º palpite das redes é o desenho pedido, acertou; se está entre os 3 primeiros, quase. O Zé só narra, e a pontuação sempre segue a regra.
- **"Por que confunde vaca com cachorro?"** — Animais de quatro patas desenhados em 20 segundos ficam parecidos; é a confusão mais comum na matriz de confusão (10,8%).
- **"Quanto tempo levou para treinar?"** — Redes: cerca de 30 min na GPU do Colab. Zé: cerca de 6 minutos na T4 (mas foram várias rodadas até acertar).

## Se algo falhar no estande
O jogo continua sem o Zé: entram charadas e narrações de reserva (o painel F2 mostra isso). Diga: "O Zé tirou um cochilo, mas as redes seguem trabalhando."
