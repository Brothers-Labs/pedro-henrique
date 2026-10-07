import { inject, Injectable, InjectionToken } from '@angular/core';

import { environment } from '../../../environments/environment';

/** Tempo máximo de espera por uma resposta da API. */
export const API_TIMEOUT_MS = 15000;

/**
 * Endereço base da API, já validado e sem barra no fim.
 *
 * `null` quando nenhum servidor foi configurado em `environment.apiUrl`.
 */
export const API_BASE_URL = new InjectionToken<string | null>('API_BASE_URL', {
  providedIn: 'root',
  factory: () => normalizeBaseUrl(environment.apiUrl),
});

export type ApiMethod = 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';

/**
 * O que deu errado, em categorias que a tela consegue explicar:
 * - `not-configured`: ainda não existe `apiUrl`;
 * - `network`: o pedido nem chegou ao servidor;
 * - `timeout`: o servidor não respondeu a tempo;
 * - `http`: o servidor respondeu com erro (veja `status`);
 * - `invalid-response`: a resposta chegou, mas não dá para ler.
 */
export type ApiErrorKind = 'not-configured' | 'network' | 'timeout' | 'http' | 'invalid-response';

export class ApiError extends Error {
  constructor(
    readonly kind: ApiErrorKind,
    message: string,
    readonly status: number | null = null,
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

export interface ApiRequest {
  readonly method: ApiMethod;

  /** Caminho a partir do endereço base, começando com `/`. */
  readonly path: string;
  readonly body?: unknown;
  readonly accessToken?: string;
}

/**
 * Porta única de saída para a API do site.
 *
 * Usa o `fetch` do navegador, sem biblioteca, como o resto do projeto. Devolve
 * o corpo como `unknown` de propósito: quem chama é obrigado a validar o
 * formato antes de usar, e nada do servidor entra no app às cegas.
 */
@Injectable({ providedIn: 'root' })
export class ApiClient {
  private readonly baseUrl = inject(API_BASE_URL);

  readonly isConfigured = this.baseUrl !== null;

  async request({ method, path, body, accessToken }: ApiRequest): Promise<unknown> {
    if (this.baseUrl === null) {
      throw new ApiError('not-configured', 'Nenhuma API configurada em environment.apiUrl.');
    }

    const response = await this.send(`${this.baseUrl}${path}`, {
      method,
      headers: buildHeaders(body !== undefined, accessToken),
      body: body === undefined ? undefined : JSON.stringify(body),

      // Permite que a API mantenha a sessão num cookie `HttpOnly`, a forma mais
      // segura de guardar credenciais no navegador.
      credentials: 'include',
    });

    if (!response.ok) {
      throw new ApiError('http', `A API respondeu com erro (${response.status}).`, response.status);
    }

    return readJson(response);
  }

  private async send(url: string, init: RequestInit): Promise<Response> {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), API_TIMEOUT_MS);

    try {
      return await fetch(url, { ...init, signal: controller.signal });
    } catch {
      throw controller.signal.aborted
        ? new ApiError('timeout', 'A API demorou demais para responder.')
        : new ApiError('network', 'Não foi possível falar com a API.');
    } finally {
      clearTimeout(timeout);
    }
  }
}

/**
 * Valida o endereço configurado e tira a barra do fim.
 *
 * Um endereço malformado é erro de quem publicou o site, e não do visitante:
 * falhar logo na inicialização é o que impede o erro de ir para o ar.
 */
export function normalizeBaseUrl(raw: string | null): string | null {
  const trimmed = raw?.trim() ?? '';

  if (trimmed === '') {
    return null;
  }

  let url: URL;

  try {
    url = new URL(trimmed);
  } catch {
    throw new Error(`environment.apiUrl não é um endereço válido: "${trimmed}".`);
  }

  if (url.protocol !== 'https:' && url.protocol !== 'http:') {
    throw new Error(`environment.apiUrl precisa usar http ou https: "${trimmed}".`);
  }

  return trimmed.replace(/\/+$/, '');
}

function buildHeaders(hasBody: boolean, accessToken: string | undefined): Record<string, string> {
  return {
    Accept: 'application/json',
    ...(hasBody ? { 'Content-Type': 'application/json' } : {}),
    ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {}),
  };
}

async function readJson(response: Response): Promise<unknown> {
  if (response.status === 204) {
    return null;
  }

  const text = await response.text();

  if (text === '') {
    return null;
  }

  try {
    return JSON.parse(text) as unknown;
  } catch {
    throw new ApiError('invalid-response', 'A API mandou uma resposta que não dá para ler.', response.status);
  }
}
