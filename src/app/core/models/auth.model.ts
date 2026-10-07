/** Quem está conectado, como a API devolve. */
export interface AuthUser {
  readonly id: string;
  readonly name: string;
  readonly email: string;
}

/** Sessão ativa no navegador. */
export interface AuthSession {
  readonly accessToken: string;

  /** Instante ISO 8601 em que o token deixa de valer; `null` quando a API não informa. */
  readonly expiresAt: string | null;
  readonly user: AuthUser;
}

export interface LoginCredentials {
  readonly email: string;
  readonly password: string;

  /** Manter a sessão depois de fechar o navegador. */
  readonly rememberMe: boolean;
}

export interface RegistrationData {
  readonly name: string;
  readonly email: string;
  readonly password: string;
}

export interface PasswordResetRequest {
  readonly email: string;
}

export interface PasswordReset {
  /** Código recebido no link do e-mail de recuperação. */
  readonly token: string;
  readonly password: string;
}
