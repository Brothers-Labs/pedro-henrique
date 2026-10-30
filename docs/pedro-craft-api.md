# API do PedroCraft

Contrato que um servidor precisa seguir para:

- entregar o conteúdo do PedroCraft (blocos, itens, receitas e o resto);
- guardar os mundos salvos e levá-los de um aparelho para outro.

Hoje o jogo é só frontend. O conteúdo vem dos JSON estáticos em `public/data/pedro-craft/` e
os mundos ficam no IndexedDB do aparelho. Os dois passam por portas trocáveis (ADR 001, D2).
Para ligar um servidor, basta trocar o adaptador, sem mexer em nenhuma regra de jogo:

| Porta | Adaptador de hoje | Arquivo |
| --- | --- | --- |
| `CraftContentGateway` | `StaticCraftContentGateway` (`fetch` dos JSON) | `src/app/features/games/pedro-craft/content/craft-content.gateway.ts` |
| `WorldSaveGateway` | `IndexedDbWorldSaveGateway` (store `craft-worlds`) | `src/app/features/games/pedro-craft/services/world-save.gateway.ts` |

Os formatos estão descritos em JSON Schema, em `docs/pedro-craft/schemas/`. Um backend novo
nasce lendo os schemas e este documento, sem precisar ler o frontend.

## Autenticação

Os mundos seguem o mesmo modelo de código de sincronização do Pedro Maker
(`docs/pedro-maker-sync-api.md`). Todo pedido de mundos leva o cabeçalho:

```http
Authorization: Bearer <código>
```

- o código liga os aparelhos de uma família à mesma coleção de mundos;
- tem de 12 a 64 caracteres `[A-Za-z0-9-]` e funciona como uma senha compartilhada;
- guarde só o hash do código e limite as tentativas por IP;
- responda `401` para um código fora do formato.

Um código válido e ainda sem mundos é uma coleção vazia, não um erro.

O conteúdo (`GET /craft/content`) é público e não pede código.

## Conteúdo

### `GET /craft/content`

Devolve os oito arquivos de conteúdo num objeto só. Cada chave tem o mesmo formato do arquivo
estático com o mesmo nome:

```json
{
  "blocks": { "schemaVersion": 1, "blocks": [] },
  "items": { "schemaVersion": 1, "items": [] },
  "recipes": { "schemaVersion": 1, "crafting": [], "smelting": [], "fuels": [] },
  "creatures": { "schemaVersion": 1, "creatures": [] },
  "crops": { "schemaVersion": 1, "crops": [] },
  "world": { "schemaVersion": 1 },
  "loot-tables": { "schemaVersion": 1, "lootTables": [] },
  "goals": { "schemaVersion": 1, "goals": [] }
}
```

- O cliente confere tudo com os parsers e com a checagem de integridade referencial. Uma
  referência quebrada falha a carga com uma mensagem que cita o arquivo e o id.
- Use `Cache-Control` e `ETag`: o conteúdo muda pouco.
- Ids são estáveis. Para tirar um bloco, item, bicho ou plantação, apague-o do conteúdo. Os
  mundos que o usavam são limpos no aparelho ao abrir, sem perder o resto (veja "Limpeza").

## Mundos

### O formato

Um mundo é o `WorldSave` de `docs/pedro-craft/schemas/world-save.schema.json`, o mesmo JSON
guardado no IndexedDB:

```json
{
  "version": 1,
  "id": "mundo-5b1c8f3e-8a41-4f7e-9d3b-1f2a3c4d5e6f",
  "name": "Ilha do Pedro",
  "seed": 3141592653,
  "createdAt": "2026-10-27T10:00:00.000Z",
  "updatedAt": "2026-10-27T10:42:13.512Z",
  "state": {
    "hero": { "x": 48.5, "y": 21, "z": 52.5, "yaw": 3.14, "pitch": 0, "health": 9, "selectedSlot": 0,
              "respawn": { "x": 47.5, "y": 22.5, "z": 44.5, "yaw": 0 } },
    "inventory": [{ "item": "wooden-pickaxe", "count": 1, "durability": 41 }, null],
    "clockMs": 125000,
    "goals": { "completed": ["get-wood", "make-planks"], "amount": 0 },
    "chunks": [{ "x": 3, "z": 2, "blocks": [[50, 21, 40, "oak-planks"], [51, 20, 40, null]] }],
    "plants": [{ "x": 47, "y": 21, "z": 55, "crop": "wheat", "stage": 2, "elapsedMs": 13000 }],
    "containers": [{ "x": 49, "y": 22, "z": 43, "slots": [{ "item": "wool", "count": 7, "durability": null }] }],
    "furnaces": [],
    "creatures": [{ "creature": "sheep", "x": 60.5, "y": 21, "z": 58.5, "yaw": 1.2, "health": 6,
                    "layLeftMs": null, "cooldowns": [{ "item": "shears", "leftMs": 40000 }] }]
  }
}
```

