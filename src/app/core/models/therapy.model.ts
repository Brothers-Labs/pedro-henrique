import type { ThemeColor } from './profile.model';

/** Atendimento que faz parte da rotina de acompanhamento do Pedro Henrique. */
export interface Therapy {
  readonly id: string;
  readonly name: string;
  readonly shortName: string;
  readonly description: string;
  readonly emoji: string;
  readonly color: ThemeColor;
}
