import { TestBed } from '@angular/core/testing';

import { API_BASE_URL, ApiClient, ApiError, normalizeBaseUrl } from './api-client.service';

describe('normalizeBaseUrl', () => {
  it('trata endereço ausente como API não configurada', () => {
    expect(normalizeBaseUrl(null)).toBeNull();
    expect(normalizeBaseUrl('   ')).toBeNull();
  });

  it('tira espaços e barras do fim', () => {
    expect(normalizeBaseUrl(' https://api.exemplo.com/v1// ')).toBe('https://api.exemplo.com/v1');
  });

  it('falha logo com endereço malformado ou protocolo estranho', () => {
    expect(() => normalizeBaseUrl('api.exemplo.com')).toThrowError(/não é um endereço válido/);
    expect(() => normalizeBaseUrl('ftp://api.exemplo.com')).toThrowError(/http ou https/);
  });
});

describe('ApiClient', () => {
  function createClient(baseUrl: string | null): ApiClient {
    TestBed.configureTestingModule({ providers: [{ provide: API_BASE_URL, useValue: baseUrl }] });

    return TestBed.inject(ApiClient);
  }

  it('recusa o pedido quando não há API configurada', async () => {
    const client = createClient(null);
    const fetchSpy = spyOn(window, 'fetch');

    await expectAsync(client.request({ method: 'GET', path: '/x' })).toBeRejectedWith(
      jasmine.objectContaining({ kind: 'not-configured' }),
    );
    expect(fetchSpy).not.toHaveBeenCalled();
  });

  it('envia JSON com o token e devolve o corpo lido', async () => {
    const client = createClient('https://api.exemplo.com');
    const fetchSpy = spyOn(window, 'fetch').and.resolveTo(
      new Response(JSON.stringify({ ok: true }), { status: 200 }),
    );

    const body = await client.request({
      method: 'POST',
      path: '/auth/login',
      body: { email: 'ana@exemplo.com' },
      accessToken: 'abc',
    });

    const [url, init] = fetchSpy.calls.mostRecent().args;

    expect(body).toEqual({ ok: true });
    expect(url).toBe('https://api.exemplo.com/auth/login');
    expect(init?.method).toBe('POST');
    expect(init?.body).toBe('{"email":"ana@exemplo.com"}');
    expect(init?.headers).toEqual({
      Accept: 'application/json',
      'Content-Type': 'application/json',
      Authorization: 'Bearer abc',
    });
  });

  it('devolve nulo para resposta sem corpo', async () => {
    const client = createClient('https://api.exemplo.com');
    spyOn(window, 'fetch').and.resolveTo(new Response(null, { status: 204 }));

    expect(await client.request({ method: 'POST', path: '/auth/logout' })).toBeNull();
  });

  it('transforma a resposta de erro em ApiError com o status', async () => {
    const client = createClient('https://api.exemplo.com');
    spyOn(window, 'fetch').and.resolveTo(new Response('{}', { status: 401 }));

    await expectAsync(client.request({ method: 'POST', path: '/auth/login' })).toBeRejectedWith(
      jasmine.objectContaining({ kind: 'http', status: 401 }),
    );
  });

  it('distingue falha de rede de resposta ilegível', async () => {
    const client = createClient('https://api.exemplo.com');
    const fetchSpy = spyOn(window, 'fetch').and.rejectWith(new TypeError('Failed to fetch'));

    await expectAsync(client.request({ method: 'GET', path: '/x' })).toBeRejectedWith(
      jasmine.objectContaining({ kind: 'network' }),
    );

    fetchSpy.and.resolveTo(new Response('<html>', { status: 200 }));

    const error: unknown = await client.request({ method: 'GET', path: '/x' }).catch((reason: unknown) => reason);

    expect(error).toBeInstanceOf(ApiError);
    expect((error as ApiError).kind).toBe('invalid-response');
  });
});
