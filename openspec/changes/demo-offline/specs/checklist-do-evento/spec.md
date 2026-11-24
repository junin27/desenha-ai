# Spec Delta

## Purpose

Conferir, antes de abrir o estande, tudo o que pode falhar na frente do público, com um resultado claro de passou ou não passou e a ação para corrigir cada falha.

## ADDED Requirements

### Requirement: Conferência automática
`Conferir Desenha Aí.bat` SHALL verificar, nesta ordem: arquivos do manifesto (tamanho e SHA-256), portas 8080 e 8081 livres ou ocupadas pela própria demo, memória livre para o destilado, voz local pt-BR no Windows e uma fala real do Zé. Cada item SHALL aparecer como ✓, ✗ ou ⚠ (aviso), e cada ✗ ou ⚠ SHALL trazer a ação para corrigir.

#### Scenario: Arquivo corrompido
- **WHEN** o SHA-256 do GGUF do destilado não bate com o manifesto
- **THEN** o item de arquivos aparece com ✗, o nome do arquivo e a ação "rode a preparação de novo"

#### Scenario: Sem voz pt-BR
- **WHEN** o Windows não tem voz local pt-BR
- **THEN** o item de voz aparece com o aviso ⚠ e a ação explica como instalar a voz "Microsoft Maria" nas configurações de Fala do Windows

### Requirement: Fala real do Zé
A conferência SHALL pedir uma charada ao Zé destilado (subindo um servidor temporário, se a demo não estiver rodando) e exigir resposta no formato `<pensamento>`/`<resposta>` em até 25 s, mostrando os tokens/s medidos.

#### Scenario: Fala fora do formato no modo ensaio
- **WHEN** o manifesto está no modo ensaio e o Qwen3 base responde fora do formato `<pensamento>`/`<resposta>` ou sem o prefixo "Charada:"
- **THEN** o item do Zé aparece com ⚠ explicando que é esperado sem o fine-tuning, e o resultado final não é "Não pronto" por causa dele

#### Scenario: Zé respondendo
- **WHEN** o Zé devolve a charada no formato em 6 s
- **THEN** o item do Zé aparece com ✓ e os tokens/s medidos

### Requirement: Resultado final
Ao fim, a conferência SHALL dizer "Pronto para o evento" se não houver nenhum ✗ e, se houver, "Não pronto", listando os itens com ✗. O código de saída SHALL ser 0 só no primeiro caso. Itens que não impedem o jogo (voz, base × destilado e, no modo ensaio, o formato da fala) SHALL aparecer como aviso (⚠) e não impedir o "Pronto para o evento".

#### Scenario: Só avisos
- **WHEN** todos os itens passam, exceto a voz pt-BR
- **THEN** a conferência diz "Pronto para o evento" com o aviso da voz e sai com código 0

### Requirement: Checklist manual
`docs/checklist_evento.md` SHALL listar o que não dá para conferir por programa: carregador e tomada, mouse e caneta, brilho e escala da tela em 100%, Wi-Fi desligado durante o teste, placar zerado (Ctrl+Shift+Z), som do notebook e plano B (jogo sem o Zé, só com a reserva).

#### Scenario: Checklist disponível
- **WHEN** a organização abre `docs/checklist_evento.md`
- **THEN** encontra cada item com uma caixa de marcar e a ação correspondente
