import { describeApiError } from '../../core/utils/describe-api-error';

export type AuthOperation = 'login' | 'register' | 'forgot-password' | 'reset-password';

/** Respostas de erro que significam algo específico em cada operação de conta. */
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
  return describeApiError(error, MESSAGES_BY_STATUS[operation]);
}
