# Spec Delta

## Purpose

Detectar quando uma charada entrega a resposta, para reprovar a amostra na curadoria do dataset do SLM, medir o Zé destilado e, no jogo, trocar uma charada que vazou por uma de reserva.

## ADDED Requirements

### Requirement: Forma comparável das palavras
Antes de comparar, o texto e a palavra secreta SHALL passar pela mesma transformação: minúsculas, remoção de acentos, separação em palavras (sequências de letras e dígitos), troca de "qu" por "c" e de "gu" por "g", troca das terminações "oes", "aes" e "aos" por "ao", e troca da terminação "ois" por "ol". A troca de "qu" e "gu" cobre diminutivos como "vaquinha" e "porquinho"; a das terminações cobre plurais como "aviões" e "sóis".

#### Scenario: Acento e maiúscula não importam
- **WHEN** a palavra secreta é "Chapéu" e o texto contém "CHAPEU"
- **THEN** as duas formas comparáveis são "chapeu"

#### Scenario: Diminutivo com troca de letra
- **WHEN** a palavra é "vaquinha"
- **THEN** a forma comparável é "vacinha"

#### Scenario: Plural em ões
- **WHEN** a palavra é "aviões"
- **THEN** a forma comparável é "aviao"

#### Scenario: Plural em óis
- **WHEN** a palavra é "sóis"
- **THEN** a forma comparável é "sol"

### Requirement: Detecção de vazamento
Um texto SHALL vazar a palavra secreta quando alguma de suas palavras, já na forma comparável, for igual a uma palavra da forma comparável da secreta ou começar pela raiz dela. A raiz SHALL ser a palavra sem a última letra, com no mínimo 3 letras. Palavras da secreta com menos de 3 letras e as preposições "de", "da" e "do" SHALL ser ignoradas. A detecção é conservadora: falso positivo só troca a charada; falso negativo entrega a resposta.

#### Scenario: Palavra exata
- **WHEN** a secreta é "vaca" e o texto é "A vaca malhada dá leite"
- **THEN** há vazamento

#### Scenario: Diminutivo
- **WHEN** a secreta é "vaca" e o texto é "Quem é a vaquinha do pasto?"
- **THEN** há vazamento

#### Scenario: Plural
- **WHEN** a secreta é "avião" e o texto é "Vários aviões no céu"
- **THEN** há vazamento

#### Scenario: Palavra composta com preposição
- **WHEN** a secreta é "xícara de café" e o texto é "Serve o cafezinho da tarde"
- **THEN** há vazamento, pela palavra "café"

#### Scenario: Charada que não entrega
- **WHEN** a secreta é "vaca" e o texto é "Malhada, mansa, faz muuu e dá leite"
- **THEN** não há vazamento

#### Scenario: Falso positivo aceito
- **WHEN** a secreta é "sol" e o texto é "O soldado marchou"
- **THEN** há vazamento (comportamento conservador e esperado)

### Requirement: Contrato de vazamento
`contratos/regras.json` SHALL conter os casos de forma comparável e de vazamento (incluindo todos os cenários desta spec e, para cada uma das 30 categorias do jogo, um texto que cita a palavra no plural e precisa vazar), e o TypeScript SHALL reproduzir exatamente as mesmas saídas.

#### Scenario: TypeScript reproduz o contrato de vazamento
- **WHEN** os testes do app rodam sobre `contratos/regras.json`
- **THEN** todos os casos de vazamento dão o mesmo resultado nas duas linguagens
