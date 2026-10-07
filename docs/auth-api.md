# API de contas

Contrato que um servidor precisa seguir para as telas de conta do site: entrar (`/entrar`), criar
conta (`/cadastro`), recuperar senha (`/recuperar-senha`) e criar senha nova (`/redefinir-senha`).
O cliente já está pronto (`src/app/core/services/auth.service.ts`); falta só um servidor que
responda assim.

Enquanto nenhum servidor estiver configurado, as telas funcionam e mostram um aviso de que o envio
ainda não está disponível.

## Como ligar

1. Publique um servidor que implemente os endpoints abaixo, com HTTPS e CORS liberado para o
   domínio do site (com `Access-Control-Allow-Credentials: true` e a origem exata, não `*`).
2. Coloque o endereço base em `apiUrl`, sem barra no fim:
   - `src/environments/environment.ts` — produção (`npm run build`);
   - `src/environments/environment.development.ts` — desenvolvimento (`npm start`).
3. Publique o site de novo.

Um endereço malformado derruba a inicialização de propósito, com uma mensagem clara no console: é
melhor descobrir o erro antes de publicar do que com o site no ar.

## Convenções

- Todo corpo é JSON (`Content-Type: application/json`).
- Os pedidos saem com `credentials: 'include'`: o servidor pode guardar a sessão num cookie
  `HttpOnly; Secure; SameSite=Lax`, a forma mais segura. O token no corpo da resposta continua
  obrigatório porque o site usa os dados da sessão para mostrar quem está conectado.
- Pedidos autenticados levam `Authorization: Bearer <accessToken>`.
- O site mostra mensagens próprias para cada status; o texto de erro do servidor nunca chega ao
  visitante. Responda com o status certo e o resto fica por conta do site.
- O site espera até 15 segundos por resposta.

## Sessão

Resposta de `login` e `register`:

```json
{
  "accessToken": "eyJhbGciOi...",
  "expiresAt": "2026-10-07T12:00:00.000Z",
  "user": { "id": "u_123", "name": "Ana Souza", "email": "ana@exemplo.com" }
}
```

- `expiresAt` é opcional (ISO 8601). Quando vem, o site encerra a sessão sozinho nesse instante.
- Uma resposta fora desse formato é tratada como erro, e ninguém fica conectado.
- Com "Lembrar de mim" a sessão fica no `localStorage`; sem, só no `sessionStorage` da aba.

## Endpoints

### `POST /auth/login`

```json
{ "email": "ana@exemplo.com", "password": "pedro123" }
```

| Status | Significado |
| --- | --- |
| `200` | Sessão (formato acima) |
| `401` | E-mail ou senha incorretos — não diga qual dos dois |
| `403` | Conta existe mas não pode entrar (por exemplo, e-mail não confirmado) |
| `429` | Muitas tentativas |

### `POST /auth/register`

```json
{ "name": "Ana Souza", "email": "ana@exemplo.com", "password": "pedro123" }
```

| Status | Significado |
| --- | --- |
| `201` | Sessão (formato acima): a pessoa já entra conectada |
| `409` | Já existe conta com o e-mail |
| `422` | Dados recusados (por exemplo, senha fraca demais para a regra do servidor) |

O site já exige 8 caracteres ou mais, com letras e números, mas o servidor deve validar de novo.

### `POST /auth/forgot-password`

```json
{ "email": "ana@exemplo.com" }
```

Responda `202` ou `204` **sempre**, exista ou não uma conta com o e-mail — outra resposta contaria
a qualquer um quem tem cadastro. O e-mail enviado leva o link:

```text
https://<domínio-do-site>/redefinir-senha?token=<token>
```

O token deve ser aleatório, de uso único, guardado só como hash e valer por pouco tempo (por
exemplo, 1 hora).

### `POST /auth/reset-password`

```json
{ "token": "<token do link>", "password": "senhaNova123" }
```

| Status | Significado |
| --- | --- |
| `204` | Senha trocada. Recomenda-se encerrar as outras sessões da conta |
| `400` / `404` | Token inválido |
| `410` | Token expirado |
| `422` | Senha recusada |

### `POST /auth/logout`

Com `Authorization: Bearer <accessToken>`. Responda `204`. O site desconecta o visitante no
aparelho antes de chamar este endpoint, então uma falha aqui não impede a saída.

## Segurança

- Limite de tentativas por IP e por e-mail em `login`, `forgot-password` e `reset-password`.
- Senhas com hash lento (Argon2id ou bcrypt), nunca em texto puro.
- O site é de uma criança: sem rastreamento, sem compartilhar dados com terceiros.
