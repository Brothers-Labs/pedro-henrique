import { computed, DestroyRef, inject, Injectable, signal } from '@angular/core';

import type {
  AuthSession,
  AuthUser,
  LoginCredentials,
  PasswordReset,
  PasswordResetRequest,
  RegistrationData,
} from '../models/auth.model';
import { ApiClient, ApiError } from './api-client.service';
import {
  clearStoredSession,
  parseAuthSession,
  readStoredSession,
  storeSession,
} from './auth-session.storage';

/** Maior atraso aceito por `setTimeout` (~24 dias); acima disso o timer dispara na hora. */
const MAX_TIMER_DELAY_MS = 2_147_483_647;

/**
 * Conta do visitante: entrar, criar conta, recuperar a senha e sair.
 *
 * O contrato com o servidor está em `docs/auth-api.md`. A sessão vive num
 * signal para que cabeçalho, menu e páginas reajam sozinhos a quem está
 * conectado, e é guardada no aparelho só enquanto o token valer.
 */
@Injectable({ providedIn: 'root' })
export class AuthService {
  private readonly api = inject(ApiClient);
  private readonly sessionState = signal<AuthSession | null>(readStoredSession());
  private expiryTimer: ReturnType<typeof setTimeout> | null = null;

  readonly session = this.sessionState.asReadonly();
  readonly currentUser = computed<AuthUser | null>(() => this.sessionState()?.user ?? null);
  readonly isAuthenticated = computed(() => this.sessionState() !== null);
  readonly isApiConfigured = this.api.isConfigured;

  constructor() {
    this.scheduleExpiry(this.sessionState());
    inject(DestroyRef).onDestroy(() => this.cancelExpiry());
  }

  async login({ email, password, rememberMe }: LoginCredentials): Promise<AuthUser> {
    const response = await this.api.request({
      method: 'POST',
      path: '/auth/login',
      body: { email: normalizeEmail(email), password },
    });

    return this.startSession(response, rememberMe);
  }

  async register({ name, email, password }: RegistrationData): Promise<AuthUser> {
    const response = await this.api.request({
      method: 'POST',
      path: '/auth/register',
      body: { name: name.trim(), email: normalizeEmail(email), password },
    });

    return this.startSession(response, false);
  }

  async requestPasswordReset({ email }: PasswordResetRequest): Promise<void> {
    await this.api.request({
      method: 'POST',
      path: '/auth/forgot-password',
      body: { email: normalizeEmail(email) },
    });
  }

  async resetPassword({ token, password }: PasswordReset): Promise<void> {
    await this.api.request({
      method: 'POST',
      path: '/auth/reset-password',
      body: { token, password },
    });
  }

  /**
   * Encerra a sessão no aparelho na hora e avisa o servidor em seguida.
   *
   * Sair nunca pode depender da rede: se o aviso falhar, o visitante já está
   * desconectado aqui e o token simplesmente expira do lado de lá.
   */
  async logout(): Promise<void> {
    const session = this.sessionState();
    this.endSession();

    if (!session || !this.api.isConfigured) {
      return;
    }

    try {
      await this.api.request({ method: 'POST', path: '/auth/logout', accessToken: session.accessToken });
    } catch (error) {
      console.warn('Sessão encerrada no aparelho, mas a API não confirmou a saída.', error);
    }
  }

  private startSession(response: unknown, shouldRemember: boolean): AuthUser {
    const session = parseAuthSession(response);

    if (!session) {
      throw new ApiError('invalid-response', 'A API não devolveu uma sessão válida.');
    }

    storeSession(session, shouldRemember);
    this.sessionState.set(session);
    this.scheduleExpiry(session);

    return session.user;
  }

  private endSession(): void {
    this.cancelExpiry();
    clearStoredSession();
    this.sessionState.set(null);
  }

  private scheduleExpiry(session: AuthSession | null): void {
    this.cancelExpiry();

    if (!session?.expiresAt) {
      return;
    }

    const delay = Date.parse(session.expiresAt) - Date.now();

    // Prazo longo demais para um timer: quem confere é a próxima abertura do site.
    if (delay > MAX_TIMER_DELAY_MS) {
      return;
    }

    this.expiryTimer = setTimeout(() => this.endSession(), Math.max(delay, 0));
  }

  private cancelExpiry(): void {
    if (this.expiryTimer !== null) {
      clearTimeout(this.expiryTimer);
      this.expiryTimer = null;
    }
  }
}

function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}
