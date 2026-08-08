import type { ThemeColor } from './profile.model';

/** Capítulo da linha do tempo da página "Minha história". */
export interface StoryChapter {
  readonly id: string;
  readonly year: number;
  readonly ageLabel: string;
  readonly title: string;
  readonly story: string;
  readonly emoji: string;
  readonly color: ThemeColor;
  readonly highlights: readonly string[];
}
