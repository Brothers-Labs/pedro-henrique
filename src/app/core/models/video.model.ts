/** Dados informados pela pessoa que envia o vídeo. */
export interface VideoDraft {
  readonly title: string;
  readonly description: string;
  /** Data em que o vídeo foi gravado, no formato ISO `yyyy-MM-dd`. */
  readonly recordedAt: string;
  readonly file: File;
}

/** Registro persistido no IndexedDB. O blob é a fonte do vídeo. */
export interface StoredVideo {
  readonly id: string;
  readonly title: string;
  readonly description: string;
  readonly recordedAt: string;
  readonly uploadedAt: string;
  readonly fileName: string;
  readonly mimeType: string;
  readonly sizeInBytes: number;
  readonly durationInSeconds: number;
  readonly posterDataUrl: string | null;
  readonly blob: Blob;
}

/**
 * Projeção usada pela UI: troca o blob por uma object URL já criada, evitando
 * que cada componente precise gerenciar o ciclo de vida da URL.
 */
export type VideoCardData = Omit<StoredVideo, 'blob'> & {
  readonly sourceUrl: string;
};

export type VideoSortOrder = 'recorded-desc' | 'recorded-asc' | 'uploaded-desc' | 'title-asc';

export interface VideoSortOption {
  readonly value: VideoSortOrder;
  readonly label: string;
}
