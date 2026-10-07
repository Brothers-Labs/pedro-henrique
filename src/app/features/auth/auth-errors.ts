import { ApiError } from '../../core/services/api-client.service';

export type AuthOperation = 'login' | 'register' | 'forgot-password' | 'reset-password';

/**
 * Respostas de erro que significam algo específico em cada operação.
 *
 * As mensagens são do site, e nunca do servidor: o texto da API pode vir em
 * outro idioma ou revelar detalhes que o visitante não precisa saber.
 */
const MESSAGES_BY_STATUS: Readonly<Record<AuthOperation, Readonly<Record<number, string>>>> = {
  login: {
    400: 'Confira o e-mail e a senha e tente de novo.',
    401: 'E-mail ou senha incorretos.',
    403: 'Esta conta ainda não pode entrar. Confira o seu e-mail.',
  },
  register: {
    400: 'Confira os dados do cadastro e tente de novo.',
    409: 'Já existe uma conta com este e-mail. Que tal entrar?',
    422: 'Confira os dados do cadastro e tente de novo.',
  },
  'forgot-password': {
    400: 'Confira o e-mail digitado e tente de novo.',
  },
  'reset-password': {
    400: 'Este link de recuperação não vale mais. Peça um novo.',
    404: 'Este link de recuperação não vale mais. Peça um novo.',
    410: 'Este link de recuperação expirou. Peça um novo.',
    422: 'Esta senha não foi aceita. Escolha outra.',
  },
};

/** Traduz qualquer falha de uma operação de conta numa frase que o visitante entende. */
export function describeAuthError(error: unknown, operation: AuthOperation): string {
  if (!(error instanceof ApiError)) {
    return 'Algo deu errado do nosso lado. Tente de novo daqui a pouco.';
  }

  switch (error.kind) {
    case 'not-configured':
      return 'O acesso às contas ainda não está disponível. Volte em breve!';
    case 'network':
      return 'Sem conexão com o servidor. Confira a internet e tente de novo.';
    case 'timeout':
      return 'O servidor demorou demais para responder. Tente de novo.';
    case 'invalid-response':
      return 'O servidor respondeu de um jeito inesperado. Tente de novo daqui a pouco.';
    case 'http':
      return describeHttpError(error.status, operation);
  }
}

function describeHttpError(status: number | null, operation: AuthOperation): string {
  if (status === null) {
    return 'Algo deu errado do nosso lado. Tente de novo daqui a pouco.';
  }

  const specific = MESSAGES_BY_STATUS[operation][status];

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
