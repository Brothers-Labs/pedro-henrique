import { computed, inject, Injectable, signal } from '@angular/core';

import type { GuestbookDraft, GuestbookMessage } from '../models/guestbook-message.model';
import { createId, normalizeText } from '../utils/format';
import { AnalyticsService } from './analytics.service';

const STORAGE_KEY = 'pedro-henrique:guestbook';

export const MAX_MESSAGE_LENGTH = 240;
export const MAX_AUTHOR_LENGTH = 40;

const SEED_MESSAGES: readonly GuestbookMessage[] = [
  {
    id: 'recado-vovo',
    author: 'Vovó Cida',
    message: 'Que site lindo, meu neto! A vovó já leu tudo duas vezes.',
    emoji: '💛',
    createdAt: '2026-05-02T14:30:00.000Z',
  },
  {
    id: 'recado-lucas',
    author: 'Lucas',
    message: 'O robô de papelão ficou muito legal! Quero fazer um também.',
    emoji: '🤖',
    createdAt: '2026-05-04T18:05:00.000Z',
  },
  {
    id: 'recado-tia',
    author: 'Tia Rafa',
    message: 'Adorei a linha do tempo. Guardei a foto do castelo de areia!',
    emoji: '🏖️',
    createdAt: '2026-05-06T09:12:00.000Z',
  },
];

/**
 * Mural de recados da home, persistido em `localStorage`.
 *
 * Mensagens são curtas e ficam só no dispositivo de quem escreveu: é um mural
 * de brincadeira, não um sistema de comentários com moderação.
 */
@Injectable({ providedIn: 'root' })
export class GuestbookService {
  private readonly analytics = inject(AnalyticsService);
  private readonly messagesState = signal<readonly GuestbookMessage[]>(this.readFromStorage());

  readonly messages = computed(() =>
    [...this.messagesState()].sort((first, second) =>
      second.createdAt.localeCompare(first.createdAt),
    ),
  );
  readonly totalCount = computed(() => this.messagesState().length);

  add(draft: GuestbookDraft): GuestbookMessage {
    const author = normalizeText(draft.author).slice(0, MAX_AUTHOR_LENGTH);
    const message = normalizeText(draft.message).slice(0, MAX_MESSAGE_LENGTH);

    if (!author || !message) {
      throw new Error('Escreva seu nome e um recado antes de enviar.');
    }

    const created: GuestbookMessage = {
      id: createId('recado'),
      author,
      message,
      emoji: draft.emoji,
      createdAt: new Date().toISOString(),
    };

    this.messagesState.update((messages) => [created, ...messages]);
    this.writeToStorage();
    this.analytics.track({ name: 'guestbook_message_posted' });

    return created;
  }

  remove(id: string): void {
    this.messagesState.update((messages) => messages.filter((message) => message.id !== id));
    this.writeToStorage();
  }

  private readFromStorage(): readonly GuestbookMessage[] {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) {
        return SEED_MESSAGES;
      }

      const parsed: unknown = JSON.parse(raw);
      return Array.isArray(parsed) ? (parsed as GuestbookMessage[]) : SEED_MESSAGES;
    } catch {
      // Navegador em modo privado ou storage corrompido: seguimos com o exemplo.
      return SEED_MESSAGES;
    }
  }

  private writeToStorage(): void {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(this.messagesState()));
    } catch {
      // Persistir é um extra; a UI continua funcionando na sessão atual.
    }
  }
}
