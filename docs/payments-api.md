# Pagamento por Pix: planos e passes da Temporada

O site recebe dois tipos de pagamento por Pix, os dois com conferência manual: o visitante copia a
chave, paga no app do banco e anexa o comprovante.

- **Planos** (`/planos`): três assinaturas mensais.
- **Passes da Temporada do Pedro** (`/pedro-aventura/passe`): VIP e Luxo, pagos uma vez por
  temporada. Os passes também podem ser trocados por diamantes ganhos jogando; o pagamento em reais
  é a outra porta.

O cliente já está pronto (`src/app/features/plans/` e
`src/app/features/pedro-aventura/services/season-pass-purchases.service.ts`); faltam a chave Pix
e um servidor que receba os comprovantes e libere o que foi pago.

| Produto | `productType` | `productId` | Valor (`amountInCents`) |
| --- | --- | --- | --- |
| Plano Essencial | `plan` | `essencial` | `999` |
| Plano Completo | `plan` | `completo` | `1999` |
| Plano Premium | `plan` | `premium` | `2999` |
| Passe VIP | `season-pass` | `vip` | `199` |
| Passe Luxo | `season-pass` | `luxo` | `499` (`300` para quem já tem o VIP) |

Preços dos planos ficam em `src/app/core/data/plans.data.ts`; os dos passes, em
`src/app/features/pedro-aventura/config/season.config.ts`.

## Como ligar

1. Preencha `pix.key` (e, de preferência, `pix.receiverName`) em `src/environments/environment.ts`
   e `environment.development.ts`. Sem chave, o modal avisa que o pagamento ainda não está
   disponível.
2. Configure `apiUrl` e publique um servidor com os endpoints abaixo (veja também as convenções de
   `docs/auth-api.md`: HTTPS, CORS com credenciais e status em vez de texto de erro).

## `POST /payments/pix`

`multipart/form-data` com os campos:

| Campo | Conteúdo |
| --- | --- |
| `productType` | `plan` ou `season-pass` |
| `productId` | Id do produto na tabela acima |
| `planId` | Só nos planos: o mesmo valor de `productId` (contrato anterior, mantido) |
| `seasonId` | Só nos passes: a temporada paga (hoje, `temporada-1`) |
| `amountInCents` | Valor do produto, em centavos |
| `email` | E-mail para avisar quando o pagamento for conferido (já em minúsculas) |
| `receipt` | Comprovante: PNG, JPG, WEBP ou PDF, até 5 MB |

Quando o visitante está conectado, o pedido leva `Authorization: Bearer <accessToken>` e o
pagamento deve ficar ligado à conta. **Nos passes, a conta é obrigatória:** o passe vale no jogo
da conta que pagou, e a conta é a porta do adulto (a criança não paga sozinha). Recuse com `401`
um passe sem `Authorization`.

| Status | Significado |
| --- | --- |
| `201` / `202` / `204` | Comprovante recebido e aguardando conferência |
| `400` / `422` | Dados recusados |
| `401` | Passe da Temporada sem conta conectada |
| `413` | Arquivo grande demais |
| `415` | Formato de arquivo não aceito |
| `429` | Muitos envios seguidos |

## `GET /payments/season-passes?seasonId=<id>`

Com `Authorization: Bearer <accessToken>`. Responde os passes **já conferidos** da conta naquela
temporada; o jogo libera cada um deles (o Luxo traz o VIP junto) ao abrir a aba do passe.

```json
{ "passes": ["vip"] }
```

Ids desconhecidos são ignorados pelo cliente. Sem passes conferidos, responda `{ "passes": [] }`.
Sem conta, `401`.

## Cuidados

- **Nunca confie em `amountInCents`:** confira o valor pelo `productType` e `productId` na tabela
  do servidor. No Luxo, o valor de `300` só vale para a conta que já tem o VIP conferido naquela
  temporada.
- Confira tipo e tamanho do arquivo pelo conteúdo, não só pela extensão, e guarde os comprovantes
  fora da pasta pública.
- O comprovante tem dados bancários de quem pagou: acesso restrito e prazo de guarda definido.
- O plano ou o passe só é liberado depois que o Pix é conferido no extrato. Quando houver
  integração com o banco (Pix com QR Code dinâmico e webhook), este fluxo manual pode ser
  substituído.
- O site é usado por uma criança: compras com dinheiro de verdade seguem as regras de compra por
  menores (o responsável paga com a conta dele) e devem ter canal de reembolso.
