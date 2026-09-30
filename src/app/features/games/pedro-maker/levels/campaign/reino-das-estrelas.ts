import { DEFAULT_LEVEL_HEIGHT } from '../../config/physics.config';
import type { LevelBlueprint } from '../../models/level.model';
import { LevelBuilder } from '../level-builder';
import {
  buildTreasureLevel,
  doorWithHint,
  FLOOR,
  HEADBUTT_ROW,
  hiddenRoom,
  scatter,
  springShelf,
  stoneStairs,
  SURFACE,
} from './sections';

/**
 * Mundo 5 — Reino das Estrelas.
 *
 * O chão fica raro: o caminho é feito de nuvens, molas e elevadores. Os
 * fantasminhas somem de tempos em tempos, e quando estão clarinhos o Pedro
 * pode passar por eles sem se machucar.
 */

/** Nuvens em escada: coluna inicial e linha de cada nuvem, todas com três células. */
const CLOUD_STAIRS: readonly (readonly [number, number])[] = [
  [18, SURFACE - 2],
  [23, SURFACE - 4],
  [28, SURFACE - 6],
  [33, SURFACE - 4],
  [38, SURFACE - 2],
  [43, SURFACE - 4],
  [48, SURFACE - 2],
  [53, SURFACE],
];

/** 5-1 — Escada de Nuvens: pular de nuvem em nuvem sobre o vazio. */
export function buildEscadaDeNuvens(): LevelBlueprint {
  const builder = new LevelBuilder(140, DEFAULT_LEVEL_HEIGHT);

  builder.ground(0, 16, SURFACE);
  builder.add('start', 3, FLOOR);
  builder.add('mascot-tip', 4, FLOOR, { text: 'Estamos no céu! Pule de nuvem em nuvem.' });

  for (const [x, row] of CLOUD_STAIRS) {
    builder.row('platform', x, row, 3);
    builder.coins(x, row - 1, 3);
  }

  builder.add('crystal', 29, 3);
  builder.add('ghost', 40, SURFACE - 7);

  builder.ground(57, 80, SURFACE);
  builder.add('checkpoint', 60, FLOOR);
  builder.add('ghost', 68, SURFACE - 3);
  builder.add('surprise', 74, HEADBUTT_ROW, { contents: 'crystal' });

  builder.add('moving-platform', 82, SURFACE, { axis: 'horizontal', range: 4 });
  builder.row('platform', 89, SURFACE - 2, 3);
  builder.row('platform', 94, SURFACE - 2, 3);
  builder.coins(89, SURFACE - 3, 3);
  builder.coins(94, SURFACE - 3, 3);

  builder.ground(99, 139, SURFACE);
  springShelf(builder, 106, true);
  builder.add('ghost', 118, SURFACE - 3);
  builder.add('ghost', 125, SURFACE - 3);
  builder.add('portal', 132, FLOOR);

  scatter(builder, 'tree', [1, 12, 64, 78, 102, 128, 137]);
  scatter(builder, 'flower', [7, 58, 71, 115, 121]);

  return builder.build({ id: '5-1', name: 'Escada de Nuvens', theme: 'estrelas', targetTimeSeconds: 90 });
}

