# Proposal

## Why

O Zé do Rabisco (Qwen3-1.7B) só fará bem os três trabalhos do jogo (criar charadas, julgar o desenho e responder visitantes) se for ajustado com um dataset destilado de um LLM maior (Teacher). Esse dataset precisa de curadoria **verificável** (a charada não pode entregar a resposta, o veredito tem de seguir a regra do jogo, a explicação não pode inventar números). Além disso, o formato da conversa — o texto que entra no modelo e a fala que sai — tem de ser **idêntico** no treino, na avaliação (Python) e no jogo (TypeScript). Caso contrário, o modelo recebe no evento um formato que nunca viu. Hoje esse formato só existe solto no rascunho do notebook 2, e o jogo ainda não tem nenhuma versão dele.

**Disciplina:** SLM (destilação Teacher → Student, Evol-Instruct, Chain-of-Thought, curadoria, ShareGPT/ChatML). Os casos de VEREDITO usam as saídas reais das redes neurais (Redes Neurais).

## What Changes

- **Formato da conversa com o Zé** (Python e TypeScript, com contrato): instrução de sistema fixa, texto de entrada de cada tarefa (CHARADA, VEREDITO e PERGUNTA), leitura da fala (`<pensamento>`/`<resposta>`), extração da charada, do veredito e da narração, e leitura progressiva durante o *streaming*.
- **Geração do dataset**: ficha técnica (base de fatos), pedidos ao Teacher em lotes, Evol-Instruct (*in-depth* e *in-breadth*) para as perguntas, casos de VEREDITO a partir de `predicoes_validacao.json`, *checkpoint* para retomar a geração e uma porta `Teacher` com adaptadores Gemini e Groq.
- **Curadoria verificável**, com códigos de rejeição, reparos de Markdown e emoji e desduplicação.
- **Exportação**: separação estratificada em treino, validação e teste, formatos ShareGPT e ChatML, relatório de métricas e charadas de reserva para o modo *offline* do jogo.
- **Notebook 2** regenerado para só orquestrar.

### Fora do escopo

- Fine-tuning, avaliação base × destilado e exportação GGUF: change `fine-tuning-do-ze`.
- Chamada ao llama.cpp e a interface do jogo: change `jogo-web` (aqui entra só o domínio da conversa em TypeScript).
- Destilação por logits (KL): inviável, porque a API do Teacher não expõe logits (D-07).
- Avaliação humana ou por LLM-juiz da qualidade do humor.

## Capabilities

### New Capabilities

- `conversa-com-o-ze`: define o texto de entrada de cada tarefa e como a fala do Zé é lida, de forma idêntica em Python e TypeScript.
- `dataset-do-ze`: gera, cura e exporta o dataset destilado de treino do Zé, com regras verificáveis e critérios mínimos de volume.

### Modified Capabilities

(nenhuma)

## Impact

- **Novo código Python:** `ml/src/desenha_ml/{conversa,ficha_tecnica,teacher,teacher_apis,geracao_dataset,curadoria,exportacao_dataset}.py`.
- **Novo código TypeScript:** `app/src/domain/ze/conversa.ts`.
- **Contrato:** `contratos/conversa.json`.
- **Dependências:** extra opcional `teacher = ["google-genai", "groq"]`, só para o notebook.
- **Execução:** a geração chama a API do Teacher com a chave do usuário (Colab Secrets ou variável de ambiente) e faz cerca de 110 chamadas, dentro do *free tier*.
- **Usa da change `treino-das-redes`:** `predicoes_validacao.json` e `metricas_redes.json`. Sem eles, os casos de VEREDITO são sintéticos e a ficha técnica fica sem os números de acurácia.
