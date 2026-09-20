import { computed, DestroyRef, inject, Injectable, signal } from '@angular/core';

import type { DrawingCardData, StoredDrawing } from '../models/drawing.model';
import { createId } from '../utils/format';
import { DRAWING_STORE, IndexedDbService } from './indexed-db.service';

export type DrawingLibraryStatus = 'idle' | 'loading' | 'ready' | 'error';

/**
 * Pasta de desenhos do Pedro Henrique.
 *
 * Os desenhos ficam no IndexedDB do próprio aparelho — o site não tem backend
 * e nada é enviado para fora. Cada imagem é exposta à tela como object URL,
 * cujo ciclo de vida é controlado aqui para não vazar memória.
 */
@Injectable({ providedIn: 'root' })
export class DrawingLibraryService {
  private readonly database = inject(IndexedDbService);

  private readonly drawingsState = signal<readonly DrawingCardData[]>([]);
  private readonly statusState = signal<DrawingLibraryStatus>('idle');
  private readonly errorState = signal<string | null>(null);
  private readonly objectUrls = new Map<string, string>();

  readonly drawings = this.drawingsState.asReadonly();
  readonly status = this.statusState.asReadonly();
  readonly errorMessage = this.errorState.asReadonly();
  readonly totalCount = computed(() => this.drawingsState().length);
  readonly isEmpty = computed(() => this.statusState() === 'ready' && this.totalCount() === 0);

  constructor() {
    inject(DestroyRef).onDestroy(() => this.releaseAllObjectUrls());
  }

  /** Carrega a pasta uma única vez; chamadas seguintes são ignoradas. */
  async load(): Promise<void> {
    if (this.statusState() !== 'idle') {
      return;
    }

    this.statusState.set('loading');
    this.errorState.set(null);

    try {
      const stored = await this.database.getAll<StoredDrawing>(DRAWING_STORE);

      this.drawingsState.set(
        stored.map((drawing) => this.toCardData(drawing)).sort(byNewestFirst),
      );
      this.statusState.set('ready');
    } catch (error) {
      this.statusState.set('error');
      this.errorState.set(describeError(error));
    }
  }

  /** Guarda a imagem e devolve o cartão já pronto para a tela. */
  async save(title: string, blob: Blob, width: number, height: number): Promise<DrawingCardData> {
    const drawing: StoredDrawing = {
      id: createId('desenho'),
      title: title.trim() || 'Meu desenho',
      createdAt: new Date().toISOString(),
      width,
      height,
      blob,
    };

    await this.database.put(DRAWING_STORE, drawing);

    const card = this.toCardData(drawing);
    this.drawingsState.update((drawings) => [card, ...drawings]);

    return card;
  }

  async remove(id: string): Promise<void> {
    await this.database.delete(DRAWING_STORE, id);

    this.drawingsState.update((drawings) => drawings.filter((drawing) => drawing.id !== id));
    this.releaseObjectUrl(id);
  }

  private toCardData({ blob, ...rest }: StoredDrawing): DrawingCardData {
    this.releaseObjectUrl(rest.id);

    const url = URL.createObjectURL(blob);
    this.objectUrls.set(rest.id, url);

    return { ...rest, imageUrl: url };
  }

  private releaseObjectUrl(id: string): void {
    const url = this.objectUrls.get(id);

    if (url) {
      URL.revokeObjectURL(url);
      this.objectUrls.delete(id);
    }
  }

  private releaseAllObjectUrls(): void {
    for (const url of this.objectUrls.values()) {
      URL.revokeObjectURL(url);
    }

    this.objectUrls.clear();
  }
}

function byNewestFirst(first: DrawingCardData, second: DrawingCardData): number {
  return second.createdAt.localeCompare(first.createdAt);
}

function describeError(error: unknown): string {
  return error instanceof Error
    ? error.message
    : 'Não foi possível abrir a pasta de desenhos deste aparelho.';
}
