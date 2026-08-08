import { computed, DestroyRef, inject, Injectable, signal } from '@angular/core';

import type { StoredVideo, VideoCardData, VideoDraft } from '../models/video.model';
import { createId, normalizeText } from '../utils/format';
import { extractVideoMetadata } from '../utils/video-metadata';
import { IndexedDbService, VIDEO_STORE } from './indexed-db.service';

export const MAX_VIDEO_SIZE_IN_BYTES = 300 * 1024 * 1024;

export type VideoLibraryStatus = 'idle' | 'loading' | 'ready' | 'error';

/**
 * Biblioteca de vídeos do site.
 *
 * Os arquivos ficam no IndexedDB do próprio navegador — o site não tem
 * backend — e são expostos à UI como object URLs, cujo ciclo de vida é
 * controlado aqui para evitar vazamento de memória.
 */
@Injectable({ providedIn: 'root' })
export class VideoLibraryService {
  private readonly database = inject(IndexedDbService);

  private readonly videosState = signal<readonly VideoCardData[]>([]);
  private readonly statusState = signal<VideoLibraryStatus>('idle');
  private readonly errorState = signal<string | null>(null);
  private readonly objectUrls = new Map<string, string>();

  readonly videos = this.videosState.asReadonly();
  readonly status = this.statusState.asReadonly();
  readonly errorMessage = this.errorState.asReadonly();
  readonly totalCount = computed(() => this.videosState().length);
  readonly isEmpty = computed(() => this.statusState() === 'ready' && this.totalCount() === 0);

  constructor() {
    inject(DestroyRef).onDestroy(() => this.releaseAllObjectUrls());
  }

  /** Carrega a biblioteca uma única vez; chamadas seguintes são ignoradas. */
  async load(): Promise<void> {
    if (this.statusState() !== 'idle') {
      return;
    }

    this.statusState.set('loading');
    this.errorState.set(null);

    try {
      const stored = await this.database.getAll<StoredVideo>(VIDEO_STORE);
      this.videosState.set(stored.map((video) => this.toCardData(video)));
      this.statusState.set('ready');
    } catch (error) {
      this.statusState.set('error');
      this.errorState.set(this.describeError(error));
    }
  }

  async add(draft: VideoDraft): Promise<VideoCardData> {
    this.assertValidDraft(draft);

    const { durationInSeconds, posterDataUrl } = await extractVideoMetadata(draft.file);
    const stored: StoredVideo = {
      id: createId('video'),
      title: normalizeText(draft.title),
      description: normalizeText(draft.description),
      recordedAt: draft.recordedAt,
      uploadedAt: new Date().toISOString(),
      fileName: draft.file.name,
      mimeType: draft.file.type,
      sizeInBytes: draft.file.size,
      durationInSeconds,
      posterDataUrl,
      blob: draft.file,
    };

    await this.database.put(VIDEO_STORE, stored);

    const card = this.toCardData(stored);
    this.videosState.update((videos) => [card, ...videos]);
    this.errorState.set(null);
    this.statusState.set('ready');

    return card;
  }

  async remove(id: string): Promise<void> {
    await this.database.delete(VIDEO_STORE, id);
    this.videosState.update((videos) => videos.filter((video) => video.id !== id));
    this.releaseObjectUrl(id);
  }

  private assertValidDraft(draft: VideoDraft): void {
    if (!normalizeText(draft.title)) {
      throw new Error('Dê um título para o vídeo.');
    }

    if (!draft.recordedAt) {
      throw new Error('Informe a data em que o vídeo foi gravado.');
    }

    if (!draft.file.type.startsWith('video/')) {
      throw new Error('O arquivo selecionado não é um vídeo.');
    }

    if (draft.file.size > MAX_VIDEO_SIZE_IN_BYTES) {
      throw new Error('O vídeo é grande demais para ser guardado no navegador.');
    }
  }

  private toCardData(video: StoredVideo): VideoCardData {
    const { blob, ...rest } = video;
    return { ...rest, sourceUrl: this.createObjectUrl(video.id, blob) };
  }

  private createObjectUrl(id: string, blob: Blob): string {
    this.releaseObjectUrl(id);
    const url = URL.createObjectURL(blob);
    this.objectUrls.set(id, url);
    return url;
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

  private describeError(error: unknown): string {
    if (!this.database.isSupported) {
      return 'Este navegador não consegue guardar vídeos. Tente em um navegador mais novo.';
    }

    return error instanceof Error ? error.message : 'Não foi possível carregar os vídeos.';
  }
}
