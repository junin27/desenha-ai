# Spec Delta

## Purpose

Fixar o texto que entra no Zé do Rabisco e a forma de ler o que ele responde, idênticos no dataset de treino, na avaliação (Python) e no jogo (TypeScript), para o modelo receber no evento exatamente o formato em que foi treinado.

## ADDED Requirements

### Requirement: Instrução de sistema fixa
A instrução de sistema do Zé SHALL ser um texto único e versionado, o mesmo no dataset, na avaliação e no jogo: "Você é o Zé do Rabisco, locutor de rodeio goiano do jogo Desenha Aí, Sô!. Raciocine de forma curta dentro de <pensamento>...</pensamento> e responda dentro de <resposta>...</resposta>, em português, com humor caipira e respeitoso."

#### Scenario: Mesma instrução nas duas linguagens
- **WHEN** o contrato é gerado pelo Python e lido pelo TypeScript
- **THEN** a instrução de sistema é igual caractere por caractere

### Requirement: Entrada da tarefa CHARADA
A entrada SHALL ser `TAREFA: CHARADA`, `Palavra secreta: <nome da categoria em português>` e `Nível: <fácil|médio|difícil>`, em três linhas separadas por `\n`. Nível fora dessa lista SHALL gerar o erro `nivel_invalido`.

#### Scenario: Charada fácil de vaca
- **WHEN** a palavra é "vaca" e o nível é "fácil"
- **THEN** a entrada é "TAREFA: CHARADA\nPalavra secreta: vaca\nNível: fácil"

### Requirement: Entrada da tarefa VEREDITO
A entrada SHALL ter seis linhas: `TAREFA: VEREDITO`, `Desafio: <alvo>`, `Desenho concluído: <N>%`, `CNN (imagem): <top-5>`, `LSTM (traços): <top-5>` e `Ensemble: <top-5>`. Cada top-5 é a lista `nome P%`, separada por `, `, na ordem recebida. Porcentagens e fração SHALL ser arredondadas para o inteiro mais próximo, com meio para cima e tolerância: ⌊100·p + 0,5 + 10⁻⁹⌋ (sem a tolerância, 0,345 vira 34, porque em binário vale 0,34499…).

#### Scenario: Arredondamento meio para cima
- **WHEN** a fração do desenho é 0,345 e o top-5 do ensemble começa com ("vaca", 0,625)
- **THEN** a entrada contém "Desenho concluído: 35%" e "Ensemble: vaca 63%, …"

### Requirement: Entrada da tarefa PERGUNTA
A entrada SHALL ser `TAREFA: PERGUNTA` e `Visitante: <pergunta>`, com a pergunta sem espaços nas pontas e com espaços repetidos reduzidos a um. Pergunta vazia ou com mais de 200 caracteres depois da limpeza SHALL gerar o erro `pergunta_invalida`.

#### Scenario: Pergunta limpa
- **WHEN** o visitante digita "  Como a IA   sabe? "
- **THEN** a entrada é "TAREFA: PERGUNTA\nVisitante: Como a IA sabe?"

### Requirement: Leitura da fala completa
Uma fala válida SHALL conter exatamente um bloco `<pensamento>…</pensamento>` seguido de um bloco `<resposta>…</resposta>`, admitindo só espaços e quebras de linha fora deles. A leitura SHALL devolver o pensamento e a resposta sem os espaços das pontas; caso contrário, o erro `formato_invalido`.

#### Scenario: Fala válida
- **WHEN** a fala é "<pensamento> pensei </pensamento>\n<resposta>Charada: Muuu?</resposta>"
- **THEN** o pensamento é "pensei" e a resposta é "Charada: Muuu?"

#### Scenario: Texto fora das tags
- **WHEN** a fala é "Olá! <pensamento>x</pensamento><resposta>y</resposta>"
- **THEN** o resultado é o erro `formato_invalido`

### Requirement: Leitura por tarefa
Na CHARADA, a resposta SHALL começar por `Charada:` e o texto depois dele é a charada. No VEREDITO, a resposta SHALL ter a linha `VEREDITO: ACERTOU|QUASE|ERROU` seguida da linha `NARRAÇÃO: <texto>`. Na PERGUNTA, a resposta inteira é a explicação. Fora desse formato, o resultado SHALL ser o erro `formato_invalido`.

#### Scenario: Veredito lido
- **WHEN** a resposta é "VEREDITO: QUASE\nNARRAÇÃO: Ô trem, quase!"
- **THEN** o veredito é QUASE e a narração é "Ô trem, quase!"

#### Scenario: Charada sem o prefixo
- **WHEN** a resposta de uma CHARADA é "Muuu, quem sou eu?"
- **THEN** o resultado é o erro `formato_invalido`

### Requirement: Leitura progressiva durante o streaming
Para um texto ainda incompleto, a leitura progressiva SHALL informar a etapa (`pensando` enquanto `</pensamento>` não chegou, `respondendo` enquanto `</resposta>` não chegou, `completa` depois) e o texto parcial de cada bloco, sem as tags e sem pedaços de tag ainda incompletos no fim.

#### Scenario: No meio do pensamento
- **WHEN** o texto recebido até agora é "<pensamento>A vaca tem malh"
- **THEN** a etapa é `pensando`, o pensamento parcial é "A vaca tem malh" e a resposta parcial é vazia

#### Scenario: Pedaço de tag no fim
- **WHEN** o texto recebido é "<pensamento>ok</pensamento><resp"
- **THEN** a etapa é `respondendo` e a resposta parcial é vazia

### Requirement: Contrato da conversa
O Python SHALL gerar `contratos/conversa.json` com a instrução de sistema, entradas das três tarefas (incluindo os cenários desta spec e casos de erro), leituras de falas válidas e inválidas e leituras progressivas, e o TypeScript SHALL reproduzir exatamente as mesmas saídas.

#### Scenario: TypeScript reproduz o contrato da conversa
- **WHEN** os testes do app rodam sobre `contratos/conversa.json`
- **THEN** todas as entradas e leituras são idênticas nas duas linguagens
