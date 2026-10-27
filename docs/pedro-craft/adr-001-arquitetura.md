# ADR 001 — Arquitetura do PedroCraft

- **Status:** aceita
- **Data:** 2026-10-27
- **Demanda:** [pedro-craft](../demandas/pedro-craft.md)

## Contexto

O PedroCraft é o quarto jogo 3D do site. Ele precisa:
- rodar bem num tablet;
- ser seguro para uma criança;
- deixar o conteúdo e o estado prontos para um backend que ainda não existe.

Os outros jogos (Pedro Maker, Pedro Kart e Pedro Flash) já resolveram vários problemas:
relógio em passo fixo, texturas pintadas em código, qualidade adaptativa, áudio sintetizado
e liberação da placa de vídeo. Eles também têm uma convenção estabelecida: um jogo novo
importa direto os módulos do Pedro Maker quando a peça serve.

## Decisões

### D1 — Conteúdo é dado, não código

Blocos, itens, receitas, criaturas, plantações, mundo, tabelas de drop e missões ficam em
oito JSON em `public/data/pedro-craft/`:
- cada arquivo tem `schemaVersion` e o seu JSON Schema em `docs/pedro-craft/schemas/`;
- referências entre arquivos são feitas sempre por id de texto em kebab-case;
- até as texturas são dados: um padrão (`speckle`, `planks`, `ore`…) com cores. Um bloco
  novo pode nascer só no JSON, sem desenhar nada no código.

O código de jogo nunca lê JSON cru. Parsers puros validam cada arquivo e uma checagem de
integridade referencial roda na carga. Se algo estiver errado, a carga falha com uma
mensagem que cita o arquivo e o id.

### D2 — Portas trocáveis para o servidor

O PedroCraft segue o mesmo padrão do `LevelSyncGateway` do Pedro Maker. Há duas portas:

| Porta | Adaptador de hoje | Adaptador futuro |
| --- | --- | --- |
| `CraftContentGateway` | `StaticCraftContentGateway`, com `fetch` dos JSON estáticos | REST (`GET /craft/content`) |
| `WorldSaveGateway` | IndexedDB, no store `craft-worlds` | REST com resolução por `updatedAt` |

Trocar o adaptador não toca em nenhuma regra de jogo. O contrato está em
[`docs/pedro-craft-api.md`](../pedro-craft-api.md).

### D3 — Mundo num único `Uint8Array`

O mundo é pequeno: 96 × 96 × 48 = 442.368 células, cerca de 432 KB. Um vetor único é mais
simples e mais rápido que um vetor por chunk. Os chunks de 16 × 16 colunas existem só para
a malha 3D, e apenas o chunk alterado tem a malha refeita.

Os ids numéricos dos blocos são atribuídos na carga do catálogo e nunca saem do motor. O
save usa o id de texto.

### D4 — O save guarda só diferenças

A geração é determinística por semente. O `WorldSave` guarda:
- a semente;
- os blocos alterados por chunk;
- as plantações, os baús e as fornalhas;
- os animais;
- o herói e o relógio.

A água corrente não é salva. Ela é recalculada a partir das fontes ao carregar o mundo.

Cada versão do save tem uma migração (`migrateWorldSave`). Um save que não tem conserto é
recusado sem derrubar a tela.

### D5 — Simulação pura e render separado

`engine/simulation/` não importa three.js nem o DOM. Física, quebra, colocação, água,
plantações, criaturas e combate são testados em Jasmine puro. O render só lê o estado. A
entrada chega como um único `CraftInput`, venha ela do teclado, do mouse ou do toque.

### D6 — Luz sem propagação por bloco

Não há luz calculada bloco a bloco. O volume vem de:
- sombra nos cantos (oclusão de ambiente) gravada nos vértices;
- brilho fixo por direção da face;
- luz ambiente que acompanha o dia e a noite.

As tochas acendem pontos de luz só nas mais próximas do herói. A noite é azulada e
enxergável de propósito: escuridão total assusta.

### D7 — Telas de inventário pausam o mundo

Com o inventário, a mesa, a fornalha ou o baú abertos, o mundo para. A criança pode pensar
sem ser atacada, e a tela mexe no estado da simulação de forma síncrona, sem corrida.

### D8 — Reuso do Pedro Maker

Do Pedro Maker vêm:
- `GameLoop`, `SeededRandom` e os utilitários de canvas;
- `disposeTree`, a qualidade adaptativa e `buildBoxesGeometry`;
- `MakerAudioService` e o herói escolhido em `MakerProgressService`.

Nada é copiado: o PedroCraft importa direto, como o Pedro Kart e o Pedro Flash já fazem.

## Consequências

- Um backend futuro nasce lendo os schemas e o contrato da API, sem ler o frontend.
- Sem luz por bloco, uma caverna fechada não fica escura. Para uma criança, isso é uma
  vantagem.
- O mundo tem tamanho fixo. Aumentá-lo exige trocar o vetor único por chunks esparsos. Os
  pontos de troca são `world/voxel-world.ts` e o mesher.
