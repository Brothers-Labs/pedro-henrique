import type { ThemeColor } from './profile.model';

/** Pessoa da família apresentada na seção "Minha família". */
export interface FamilyMember {
  readonly id: string;
  readonly name: string;
  readonly relation: string;
  /** Complemento curto do parentesco, como a idade ou de que lado é a avó. */
  readonly detail: string;
  readonly description: string;
  readonly emoji: string;
  readonly color: ThemeColor;
}
