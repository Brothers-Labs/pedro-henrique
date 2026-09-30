import type { BossDefinition, LevelBlueprint, LevelTheme } from './level.model';

export type WorldId = 1 | 2 | 3 | 4 | 5;

export interface World {
  readonly id: WorldId;
  readonly name: string;
  readonly emoji: string;
  readonly description: string;
  /** Tema das fases comuns do mundo. */
  readonly theme: LevelTheme;
  /** Cor de destaque do mundo no mapa. */
  readonly color: string;
  readonly boss: BossDefinition;
}

export type CampaignLevelKind = 'normal' | 'boss' | 'secret';

/**
 * Ficha de uma fase da campanha.
 *
 * A planta da fase é montada só quando alguém vai jogá-la: o mapa lista as
 * cinquenta fases sem pagar o custo de construir nenhuma.
 */
export interface CampaignLevel {
  readonly id: string;
  readonly worldId: WorldId;
  /** Posição dentro do mundo (1 a 10); a fase secreta usa zero. */
  readonly number: number;
  readonly name: string;
  readonly kind: CampaignLevelKind;
  readonly build: () => LevelBlueprint;
}
