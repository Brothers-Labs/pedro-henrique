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
 * Mundo 2 — Deserto Dourado.
 *
 * O Espinhudo vira o inimigo principal: o deserto ensina a pular por cima, e
 * não em cima. A areia desmorona, o oásis esconde uma sala e a pirâmide é a
 * primeira escalada longa da aventura.
 */

/** 2-1 — Areia Quente: espinhudos, a ponte de arenito e a primeira escadaria do deserto. */
export function buildAreiaQuente(): LevelBlueprint {
  const builder = new LevelBuilder(140, DEFAULT_LEVEL_HEIGHT);

  builder.ground(0, 20, SURFACE);
  builder.add('start', 3, FLOOR);
  builder.add('mascot-tip', 4, FLOOR, { text: 'Que calor! Cuidado com os espinhudos.' });
  builder.coins(7, FLOOR, 4);
  builder.add('hint', 13, SURFACE - 5, { text: 'PULE POR CIMA DO ESPINHUDO!' });
  builder.add('spiky', 16, FLOOR);

  builder.coinArc(20, SURFACE - 3, 5);
  builder.ground(24, 45, SURFACE);
  builder.add('surprise', 28, HEADBUTT_ROW, { contents: 'coins' });
  builder.add('brick', 29, HEADBUTT_ROW);
  builder.add('surprise', 30, HEADBUTT_ROW, { contents: 'crystal' });
  builder.add('brick', 31, HEADBUTT_ROW);
  builder.add('spiky', 36, FLOOR);
  builder.add('slime', 41, FLOOR);

  builder.add('hint', 44, SURFACE - 4, { text: 'A AREIA DESMORONA! CORRA!' });
  builder.row('crumble', 46, SURFACE, 5);
  builder.coins(46, SURFACE - 2, 5);
  builder.ground(51, 90, SURFACE);
  builder.add('checkpoint', 54, FLOOR);
  stoneStairs(builder, 58, true);
  builder.add('robot', 70, FLOOR);
  builder.add('surprise', 74, HEADBUTT_ROW, { contents: 'power-up', powerUp: 'turbo' });
  springShelf(builder, 78, true);

  builder.coinArc(90, SURFACE - 3, 5);
  builder.ground(94, 139, SURFACE);
  builder.add('spiky', 100, FLOOR);
  builder.add('spiky', 106, FLOOR);
  builder.add('slime', 112, FLOOR);
  builder.coins(115, SURFACE - 3, 5);
  builder.add('sign', 125, FLOOR, { text: 'Cuidado: areia quente! ☀️' });
  builder.add('portal', 132, FLOOR);

  scatter(builder, 'tree', [1, 12, 26, 43, 67, 97, 121, 137]);
  scatter(builder, 'rock', [5, 33, 53, 85, 110, 128]);

  return builder.build({ id: '2-1', name: 'Areia Quente', theme: 'deserto', targetTimeSeconds: 85 });
}

