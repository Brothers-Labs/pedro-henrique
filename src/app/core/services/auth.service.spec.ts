import { TestBed } from '@angular/core/testing';

import { ApiClient, ApiError, type ApiRequest } from './api-client.service';
import { clearStoredSession, readStoredSession } from './auth-session.storage';
import { AuthService } from './auth.service';

const SESSION_RESPONSE = {
  accessToken: 'token-123',
  expiresAt: new Date(Date.now() + 3_600_000).toISOString(),
  user: { id: 'u-1', name: 'Ana', email: 'ana@exemplo.com' },
};

describe('AuthService', () => {
  let request: jasmine.Spy<(options: ApiRequest) => Promise<unknown>>;

  function createService(): AuthService {
    request = jasmine.createSpy('request');
    TestBed.configureTestingModule({
      providers: [{ provide: ApiClient, useValue: { isConfigured: true, request } }],
    });

    return TestBed.inject(AuthService);
  }

  beforeEach(() => clearStoredSession());
  afterEach(() => clearStoredSession());

  it('começa sem ninguém conectado', () => {
    const service = createService();

    expect(service.isAuthenticated()).toBeFalse();
    expect(service.currentUser()).toBeNull();
  });

  it('entra, normaliza o e-mail e guarda a sessão', async () => {
    const service = createService();
    request.and.resolveTo(SESSION_RESPONSE);

    const user = await service.login({ email: '  Ana@Exemplo.com ', password: 'pedro123', rememberMe: true });

    expect(request).toHaveBeenCalledWith({
      method: 'POST',
      path: '/auth/login',
      body: { email: 'ana@exemplo.com', password: 'pedro123' },
    });
    expect(user.name).toBe('Ana');
    expect(service.isAuthenticated()).toBeTrue();
    expect(readStoredSession()?.accessToken).toBe('token-123');
  });

  it('recusa uma resposta de login que não é uma sessão', async () => {
    const service = createService();
    request.and.resolveTo({ token: 'formato-errado' });

    await expectAsync(
      service.login({ email: 'ana@exemplo.com', password: 'pedro123', rememberMe: false }),
    ).toBeRejectedWith(jasmine.objectContaining({ kind: 'invalid-response' }));
    expect(service.isAuthenticated()).toBeFalse();
  });

  it('cadastra e já deixa a pessoa conectada', async () => {
    const service = createService();
    request.and.resolveTo(SESSION_RESPONSE);

    await service.register({ name: ' Ana ', email: 'ana@exemplo.com', password: 'pedro123' });

    expect(request.calls.mostRecent().args[0].body).toEqual({
      name: 'Ana',
      email: 'ana@exemplo.com',
      password: 'pedro123',
    });
    expect(service.isAuthenticated()).toBeTrue();
  });

  it('sai no aparelho mesmo quando a API não confirma', async () => {
    const service = createService();
    request.and.resolveTo(SESSION_RESPONSE);
    await service.login({ email: 'ana@exemplo.com', password: 'pedro123', rememberMe: true });

    request.and.rejectWith(new ApiError('network', 'sem rede'));
    spyOn(console, 'warn');

    await service.logout();

    expect(service.isAuthenticated()).toBeFalse();
    expect(readStoredSession()).toBeNull();
    expect(request.calls.mostRecent().args[0]).toEqual({
      method: 'POST',
      path: '/auth/logout',
      accessToken: 'token-123',
    });
    expect(console.warn).toHaveBeenCalled();
  });

  it('pede o link de recuperação com o e-mail normalizado', async () => {
    const service = createService();
    request.and.resolveTo(null);

    await service.requestPasswordReset({ email: ' Ana@Exemplo.com' });

    expect(request).toHaveBeenCalledWith({
      method: 'POST',
      path: '/auth/forgot-password',
      body: { email: 'ana@exemplo.com' },
    });
  });
});
