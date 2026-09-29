import { DEFAULT_LEVEL_HEIGHT } from '../../config/physics.config';
import type { LevelBlueprint } from '../../models/level.model';
import { LevelBuilder } from '../level-builder';

const SURFACE = 12;

/**
 * Fase secreta do Vale Verde: o Jardim nas Nuvens.
 *
 * Um prêmio, e não um teste: nenhum inimigo, muitas moedas, molas para
 * brincar e uma placa com um recado para quem descobriu a porta escondida.
 */
export function buildJardimSecreto(): LevelBlueprint {
  const builder = new LevelBuilder(80, DEFAULT_LEVEL_HEIGHT);
  const floor = SURFACE - 1;

  builder.ground(0, 79, SURFACE);
  builder.add('start', 3, floor);
  builder.add('sign', 5, floor, { text: 'Você achou o jardim secreto!' });
  builder.add('mascot-tip', 6, floor, { text: 'Que lugar mágico! Pegue todas as moedas!' });

  for (const x of [12, 30, 48]) {
    builder.add('spring', x, floor);
    builder.row('platform', x + 1, SURFACE - 7, 5);
    builder.coins(x + 1, SURFACE - 8, 5);
    builder.coinArc(x + 6, SURFACE - 3, 5);
  }

  builder.add('crystal', 18, SURFACE - 9);
  builder.add('crystal', 36, SURFACE - 9);
  builder.add('crystal', 54, SURFACE - 9);
  builder.coins(60, floor, 10);
  builder.add('sign', 70, floor, { text: 'Construído pelo Pedro 🧱' });
  builder.add('portal', 74, floor);

  for (const x of [1, 9, 25, 43, 58, 77]) {
    builder.add('flower', x, floor);
  }

  return builder.build({
    id: '1-S',
    name: 'Jardim Secreto',
    theme: 'floresta',
    targetTimeSeconds: 60,
  });
}
