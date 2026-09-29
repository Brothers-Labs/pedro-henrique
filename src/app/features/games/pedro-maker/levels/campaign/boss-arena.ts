import { DEFAULT_LEVEL_HEIGHT } from '../../config/physics.config';
import type { World } from '../../models/campaign.model';
import type { LevelBlueprint } from '../../models/level.model';
import { LevelBuilder } from '../level-builder';

const SURFACE = 12;
const WIDTH = 72;

/** Colunas da arena: o chefão nunca sai delas. */
export const ARENA_LEFT = 38;
export const ARENA_RIGHT = 66;

/**
 * Fase 10 de cada mundo: o castelo do chefão.
 *
 * Um corredor curto com moedas, um coração e o checkpoint logo antes da
 * porta — perder para o chefão recomeça ali, nunca do início da fase. A
 * arena é plana, com duas plataformas para escapar das investidas. O portal
 * só aparece quando o chefão é derrotado.
 */
export function buildBossArena(world: World): LevelBlueprint {
  const builder = new LevelBuilder(WIDTH, DEFAULT_LEVEL_HEIGHT);
  const floor = SURFACE - 1;

  builder.ground(0, WIDTH - 1, SURFACE);
  builder.fill('stone', ARENA_RIGHT + 1, WIDTH - 1, 0, SURFACE - 1);

  builder.add('start', 3, floor);
  builder.add('mascot-tip', 4, floor, { text: `O castelo do ${world.boss.name}! Você consegue!` });
  builder.coins(8, SURFACE - 3, 6);
  builder.add('surprise', 17, SURFACE - 4, { contents: 'heart' });
  builder.fill('stone', 21, 23, SURFACE - 1, SURFACE - 1);
  builder.coinArc(20, SURFACE - 4, 5);
  builder.add('surprise', 27, SURFACE - 4, { contents: 'crystal' });
  builder.add('crystal', 30, SURFACE - 5);
  builder.add('checkpoint', 33, floor);
  builder.add('hint', 35, SURFACE - 5, {
    text: 'PULE NO CHEFÃO QUANDO ELE CANSAR!',
  });

  builder.row('platform', ARENA_LEFT + 5, SURFACE - 4, 3);
  builder.row('platform', ARENA_RIGHT - 9, SURFACE - 4, 3);
  builder.add('crystal', ARENA_LEFT + 6, SURFACE - 6);

  builder.add('boss', ARENA_RIGHT - 6, floor);
  builder.add('portal', ARENA_RIGHT - 2, floor);

  for (const x of [1, 12, 25, 36]) {
    builder.add('rock', x, floor);
  }

  return builder.build({
    id: `${world.id}-10`,
    name: `Castelo do ${world.boss.name}`,
    theme: 'castelo',
    targetTimeSeconds: 120,
    boss: world.boss,
  });
}
