import type { ThemeColor } from './profile.model';

export type GalleryCategory = 'desenhos' | 'passeios' | 'escola' | 'familia';

export interface GalleryItem {
  readonly id: string;
  readonly title: string;
  readonly description: string;
  readonly category: GalleryCategory;
  /** Ilustração inline (SVG em data URI), para o site funcionar sem backend. */
  readonly imageUrl: string;
  readonly color: ThemeColor;
  readonly takenAt: string;
}

export interface GalleryCategoryOption {
  readonly value: GalleryCategory | 'todas';
  readonly label: string;
  readonly emoji: string;
}
