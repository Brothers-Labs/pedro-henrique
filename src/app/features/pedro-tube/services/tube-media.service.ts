import { DestroyRef, inject, Injectable } from '@angular/core';

import { IndexedDbService, TUBE_MEDIA_STORE } from '../../../core/services/indexed-db.service';
import { createId } from '../../../core/utils/format';

/** Tamanho máximo de um arquivo de vídeo guardado no navegador. */
export const MAX_TUBE_MEDIA_BYTES = 200 * 1024 * 1024;

interface StoredTubeMedia {
  readonly id: string;
  readonly blob: Blob;
}

/**
 * Os arquivos dos vídeos enviados ou gravados no PedroTube.
 *
 * Ficam no IndexedDB, que aguenta arquivos grandes; os dados do vídeo
 * (título, canal, efeito) ficam no `localStorage`, junto com o resto do
 * PedroTube. A UI recebe object URLs, liberadas aqui quando o vídeo some.
 */
@Injectable({ providedIn: 'root' })
export class TubeMediaService {
  private readonly database = inject(IndexedDbService);
  private readonly urls = new Map<string, Promise<string | null>>();

  constructor() {
    inject(DestroyRef).onDestroy(() => {
      for (const url of this.urls.values()) {
        void url.then((value) => value && URL.revokeObjectURL(value));
      }

      this.urls.clear();
    });
  }

  get isSupported(): boolean {
    return this.database.isSupported;
  }

  /** Guarda o arquivo e devolve a chave dele. */
  async save(blob: Blob): Promise<string> {
    if (blob.size > MAX_TUBE_MEDIA_BYTES) {
      throw new Error('O vídeo é grande demais para guardar no navegador.');
    }

    const id = createId('midia');

    await this.database.put<StoredTubeMedia>(TUBE_MEDIA_STORE, { id, blob });

    return id;
  }

  /** Endereço para tocar o arquivo, ou `null` se ele não existe mais neste aparelho. */
  urlFor(id: string): Promise<string | null> {
    let url = this.urls.get(id);

    if (!url) {
      url = this.database
        .get<StoredTubeMedia>(TUBE_MEDIA_STORE, id)
        .then((media) => (media?.blob ? URL.createObjectURL(media.blob) : null))
        .catch(() => null)
        .then((value) => {
          // Uma falha não fica guardada: a próxima tentativa lê o banco de novo.
          if (value === null) {
            this.urls.delete(id);
          }

          return value;
        });
      this.urls.set(id, url);
    }

    return url;
  }

  async remove(id: string): Promise<void> {
    const url = this.urls.get(id);

    this.urls.delete(id);

    if (url) {
      const value = await url;

      if (value) {
        URL.revokeObjectURL(value);
      }
    }

    await this.database.delete(TUBE_MEDIA_STORE, id);
  }
}
