import { DEFAULT_LEVEL_HEIGHT } from '../../config/physics.config';
import type { LevelBlueprint } from '../../models/level.model';
import { LevelBuilder } from '../level-builder';

const SURFACE = 12;
const WIDTH = 150;

/**
 * 1-3 — Caverna dos Cristais.
 *
 * Primeira fase com teto: o pulo passa a ter limite, a luz vem só de perto do
 * Pedro e dos cristais nas paredes, e o caminho sobe por um elevador vertical.
 * Os três cristais ficam onde a penumbra esconde — nunca atrás de algo que
 * exija adivinhação.
 */
export function buildCavernaDosCristais(): LevelBlueprint {
  const builder = new LevelBuilder(WIDTH, DEFAULT_LEVEL_HEIGHT);
  const floor = SURFACE - 1;

  builder.fill('stone', 0, WIDTH - 1, 0, 1);

  for (const x of [8, 19, 47, 77, 96, 126, 137]) {
    builder.add('stone', x, 2);
  }

  // Entrada ------------------------------------------------------------------
  builder.ground(0, 21, SURFACE);
  builder.add('start', 3, floor);
  builder.add('mascot-tip', 4, floor, { text: 'Está escuro aqui! Os cristais brilham no caminho.' });
  builder.add('bat', 12, SURFACE - 4);
  builder.coins(9, SURFACE - 3, 5);

  // Elevador até a galeria de cima ---------------------------------------------------
  builder.add('hint', 19, SURFACE - 5, { text: 'O ELEVADOR SOBE!' });
  builder.add('moving-platform', 22, floor, { axis: 'vertical', range: 5 });
  builder.ground(25, 40, SURFACE - 6);
  builder.coins(26, SURFACE - 8, 5);
  builder.add('slime', 32, SURFACE - 7);
  builder.add('crystal', 36, 2);

  // Salão dos slimes ------------------------------------------------------------------
  builder.ground(41, 60, SURFACE);
  builder.add('slime', 46, floor);
  builder.add('surprise', 50, SURFACE - 4, { contents: 'crystal' });
  builder.add('slime', 53, floor);
  builder.add('checkpoint', 58, floor);

  // Escada de plataformas sobre o abismo ---------------------------------------------
  builder.row('platform', 62, SURFACE - 2, 2);
  builder.row('platform', 66, SURFACE - 4, 2);
  builder.row('platform', 70, SURFACE - 2, 2);
  builder.coins(66, SURFACE - 5, 2);
  builder.add('bat', 64, SURFACE - 7);
  builder.add('bat', 69, SURFACE - 7);

  // Galeria das moedas: o ímã faz a festa -----------------------------------------
  builder.ground(73, WIDTH - 1, SURFACE);
  builder.add('spiky', 79, floor);
  builder.add('surprise', 84, SURFACE - 4, { contents: 'power-up', powerUp: 'magnet' });
  builder.coins(87, SURFACE - 3, 9);
  builder.coins(87, SURFACE - 5, 9);

  // Túnel baixo com o último cristal no escuro -------------------------------------
  builder.fill('stone', 102, 110, 2, SURFACE - 3);
  builder.add('mascot-tip', 99, floor, { text: 'Um túnel! Será que tem algo brilhando lá dentro?' });
  builder.add('crystal', 106, floor);

  builder.add('slime', 115, floor);
  builder.add('surprise', 118, SURFACE - 4, { contents: 'heart' });
  builder.add('slime', 122, floor);
  builder.coins(128, SURFACE - 3, 4);
  builder.add('portal', 140, floor);

  for (const x of [1, 14, 44, 56, 75, 98, 113, 131, 145]) {
    builder.add('tree', x, floor);
  }

  for (const x of [6, 17, 43, 52, 81, 95, 120, 135]) {
    builder.add(x % 2 === 0 ? 'flower' : 'bush', x, floor);
  }

  return builder.build({
    id: '1-3',
    name: 'Caverna dos Cristais',
    theme: 'caverna',
    targetTimeSeconds: 100,
  });
}
