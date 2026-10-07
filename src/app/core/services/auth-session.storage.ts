import type { AuthSession, AuthUser } from '../models/auth.model';

const STORAGE_KEY = 'pedro-henrique:auth-session';

/**
 * Lê e valida uma sessão vinda de fora — da API ou do storage.
 *
 * Devolve `null` para qualquer formato inesperado: uma sessão pela metade é
 * tratada como sessão nenhuma, e não como um usuário sem nome.
 */
export function parseAuthSession(value: unknown): AuthSession | null {
  if (!isRecord(value)) {
    return null;
  }

  const { accessToken, expiresAt, user } = value;
  const parsedUser = parseAuthUser(user);

  if (typeof accessToken !== 'string' || accessToken === '' || !parsedUser) {
    return null;
  }

  if (expiresAt !== undefined && expiresAt !== null && !isValidInstant(expiresAt)) {
    return null;
  }

  return {
    accessToken,
    expiresAt: typeof expiresAt === 'string' ? expiresAt : null,
    user: parsedUser,
  };
}

export function isSessionExpired(session: AuthSession, now: Date = new Date()): boolean {
  return session.expiresAt !== null && Date.parse(session.expiresAt) <= now.getTime();
}

/**
 * Recupera a sessão guardada, procurando primeiro no `localStorage` ("lembrar
 * de mim") e depois no `sessionStorage` (só esta aba). Sessão vencida é apagada.
 */
export function readStoredSession(): AuthSession | null {
  for (const storage of availableStorages()) {
    const session = parseAuthSession(readJson(storage));

    if (!session) {
      continue;
    }

    if (isSessionExpired(session)) {
      clearStoredSession();
      return null;
    }

    return session;
  }

  return null;
}

export function storeSession(session: AuthSession, shouldRemember: boolean): void {
  clearStoredSession();

  const storage = shouldRemember ? safeStorage('local') : safeStorage('session');

  try {
    storage?.setItem(STORAGE_KEY, JSON.stringify(session));
  } catch {
    // Navegador em modo privado ou sem espaço: a sessão vale enquanto a página estiver aberta.
  }
}

export function clearStoredSession(): void {
  for (const storage of availableStorages()) {
    try {
      storage.removeItem(STORAGE_KEY);
    } catch {
      // Sem acesso ao storage não há o que apagar.
    }
  }
}

function parseAuthUser(value: unknown): AuthUser | null {
  if (!isRecord(value)) {
    return null;
  }

  const { id, name, email } = value;

  if (typeof id !== 'string' || typeof name !== 'string' || typeof email !== 'string') {
    return null;
  }

  return { id, name, email };
}

function readJson(storage: Storage): unknown {
  try {
    const raw = storage.getItem(STORAGE_KEY);

    return raw === null ? null : (JSON.parse(raw) as unknown);
  } catch {
    return null;
  }
}

function availableStorages(): Storage[] {
  return [safeStorage('local'), safeStorage('session')].filter(
    (storage): storage is Storage => storage !== null,
  );
}

/** Alguns navegadores lançam erro só de tocar no storage quando os cookies estão bloqueados. */
function safeStorage(kind: 'local' | 'session'): Storage | null {
  try {
    return kind === 'local' ? localStorage : sessionStorage;
  } catch {
    return null;
  }
}

function isValidInstant(value: unknown): value is string {
  return typeof value === 'string' && !Number.isNaN(Date.parse(value));
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}
