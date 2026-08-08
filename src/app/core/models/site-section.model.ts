import type { ThemeColor } from './profile.model';

/** Seção navegável do site, usada no menu e nos cartões de exploração. */
export interface SiteSection {
  readonly id: string;
  readonly label: string;
  readonly route: string;
  readonly emoji: string;
  readonly description: string;
  readonly color: ThemeColor;
}
