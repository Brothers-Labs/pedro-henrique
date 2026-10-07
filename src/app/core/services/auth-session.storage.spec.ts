import type { AuthSession } from '../models/auth.model';
import {
  clearStoredSession,
  isSessionExpired,
  parseAuthSession,
  readStoredSession,
  storeSession,
} from './auth-session.storage';

const STORAGE_KEY = 'pedro-henrique:auth-session';

const USER = { id: 'u-1', name: 'Ana', email: 'ana@exemplo.com' };

function sessionExpiringIn(milliseconds: number | null): AuthSession {
  return {
    accessToken: 'token-123',
    expiresAt: milliseconds === null ? null : new Date(Date.now() + milliseconds).toISOString(),
    user: USER,
  };
}

describe('parseAuthSession', () => {
  it('aceita uma sessão completa', () => {
    const session = sessionExpiringIn(60_000);

    expect(parseAuthSession(session)).toEqual(session);
  });

  it('aceita sessão sem validade informada', () => {
    expect(parseAuthSession({ accessToken: 'abc', user: USER })).toEqual({
      accessToken: 'abc',
      expiresAt: null,
      user: USER,
    });
  });

  it('descarta campos que não fazem parte da sessão', () => {
    const parsed = parseAuthSession({ accessToken: 'abc', user: { ...USER, role: 'admin' }, extra: 1 });

    expect(parsed?.user).toEqual(USER);
    expect(Object.keys(parsed ?? {})).toEqual(['accessToken', 'expiresAt', 'user']);
  });

  it('recusa formatos inesperados', () => {
    expect(parseAuthSession(null)).toBeNull();
    expect(parseAuthSession('token')).toBeNull();
    expect(parseAuthSession({ accessToken: '', user: USER })).toBeNull();
    expect(parseAuthSession({ accessToken: 'abc' })).toBeNull();
    expect(parseAuthSession({ accessToken: 'abc', user: { id: 1, name: 'Ana', email: 'a@b.com' } })).toBeNull();
    expect(parseAuthSession({ accessToken: 'abc', user: USER, expiresAt: 'amanhã' })).toBeNull();
  });
});

describe('isSessionExpired', () => {
  it('considera vencida a sessão cujo prazo já passou', () => {
    expect(isSessionExpired(sessionExpiringIn(-1))).toBeTrue();
    expect(isSessionExpired(sessionExpiringIn(60_000))).toBeFalse();
  });

  it('nunca vence quando a API não informa o prazo', () => {
    expect(isSessionExpired(sessionExpiringIn(null))).toBeFalse();
  });
});

describe('armazenamento da sessão', () => {
  beforeEach(() => clearStoredSession());
  afterEach(() => clearStoredSession());

  it('guarda no localStorage quando é para lembrar', () => {
    const session = sessionExpiringIn(60_000);

    storeSession(session, true);

    expect(localStorage.getItem(STORAGE_KEY)).not.toBeNull();
    expect(sessionStorage.getItem(STORAGE_KEY)).toBeNull();
    expect(readStoredSession()).toEqual(session);
  });

  it('guarda só nesta aba quando não é para lembrar', () => {
    storeSession(sessionExpiringIn(60_000), false);

    expect(localStorage.getItem(STORAGE_KEY)).toBeNull();
    expect(sessionStorage.getItem(STORAGE_KEY)).not.toBeNull();
  });

  it('apaga a sessão vencida em vez de devolvê-la', () => {
    storeSession(sessionExpiringIn(-1), true);

    expect(readStoredSession()).toBeNull();
    expect(localStorage.getItem(STORAGE_KEY)).toBeNull();
  });

  it('ignora conteúdo corrompido no storage', () => {
    localStorage.setItem(STORAGE_KEY, '{não é json');

    expect(readStoredSession()).toBeNull();
  });
});