/** 2-2 — Oásis Escondido: plataformas móveis, um paredão e a sala do oásis (entrada da 2-S). */
export function buildOasisEscondido(): LevelBlueprint {
  const builder = new LevelBuilder(150, DEFAULT_LEVEL_HEIGHT);

  builder.ground(0, 18, SURFACE);
  builder.add('start', 3, FLOOR);
  builder.add('mascot-tip', 4, FLOOR, { text: 'Dizem que há um oásis escondido por aqui…' });

  builder.add('moving-platform', 20, SURFACE, { axis: 'horizontal', range: 4 });
  builder.coins(21, SURFACE - 3, 4);
  builder.ground(27, 48, SURFACE);
  builder.add('slime', 32, FLOOR);
  builder.add('surprise', 36, HEADBUTT_ROW, { contents: 'crystal' });
  builder.add('spiky', 40, FLOOR);
  doorWithHint(builder, 43, 'oasis');

  builder.add('moving-platform', 46, FLOOR, { axis: 'vertical', range: 4 });
  builder.ground(49, 60, SURFACE - 5);
  builder.coins(50, SURFACE - 7, 4);
  builder.add('robot', 56, SURFACE - 6);

  builder.ground(61, 80, SURFACE);
  builder.add('checkpoint', 64, FLOOR);
  springShelf(builder, 70, true);

  builder.add('moving-platform', 82, SURFACE, { axis: 'horizontal', range: 4 });
  builder.ground(89, 149, SURFACE);
  hiddenRoom(builder, { left: 100, pair: 'oasis', mascotText: 'Água fresquinha! Achamos o oásis!', hasSecretDoor: true });

  builder.add('slime', 118, FLOOR);
  builder.add('spiky', 124, FLOOR);
  builder.add('robot', 130, FLOOR);
  builder.coins(134, SURFACE - 3, 4);
  builder.add('portal', 142, FLOOR);

  scatter(builder, 'tree', [1, 13, 29, 66, 92, 116, 146]);
  scatter(builder, 'bush', [8, 45, 76, 96, 136]);

  return builder.build({ id: '2-2', name: 'Oásis Escondido', theme: 'deserto', targetTimeSeconds: 110 });
}

/** 2-3 — Pirâmide Pequena: subir e descer uma pirâmide de pedra, blocos e mais uma escadaria. */
export function buildPiramidePequena(): LevelBlueprint {
  const builder = new LevelBuilder(150, DEFAULT_LEVEL_HEIGHT);

  builder.ground(0, 75, SURFACE);
  builder.add('start', 3, FLOOR);
  builder.add('mascot-tip', 4, FLOOR, { text: 'Uma pirâmide! Vamos subir até o topo!' });
  builder.add('slime', 20, FLOOR);
  builder.coins(10, SURFACE - 3, 4);

  // Pirâmide: cinco degraus de uma célula de altura, dois de largura.
  for (let step = 0; step < 5; step += 1) {
    builder.fill('stone', 30 + step * 2, 70 - step * 2, SURFACE - 1 - step, SURFACE - 1 - step);
    builder.coins(31 + step * 2, SURFACE - 3 - step, 1);
    builder.coins(69 - step * 2, SURFACE - 3 - step, 1);
  }

  builder.add('robot', 50, SURFACE - 6);
  builder.add('crystal', 48, 3);
  builder.add('sign', 44, SURFACE - 6, { text: 'Topo da pirâmide! 🏆' });

  builder.coinArc(75, SURFACE - 3, 5);
  builder.ground(79, 149, SURFACE);
  builder.add('checkpoint', 84, FLOOR);
  builder.add('brick', 90, HEADBUTT_ROW);
  builder.add('surprise', 91, HEADBUTT_ROW, { contents: 'power-up', powerUp: 'shield' });
  builder.add('brick', 92, HEADBUTT_ROW);
  builder.add('surprise', 93, HEADBUTT_ROW, { contents: 'crystal' });
  builder.row('brick', 94, HEADBUTT_ROW, 3);
  builder.add('spiky', 100, FLOOR);
  builder.add('robot', 108, FLOOR);
  stoneStairs(builder, 117, true);
  builder.add('spiky', 128, FLOOR);
  builder.coins(132, SURFACE - 3, 5);
  builder.add('portal', 142, FLOOR);

  scatter(builder, 'tree', [1, 15, 25, 82, 104, 137]);
  scatter(builder, 'rock', [7, 27, 73, 98, 114, 146]);

  return builder.build({ id: '2-3', name: 'Pirâmide Pequena', theme: 'deserto', targetTimeSeconds: 100 });
}

/** 2-S — Câmara Dourada, a fase secreta do deserto. */
export function buildCamaraDourada(): LevelBlueprint {
  return buildTreasureLevel({
    id: '2-S',
    name: 'Câmara Dourada',
    theme: 'deserto',
    floor: 'ground',
    welcome: 'A câmara secreta do oásis!',
    mascotText: 'Quanto ouro! É tudo seu, Pedro!',
    farewell: 'Os tesouros da areia são seus! 🏜️',
  });
}
