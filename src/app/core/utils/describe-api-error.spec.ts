import { ApiError } from '../services/api-client.service';
import { describeApiError } from './describe-api-error';

describe('describeApiError', () => {
  it('usa a mensagem específica da tela para o status', () => {
    expect(describeApiError(new ApiError('http', 'x', 413), { 413: 'Grande demais.' })).toBe(
      'Grande demais.',
    );
  });

  it('explica os status comuns quando a tela não diz nada', () => {
    expect(describeApiError(new ApiError('http', 'x', 429))).toContain('Muitas tentativas');
    expect(describeApiError(new ApiError('http', 'x', 500))).toContain('servidor está com problemas');
    expect(describeApiError(new ApiError('http', 'x', 418))).toBe('Não deu certo desta vez. Tente de novo.');
  });

  it('explica falhas de comunicação e API ausente', () => {
    expect(describeApiError(new ApiError('not-configured', 'x'))).toContain('ainda não está disponível');
    expect(describeApiError(new ApiError('timeout', 'x'))).toContain('demorou demais');
  });

  it('não vaza detalhes de erros internos', () => {
    expect(describeApiError(new Error('detalhe interno'))).not.toContain('detalhe');
  });
});
