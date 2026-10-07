# Pagamento dos planos por Pix

A página `/planos` oferece três assinaturas mensais. O pagamento é por Pix com conferência manual:
o visitante copia a chave, paga no app do banco e anexa o comprovante. O cliente já está pronto
(`src/app/features/plans/`); faltam a chave Pix e um servidor que receba os comprovantes.

| Plano | `planId` | Valor (`amountInCents`) |
| --- | --- | --- |
| Essencial | `essencial` | `999` |
| Completo | `completo` | `1999` |
| Premium | `premium` | `2999` |

Preços e recursos de cada plano ficam em `src/app/core/data/plans.data.ts`.

## Como ligar

1. Preencha `pix.key` (e, de preferência, `pix.receiverName`) em `src/environments/environment.ts`
   e `environment.development.ts`. Sem chave, o modal avisa que o pagamento ainda não está
   disponível.
2. Configure `apiUrl` e publique um servidor com o endpoint abaixo (veja também as convenções de
   `docs/auth-api.md`: HTTPS, CORS com credenciais e status em vez de texto de erro).

## `POST /payments/pix`

`multipart/form-data` com os campos:

| Campo | Conteúdo |
| --- | --- |
| `planId` | `essencial`, `completo` ou `premium` |
| `amountInCents` | Valor do plano, em centavos |
| `email` | E-mail para avisar quando o pagamento for conferido (já em minúsculas) |
| `receipt` | Comprovante: PNG, JPG, WEBP ou PDF, até 5 MB |

Quando o visitante está conectado, o pedido leva `Authorization: Bearer <accessToken>` e o
pagamento deve ficar ligado à conta.

| Status | Significado |
| --- | --- |
| `201` / `202` / `204` | Comprovante recebido e aguardando conferência |
| `400` / `422` | Dados recusados |
| `413` | Arquivo grande demais |
| `415` | Formato de arquivo não aceito |
| `429` | Muitos envios seguidos |

## Cuidados

- **Nunca confie em `amountInCents`:** confira o valor pelo `planId` na tabela do servidor.
- Confira tipo e tamanho do arquivo pelo conteúdo, não só pela extensão, e guarde os comprovantes
  fora da pasta pública.
- O comprovante tem dados bancários de quem pagou: acesso restrito e prazo de guarda definido.
- O plano só é liberado depois que o Pix é conferido no extrato. Quando houver integração com o
  banco (Pix com QR Code dinâmico e webhook), este fluxo manual pode ser substituído.
