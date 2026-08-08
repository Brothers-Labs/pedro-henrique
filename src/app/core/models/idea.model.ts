import type { ThemeColor } from './profile.model';

export type IdeaStatus = 'sonhando' | 'desenhando' | 'construindo' | 'pronta';

export interface Idea {
  readonly id: string;
  readonly title: string;
  readonly pitch: string;
  readonly whyItMatters: string;
  readonly emoji: string;
  readonly color: ThemeColor;
  readonly status: IdeaStatus;
  readonly materials: readonly string[];
}

export interface IdeaStatusOption {
  readonly value: IdeaStatus;
  readonly label: string;
  readonly emoji: string;
}
