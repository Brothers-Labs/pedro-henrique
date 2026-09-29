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
 * Mundo 3 — Montanha Congelada.
 *
 * O gelo muda o jeito de andar: o Pedro escorrega e demora a parar. As fases
 * alternam trechos de neve firme e de gelo para a criança sentir a diferença,
 * e os morcegos passam a guardar o alto das colinas.
 */

/** 3-1 — Primeira Neve: o primeiro chão de gelo, com neve firme entre um trecho e outro. */
export function buildPrimeiraNeve(): LevelBlueprint {
  const builder = new LevelBuilder(140, DEFAULT_LEVEL_HEIGHT);

  builder.ground(0, 40, SURFACE);
  builder.add('start', 3, FLOOR);
  builder.add('mascot-tip', 4, FLOOR, { text: 'Brrr! O chão de gelo escorrega, vá com calma.' });
  builder.ground(18, 40, SURFACE, 'ice');
  builder.add('hint', 18, SURFACE - 5, { text: 'O GELO ESCORREGA!' });
  builder.coins(20, FLOOR, 5);
  builder.add('slime', 27, FLOOR);
  builder.add('surprise', 32, HEADBUTT_ROW, { contents: 'crystal' });

  builder.coinArc(40, SURFACE - 3, 5);
  builder.ground(44, 70, SURFACE);
  builder.add('checkpoint', 47, FLOOR);
  builder.add('bat', 55, SURFACE - 4);
  springShelf(builder, 60, true);

  builder.ground(71, 95, SURFACE, 'ice');
  builder.add('spiky', 78, FLOOR);
  builder.coins(81, SURFACE - 3, 4);
  stoneStairs(builder, 87, true);

  builder.coinArc(95, SURFACE - 3, 5);
  builder.ground(99, 139, SURFACE);
  builder.add('bat', 105, SURFACE - 4);
  builder.add('slime', 112, FLOOR);
  builder.add('surprise', 118, HEADBUTT_ROW, { contents: 'heart' });
  builder.add('sign', 124, FLOOR, { text: 'Cuidado: gelo fino! ❄️' });
  builder.add('portal', 130, FLOOR);

  scatter(builder, 'tree', [1, 13, 46, 52, 100, 122, 136]);
  scatter(builder, 'rock', [9, 68, 108]);

  return builder.build({ id: '3-1', name: 'Primeira Neve', theme: 'gelo', targetTimeSeconds: 85 });
}

/** 3-2 — Lago Congelado: plataformas sobre os buracos do lago e um paredão para subir. */
export function buildLagoCongelado(): LevelBlueprint {
  const builder = new LevelBuilder(150, DEFAULT_LEVEL_HEIGHT);

  builder.ground(0, 16, SURFACE);
  builder.add('start', 3, FLOOR);
  builder.add('mascot-tip', 4, FLOOR, { text: 'O lago está congelado… mas tem buracos!' });

  builder.add('moving-platform', 18, SURFACE, { axis: 'horizontal', range: 4 });
  builder.ground(25, 44, SURFACE, 'ice');
  builder.add('bat', 31, SURFACE - 4);
  builder.add('surprise', 36, HEADBUTT_ROW, { contents: 'crystal' });
  builder.add('slime', 41, FLOOR);

  builder.row('platform', 46, SURFACE - 2, 2);
  builder.row('platform', 50, SURFACE - 4, 2);
  builder.row('platform', 54, SURFACE - 2, 2);
  builder.coins(50, SURFACE - 5, 2);

  builder.ground(57, 68, SURFACE);
  builder.add('checkpoint', 60, FLOOR);
  builder.add('moving-platform', 66, FLOOR, { axis: 'vertical', range: 4 });
  builder.ground(69, 82, SURFACE - 5);
  builder.coins(70, SURFACE - 7, 4);
  builder.add('crystal', 76, 2);
  builder.add('spiky', 79, SURFACE - 6);

  builder.ground(83, 110, SURFACE, 'ice');
  builder.add('spiky', 90, FLOOR);
  builder.add('bat', 96, SURFACE - 4);
  springShelf(builder, 100, true);

  builder.add('moving-platform', 112, SURFACE, { axis: 'horizontal', range: 3 });
  builder.ground(118, 149, SURFACE);
  builder.add('robot', 125, FLOOR);
  builder.coins(132, SURFACE - 3, 5);
  builder.add('portal', 142, FLOOR);

  scatter(builder, 'tree', [1, 12, 58, 63, 121, 138, 147]);
  scatter(builder, 'bush', [8, 86, 129]);

  return builder.build({ id: '3-2', name: 'Lago Congelado', theme: 'gelo', targetTimeSeconds: 105 });
}

/** 3-3 — Trilha do Pinheiro: colinas em degraus, morcegos e a sala no alto dos pinheiros (entrada da 3-S). */
export function buildTrilhaDoPinheiro(): LevelBlueprint {
  const builder = new LevelBuilder(150, DEFAULT_LEVEL_HEIGHT);

  builder.ground(0, 20, SURFACE);
  builder.add('start', 3, FLOOR);
  builder.add('mascot-tip', 4, FLOOR, { text: 'Os morcegos moram nos pinheiros. Fique de olho!' });
  builder.add('bat', 13, SURFACE - 4);
  builder.add('surprise', 17, HEADBUTT_ROW, { contents: 'crystal' });

  builder.ground(21, 30, SURFACE - 2);
  builder.coins(23, SURFACE - 4, 4);
  builder.ground(31, 40, SURFACE - 4);
  builder.coins(33, SURFACE - 6, 4);
  builder.add('bat', 36, SURFACE - 8);

  builder.ground(41, 60, SURFACE);
  doorWithHint(builder, 44, 'pinheiro');
  builder.add('checkpoint', 50, FLOOR);
  builder.ground(52, 60, SURFACE, 'ice');

  builder.row('platform', 62, SURFACE - 2, 2);
  builder.row('platform', 66, SURFACE - 2, 2);
  builder.ground(69, 149, SURFACE);
  springShelf(builder, 74, true);
  hiddenRoom(builder, { left: 90, pair: 'pinheiro', mascotText: 'Uma cabana escondida no alto dos pinheiros!', hasSecretDoor: true });

  builder.add('bat', 110, SURFACE - 4);
  builder.add('bat', 118, SURFACE - 5);
  builder.add('slime', 125, FLOOR);
  builder.add('spiky', 131, FLOOR);
  builder.add('portal', 142, FLOOR);

  scatter(builder, 'tree', [1, 10, 48, 71, 86, 107, 115, 137, 147]);
  scatter(builder, 'rock', [7, 57, 122]);

  return builder.build({ id: '3-3', name: 'Trilha do Pinheiro', theme: 'gelo', targetTimeSeconds: 105 });
}

/** 3-S — Palácio de Gelo, a fase secreta da montanha. */
export function buildPalacioDeGelo(): LevelBlueprint {
  return buildTreasureLevel({
    id: '3-S',
    name: 'Palácio de Gelo',
    theme: 'gelo',
    floor: 'ice',
    welcome: 'Bem-vindo ao Palácio de Gelo!',
    mascotText: 'Tudo aqui brilha! Cuidado para não escorregar!',
    farewell: 'Um palácio só para o Pedro ❄️',
  });
}
