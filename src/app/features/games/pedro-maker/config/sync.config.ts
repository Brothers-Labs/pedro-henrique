import { InjectionToken } from '@angular/core';

/**
 * Endereço do servidor que guarda as fases criadas no editor.
 *
 * Fica vazio enquanto não existe servidor: o editor continua funcionando só no
 * aparelho, exatamente como antes. Para ligar a sincronização, publique um
 * servidor que siga `docs/pedro-maker-sync-api.md` e coloque o endereço aqui,
 * sem barra no fim — por exemplo `'https://api.exemplo.com.br/pedro-maker'`.
 */
export const MAKER_SYNC_BASE_URL: string | null = null;

export const MAKER_SYNC_ENDPOINT = new InjectionToken<string | null>('MAKER_SYNC_ENDPOINT', {
  providedIn: 'root',
  factory: () => MAKER_SYNC_BASE_URL,
});

/** Tempo máximo de espera por uma resposta do servidor. */
export const SYNC_TIMEOUT_MS = 10000;

/** Espera depois de uma mudança antes de sincronizar: juntar edições seguidas num envio só. */
export const SYNC_DEBOUNCE_MS = 3000;

/** Formato aceito para o código de sincronização. */
export const SYNC_CODE_PATTERN = /^[A-Za-z0-9-]{12,64}$/;
