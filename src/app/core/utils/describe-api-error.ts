import { ApiError } from '../services/api-client.service';

const UNEXPECTED_MESSAGE = 'Algo deu errado do nosso lado. Tente de novo daqui a pouco.';

/**
 * Traduz qualquer falha de um pedido à API numa frase que o visitante entende.
 *
 * Cada tela informa só o que um status significa para ela (`401` no login,
 * `409` no cadastro...); falta de conexão, demora, limite de tentativas e
 * erro do servidor são explicados aqui, do mesmo jeito em todo o site. As
 * mensagens são sempre do site, e nunca o texto cru que veio da API.
 */
export function describeApiError(
  error: unknown,
  messagesByStatus: Readonly<Record<number, string>> = {},
): string {
  if (!(error instanceof ApiError)) {
    return UNEXPECTED_MESSAGE;
  }

  switch (error.kind) {
    case 'not-configured':
      return 'Este recurso ainda não está disponível. Volte em breve!';
    case 'network':
      return 'Sem conexão com o servidor. Confira a internet e tente de novo.';
    case 'timeout':
      return 'O servidor demorou demais para responder. Tente de novo.';
    case 'invalid-response':
      return 'O servidor respondeu de um jeito inesperado. Tente de novo daqui a pouco.';
    case 'http':
      return describeHttpStatus(error.status, messagesByStatus);
  }
}

function describeHttpStatus(
  status: number | null,
  messagesByStatus: Readonly<Record<number, string>>,
): string {
  if (status === null) {
    return UNEXPECTED_MESSAGE;
  }

  const specific = messagesByStatus[status];

  if (specific) {
    return specific;
  }

  if (status === 429) {
    return 'Muitas tentativas seguidas. Espere um pouco e tente de novo.';
  }

  return status >= 500
    ? 'O servidor está com problemas agora. Tente de novo daqui a pouco.'
    : 'Não deu certo desta vez. Tente de novo.';
}
