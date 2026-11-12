# API de sincronização do Pedro Maker

Contrato que um servidor precisa seguir para guardar as fases criadas no editor do Pedro Maker e
levá-las de um aparelho para outro. O site já tem o cliente pronto
(`src/app/features/games/pedro-maker/sync/`); falta só um servidor que responda assim.

Enquanto nenhum servidor estiver configurado, nada muda: as fases continuam só no aparelho.

## Como ligar

1. Publique um servidor que implemente os três endpoints abaixo, com HTTPS e CORS liberado para o
   domínio do site.
2. Coloque o endereço base em `MAKER_SYNC_BASE_URL`, em
   `src/app/features/games/pedro-maker/config/sync.config.ts`, sem barra no fim
   (por exemplo `https://api.exemplo.com.br/pedro-maker`).
3. Publique o site de novo. Em **Pedro Maker → Configurações → Fases em outros aparelhos**, crie
   um código no primeiro aparelho e digite o mesmo código nos outros.

## Autenticação: o código de sincronização

Todo pedido leva o cabeçalho:

```http
Authorization: Bearer <código>
```

O código liga os aparelhos de uma família à mesma coleção de fases. Ele é gerado no aparelho
(`crypto.randomUUID()`), tem de 12 a 64 caracteres `[A-Za-z0-9-]` e funciona como uma senha
compartilhada:

- o servidor guarda as fases **separadas por código** e nunca mistura coleções;
- guarde apenas o hash do código, nunca o código em texto puro;
- aplique limite de tentativas por IP para dificultar adivinhação;
- responda `401` quando o código não tiver o formato válido. Um código válido ainda sem fases é uma
  coleção vazia, e não um erro: é assim que o primeiro aparelho começa.

Não há dados pessoais nas fases (só nome da fase, tema, tamanho e a lista de peças), mas trate
tudo como conteúdo de uma criança: sem rastreamento e sem compartilhar com terceiros.

## Formato de uma fase

É o mesmo `CustomLevel` gravado no aparelho:

```json
{
  "id": "fase-5b1c8f3e-8a41-4f7e-9d3b-1f2a3c4d5e6f",
  "name": "A Floresta do Pedro",
  "theme": "floresta",
  "createdAt": "2026-09-29T10:00:00.000Z",
  "updatedAt": "2026-09-29T10:42:13.512Z",
  "width": 60,
  "height": 15,
  "objects": [
    { "id": "peca-1", "type": "ground", "x": 0, "y": 12 },
    { "id": "peca-2", "type": "start", "x": 2, "y": 11 },
    { "id": "peca-3", "type": "surprise", "x": 9, "y": 8, "properties": { "contents": "coins" } },
    { "id": "peca-4", "type": "portal", "x": 56, "y": 11 }
  ],
  "completed": true,
  "bestStars": 2,
  "secretUnlocked": false
}
```

| Campo | Regras |
| --- | --- |
| `id` | Texto gerado no aparelho, único. O servidor não cria ids. |
| `theme` | `vale`, `floresta`, `caverna`, `deserto`, `gelo`, `vulcao` ou `estrelas`. |
| `createdAt`, `updatedAt` | Data ISO 8601 em UTC. **`updatedAt` decide conflitos.** |
| `width` | Inteiro de 30 a 400. |
| `height` | Inteiro de 15 a 40. |
| `objects` | Até 12 000 peças. `x`/`y` inteiros dentro da fase. Tipos em `models/level.model.ts`. |
| `bestStars` | Inteiro de 0 a 3. |
| `secretUnlocked` | Booleano. A fase secreta já foi destrancada pela porta dourada de outra fase (propriedade `secretLevel` da peça `golden-door`, com o id desta fase). Ausente vale `false`. |

O cliente limpa tudo o que recebe (peça desconhecida some, fase com tamanho impossível é
descartada), mas o servidor também deve validar antes de gravar e recusar com `400` o que não
seguir a tabela. Limite o corpo do pedido a 2 MB.

## Endpoints

### `GET /levels?since=<data ISO>`

Mudanças da coleção depois de `since`. Sem `since`, devolve a coleção inteira.

```json
{
  "levels": [ { "...": "fases criadas ou alteradas depois de since" } ],
  "deleted": [ { "id": "fase-...", "deletedAt": "2026-09-29T11:00:00.000Z" } ],
  "serverTime": "2026-09-29T12:00:00.000Z"
}
```

- `serverTime` é **obrigatório**: o cliente o usa como `since` da próxima busca. Use o relógio do
  servidor, nunca o do aparelho.
- Compare `since` com o momento em que o servidor **gravou** a mudança, e não com o `updatedAt`
  da fase: um aparelho que ficou dias desconectado envia fases com `updatedAt` antigo, e elas
  ainda precisam chegar aos outros aparelhos.
- `deleted` lista as exclusões registradas depois de `since`. Guarde essas marcas por pelo menos
  90 dias.

### `PUT /levels/{id}`

Cria ou atualiza uma fase. O corpo é a fase inteira, e o `id` do corpo tem de ser igual ao da URL.

| Situação | Resposta |
| --- | --- |
| Fase nova, ou `updatedAt` do corpo ≥ o guardado | `200` com a fase como ficou gravada |
| O servidor já tem uma versão com `updatedAt` **mais novo** | `409` com `{ "level": <versão do servidor> }` |
| Corpo inválido | `400` |

No `409` o cliente substitui a fase local pela do servidor: a versão mais nova vence, venha de onde
vier. Se a fase tinha sido excluída, um `PUT` com `updatedAt` posterior à exclusão a traz de volta.

### `DELETE /levels/{id}?deletedAt=<data ISO>`

Exclui a fase e registra a marca de exclusão com `deletedAt`.

- `204` quando excluiu.
- `404` quando a fase não existe; o cliente trata como sucesso.
- Se a fase guardada tiver `updatedAt` **posterior** a `deletedAt`, ela foi editada em outro
  aparelho depois da exclusão: mantenha a fase, não registre a exclusão e responda `204` mesmo
  assim.

## Como o cliente se comporta

- Toda mudança local (salvar, duplicar, excluir, vencer a fase) entra numa **caixa de saída** no
  `localStorage`, que sobrevive a abas fechadas e a dias sem internet.
- Uma rodada sempre **envia primeiro** (a caixa de saída, na ordem) e **busca depois**.
- Na primeira rodada com um código novo, todas as fases do aparelho são enviadas e a coleção
  inteira é buscada.
- As rodadas começam sozinhas: três segundos depois de uma mudança, ao abrir as telas do jogo e
  quando a internet volta. Há também o botão "Sincronizar agora".
- Uma falha não apaga nada. A caixa de saída fica como está, a tela mostra o motivo e a próxima
  rodada tenta de novo.
- Todo pedido espera no máximo 10 segundos.

## Exemplo de sequência

```text
Tablet (código K)                       Servidor                         Celular (código K)
-----------------                       --------                         ------------------
salva "Castelo"   ── PUT /levels/f1 ──▶ grava f1 (t=10:00)
                  ── GET /levels ─────▶ { levels:[f1], serverTime:10:00 }
                                                          ◀── GET /levels ── abre o jogo
                                        { levels:[f1], serverTime:10:05 } ─▶ grava f1
                                                          ◀── PUT /levels/f1 ── edita (updatedAt 10:07)
                                        grava f1 (10:07)
                  ── GET ?since=10:00 ▶ { levels:[f1 de 10:07] }
grava f1 de 10:07
```
