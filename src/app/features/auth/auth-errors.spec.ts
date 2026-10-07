import { ApiError } from '../../core/services/api-client.service';
import { describeAuthError } from './auth-errors';

describe('describeAuthError', () => {
  it('explica senha errada sem dizer qual dos dois campos errou', () => {
    expect(describeAuthError(new ApiError('http', 'x', 401), 'login')).toBe(
      'E-mail ou senha incorretos.',
    );
  });

  it('avisa quando o e-mail já tem cadastro', () => {
    expect(describeAuthError(new ApiError('http', 'x', 409), 'register')).toContain(
      'Já existe uma conta',
    );
  });

  it('pede um novo link quando o token de recuperação expirou', () => {
    expect(describeAuthError(new ApiError('http', 'x', 410), 'reset-password')).toContain(
      'expirou',
    );
  });

  it('trata limite de tentativas e falha do servidor em qualquer operação', () => {
    expect(describeAuthError(new ApiError('http', 'x', 429), 'forgot-password')).toContain(
      'Muitas tentativas',
    );
    expect(describeAuthError(new ApiError('http', 'x', 503), 'login')).toContain(
      'servidor está com problemas',
    );
  });

  it('explica cada falha de comunicação', () => {
    expect(describeAuthError(new ApiError('not-configured', 'x'), 'login')).toContain(
      'ainda não está disponível',
    );
    expect(describeAuthError(new ApiError('network', 'x'), 'login')).toContain('Sem conexão');
    expect(describeAuthError(new ApiError('timeout', 'x'), 'login')).toContain('demorou demais');
  });

  it('não vaza detalhes de erros que não vieram da API', () => {
    expect(describeAuthError(new TypeError('stack interna'), 'login')).not.toContain('stack');
  });
});