/** 5-2 — Jardim de Estrelas: fantasminhas, molas e o observatório escondido (entrada da 5-S). */
export function buildJardimDeEstrelas(): LevelBlueprint {
  const builder = new LevelBuilder(150, DEFAULT_LEVEL_HEIGHT);

  builder.ground(0, 44, SURFACE);
  builder.add('start', 3, FLOOR);
  builder.add('mascot-tip', 4, FLOOR, {
    text: 'Os fantasminhas somem e aparecem. Passe quando estiverem clarinhos!',
  });
  builder.add('hint', 12, SURFACE - 6, { text: 'PASSE PELO FANTASMA QUANDO ELE SUMIR' });
  builder.add('ghost', 15, SURFACE - 3);
  springShelf(builder, 24, true);
  doorWithHint(builder, 40, 'observatorio');

  builder.row('platform', 46, SURFACE - 2, 3);
  builder.row('platform', 51, SURFACE - 3, 3);
  builder.coins(46, SURFACE - 3, 3);
  builder.coins(51, SURFACE - 4, 3);

  builder.ground(57, 149, SURFACE);
  builder.add('checkpoint', 60, FLOOR);
  builder.add('ghost', 68, SURFACE - 3);
  builder.add('surprise', 72, HEADBUTT_ROW, { contents: 'crystal' });
  builder.add('bat', 80, SURFACE - 4);
  hiddenRoom(builder, { left: 94, pair: 'observatorio', mascotText: 'Um observatório! Dá para ver todas as estrelas!', hasSecretDoor: true });

  springShelf(builder, 115, false);
  builder.add('ghost', 128, SURFACE - 3);
  builder.add('ghost', 136, SURFACE - 3);
  builder.add('portal', 142, FLOOR);

  scatter(builder, 'tree', [1, 9, 34, 63, 86, 112, 125, 147]);
  scatter(builder, 'flower', [6, 20, 58, 76, 132]);

  return builder.build({ id: '5-2', name: 'Jardim de Estrelas', theme: 'estrelas', targetTimeSeconds: 105 });
}

/** 5-3 — Lua Saltitante: mola para o paredão, elevador lunar e a última escadaria antes do chefão. */
export function buildLuaSaltitante(): LevelBlueprint {
  const builder = new LevelBuilder(150, DEFAULT_LEVEL_HEIGHT);

  builder.ground(0, 19, SURFACE);
  builder.add('start', 3, FLOOR);
  builder.add('mascot-tip', 4, FLOOR, { text: 'Na lua tudo pula! Use as molas.' });
  // A mola fica afastada do paredão: o salto sobe livre e cai lá em cima.
  builder.add('spring', 16, FLOOR);
  builder.ground(20, 30, SURFACE - 6);
  builder.coins(21, SURFACE - 8, 4);
  builder.add('crystal', 28, 2);

  builder.ground(31, 38, SURFACE);
  builder.add('moving-platform', 34, FLOOR, { axis: 'vertical', range: 5 });
  builder.ground(39, 48, SURFACE - 6);
  builder.add('surprise', 44, 2, { contents: 'crystal' });
  builder.add('ghost', 46, SURFACE - 9);

  builder.ground(49, 80, SURFACE);
  builder.add('checkpoint', 52, FLOOR);
  builder.add('ghost', 60, SURFACE - 3);
  builder.add('bat', 66, SURFACE - 4);
  springShelf(builder, 70, false);

  builder.add('moving-platform', 82, SURFACE, { axis: 'horizontal', range: 5 });
  builder.row('platform', 90, SURFACE - 2, 3);
  builder.coins(90, SURFACE - 3, 3);
  builder.ground(95, 149, SURFACE);
  stoneStairs(builder, 104, true);

  builder.add('ghost', 118, SURFACE - 3);
  builder.add('robot', 124, FLOOR);
  builder.add('ghost', 132, SURFACE - 3);
  builder.add('sign', 138, FLOOR, { text: 'Próxima parada: o Cometa Rei! ☄️' });
  builder.add('portal', 142, FLOOR);

  scatter(builder, 'tree', [1, 11, 55, 78, 98, 114, 129, 147]);
  scatter(builder, 'flower', [7, 33, 62, 101, 121]);

  return builder.build({ id: '5-3', name: 'Lua Saltitante', theme: 'estrelas', targetTimeSeconds: 100 });
}

/** 5-S — Observatório Estelar, a fase secreta do céu. */
export function buildObservatorioEstelar(): LevelBlueprint {
  return buildTreasureLevel({
    id: '5-S',
    name: 'Observatório Estelar',
    theme: 'estrelas',
    floor: 'ground',
    welcome: 'O observatório secreto das estrelas!',
    mascotText: 'Quantas estrelas! Pegue todas as moedas do céu!',
    farewell: 'Constelação do Pedro ⭐',
  });
}
