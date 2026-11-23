---
paths:
  - "app/**"
---

# Regras do app (TypeScript, hexagonal)

- Camadas em `app/src/`: `domain/` (entidades e regras puras: rodada, placar, veredito, pré-processamento, parser da fala do Zé), `application/` (casos de uso e **portas**, que são interfaces), `infrastructure/` (adaptadores: ONNX, llama.cpp, contingência, localStorage), `presentation/` (DOM e canvas; só chama casos de uso). `main.ts` monta tudo.
- `domain` não importa nada de fora (nem DOM, nem `onnxruntime-web`, nem `fetch`). `application` só importa `domain`. O teste `tests/arquitetura.test.ts` reprova violações.
- Portas têm nomes do domínio (`ClassificadorDeDesenho`, `NarradorDoJogo`, `RepositorioDePlacar`, `Relogio`). Cada adaptador implementa uma porta e tem teste próprio; casos de uso são testados com dublês nomeados (`ClassificadorFalso`).
- Erros esperados retornam `Resultado<T, E>` (de `domain/resultado.ts`); exceção só para bug.
- TypeScript `strict`, `noUncheckedIndexedAccess`, sem `any`. Vitest para testes; ESLint + Prettier.
- Tudo precisa rodar **offline**: nada de CDN em tempo de execução. Bibliotecas vêm do `npm` e entram no build do Vite.
- O pré-processamento de traços tem de bater com `contratos/*.json` (gerado pelo Python): o teste de contrato não pode ser desligado.