O mundo guarda só o que a semente não refaz:

- **`state: null`**: mundo recém-criado, ainda não jogado. Nasce inteiro da semente.
- **`chunks`**: só os blocos que mudaram, em coordenadas do mundo. `null` é ar. A água
  corrente não entra, porque nasce de novo das nascentes.
- **`goals.completed`**: ids das missões cumpridas, nunca a posição na lista.
- **`creatures`**: só os animais. Os inimigos voltam para casa ao fechar o mundo.
- **Preferências** (Modo Paz, controles) não fazem parte do mundo: são do aparelho.

Um mundo típico tem de dezenas a poucas centenas de kB. Recuse corpos acima de **2 MB** com
`413`.

### `GET /craft/worlds`

Lista os mundos do código, sem o `state` (a lista fica leve):

```json
[
  { "id": "mundo-5b1c…", "name": "Ilha do Pedro", "seed": 3141592653,
    "createdAt": "2026-10-27T10:00:00.000Z", "updatedAt": "2026-10-27T10:42:13.512Z" }
]
```

### `GET /craft/worlds/{id}`

Devolve o `WorldSave` completo, ou `404` se não existir.

### `PUT /craft/worlds/{id}`

Cria ou substitui o mundo. O corpo é o `WorldSave` completo, com o `id` igual ao da URL.

- **Validação:** confira o corpo contra o schema e responda `422` com a lista de problemas.
  Ids de conteúdo desconhecidos não são erro de formato: o cliente limpa ao abrir.
- **Conflito:** o mundo mais recente vence, por `updatedAt`.
  - Se o servidor já tem um `updatedAt` mais novo que o do corpo, responda `409` com o mundo
    do servidor no corpo. O cliente fica com ele.
  - Se o corpo for igual ou mais novo, grave e responda `200` com o mundo gravado.
- **Limite:** no máximo **5 mundos** por código, o mesmo limite do aparelho. Um mundo novo
  além disso recebe `409` com `{ "error": "limite-de-mundos" }`.

### `DELETE /craft/worlds/{id}`

Apaga o mundo. Responde `204`, inclusive se ele já não existia (apagar é idempotente).

## Versões e migração

- `version` é a versão do formato do mundo. Hoje é `1`.
- **Quem migra é o cliente:** cada versão nova ganha uma migração em `migrateWorldSave`
  (`src/app/features/games/pedro-craft/world/world-save.ts`), que sobe um save antigo degrau por
  degrau. O servidor guarda o JSON como recebeu e não reescreve mundo nenhum.
- Um mundo com `version` maior que a do cliente é recusado no aparelho, sem derrubar a tela. A
  criança vê o aviso e escolhe outro mundo.

## Limpeza

Ao abrir um mundo, o cliente:

- tira o que o conteúdo de hoje não conhece mais: bloco, item, bicho ou plantação removidos;
- tira posições fora do mundo;
- acerta pilhas maiores que o máximo do item.

O resto do mundo continua inteiro. Um mundo que não passa nem na leitura (JSON quebrado,
campo obrigatório faltando) aparece em "Meus mundos" como **quebrado**, com a opção de
apagar (CA04).

## Privacidade

Os mundos não têm dados pessoais, só o nome que a criança deu ao mundo e o que ela construiu.
Mesmo assim, trate tudo como conteúdo de uma criança:

- sem rastreamento;
- sem anúncios;
- sem compartilhar com terceiros;
- sem expor a lista de mundos de um código para outro código.


### Modos e capacidade dos baús

O modo **Normal** usa o identificador `adventure`, preservando mundos existentes. O novo modo `infinite` começa com as ferramentas de maior nível e um baú de suprimentos próximo ao jogador. Os baús desse modo oferecem pilhas completas de materiais, blocos e equipamentos e repõem cada item a cada retirada; ferramentas não perdem durabilidade.

Todos os baús passam de 27 para **54 espaços**. Saves antigos conservam os primeiros 27 e recebem 27 espaços vazios. O campo `mode` aceita `creative`, `adventure`, `survival` e `infinite`; o formato continua na versão 1.
