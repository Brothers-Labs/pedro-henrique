import { DEFAULT_LEVEL_HEIGHT } from '../../config/physics.config';
import type { LevelBlueprint } from '../../models/level.model';
import { LevelBuilder } from '../level-builder';
import {
  buildTreasureLevel,
  doorWithHint,
  FLOOR,
  HEADBUTT_ROW,
  hiddenRoom,
  lavaPit,
  scatter,
  springShelf,
  stoneStairs,
  SURFACE,
} from './sections';

/**
 * Mundo 4 — Vulcão Flamejante.
 *
 * Os buracos viram lava: cair continua custando só um coração e volta ao
 * checkpoint, mas agora dá para ver o perigo lá embaixo. Os robôs patrulham
 * as margens e as pontes de basalto desmoronam atrás do Pedro.
 */

/** 4-1 — Pedras Quentes: os primeiros poços de lava, curtos o bastante para um pulo só. */
export function buildPedrasQuentes(): LevelBlueprint {
  const builder = new LevelBuilder(140, DEFAULT_LEVEL_HEIGHT);

  builder.ground(0, 139, SURFACE);
  builder.add('start', 3, FLOOR);
  builder.add('mascot-tip', 4, FLOOR, { text: 'Lava quente! Não encoste nela.' });
  builder.coins(8, FLOOR, 4);

  builder.add('hint', 16, SURFACE - 5, { text: 'PULE POR CIMA DA LAVA!' });
  lavaPit(builder, 19, 21);
  builder.coinArc(18, SURFACE - 3, 5);
  builder.add('robot', 30, FLOOR);
  builder.add('surprise', 35, HEADBUTT_ROW, { contents: 'crystal' });

  lavaPit(builder, 41, 43);
  builder.add('checkpoint', 47, FLOOR);
  stoneStairs(builder, 52, true);
  builder.add('spiky', 63, FLOOR);

  lavaPit(builder, 71, 73);
  builder.coinArc(70, SURFACE - 3, 5);
  springShelf(builder, 80, true);
  builder.add('robot', 92, FLOOR);

  lavaPit(builder, 101, 103);
  builder.add('spiky', 110, FLOOR);
  builder.add('surprise', 114, HEADBUTT_ROW, { contents: 'heart' });
  builder.add('robot', 118, FLOOR);
  builder.coins(122, SURFACE - 3, 4);
  builder.add('portal', 130, FLOOR);

  scatter(builder, 'tree', [1, 14, 27, 49, 77, 97, 107, 126]);
  scatter(builder, 'rock', [12, 38, 66, 89, 135]);

  return builder.build({ id: '4-1', name: 'Pedras Quentes', theme: 'vulcao', targetTimeSeconds: 85 });
}

/** 4-2 — Rio de Lava: plataformas sobre o rio e a forja escondida (entrada da 4-S). */
export function buildRioDeLava(): LevelBlueprint {
  const builder = new LevelBuilder(150, DEFAULT_LEVEL_HEIGHT);

  builder.ground(0, 149, SURFACE);
  builder.add('start', 3, FLOOR);
  builder.add('mascot-tip', 4, FLOOR, { text: 'Um rio de lava! As plataformas vão ajudar.' });

  lavaPit(builder, 17, 24);
  builder.add('moving-platform', 18, SURFACE, { axis: 'horizontal', range: 4 });
  builder.coins(19, SURFACE - 3, 4);
  builder.add('robot', 32, FLOOR);
  builder.add('surprise', 37, HEADBUTT_ROW, { contents: 'crystal' });
  doorWithHint(builder, 42, 'forja');

  lavaPit(builder, 45, 52);
  builder.row('platform', 46, SURFACE - 2, 2);
  builder.row('platform', 50, SURFACE - 2, 2);
  builder.coins(46, SURFACE - 3, 2);
  builder.coins(50, SURFACE - 3, 2);

  builder.add('checkpoint', 56, FLOOR);
  springShelf(builder, 64, true);
  builder.add('spiky', 74, FLOOR);

  lavaPit(builder, 81, 88);
  builder.add('moving-platform', 82, SURFACE, { axis: 'horizontal', range: 4 });
  hiddenRoom(builder, { left: 98, pair: 'forja', mascotText: 'Uma forja secreta dentro do vulcão!', hasSecretDoor: true });

  builder.add('robot', 118, FLOOR);
  builder.add('spiky', 124, FLOOR);
  builder.add('robot', 131, FLOOR);
  builder.add('portal', 142, FLOOR);

  scatter(builder, 'tree', [1, 13, 28, 58, 92, 115, 137]);
  scatter(builder, 'rock', [9, 40, 77, 128, 147]);

  return builder.build({ id: '4-2', name: 'Rio de Lava', theme: 'vulcao', targetTimeSeconds: 110 });
}

/** 4-3 — Pontes de Basalto: pontes que desmoronam sobre a lava e robôs nas margens. */
export function buildPontesDeBasalto(): LevelBlueprint {
  const builder = new LevelBuilder(150, DEFAULT_LEVEL_HEIGHT);

  builder.ground(0, 149, SURFACE);
  builder.add('start', 3, FLOOR);
  builder.add('mascot-tip', 4, FLOOR, { text: 'Pontes de basalto… elas desmoronam! Corra!' });

  for (const bridge of [19, 45, 77]) {
    lavaPit(builder, bridge, bridge + 4);
    builder.row('crumble', bridge, SURFACE, 5);
    builder.coins(bridge, SURFACE - 2, 5);
  }

  builder.add('robot', 30, FLOOR);
  builder.add('surprise', 36, HEADBUTT_ROW, { contents: 'crystal' });
  builder.add('checkpoint', 53, FLOOR);
  stoneStairs(builder, 58, true);
  builder.add('surprise', 70, HEADBUTT_ROW, { contents: 'power-up', powerUp: 'shield' });
  springShelf(builder, 88, true);
  builder.add('robot', 100, FLOOR);

  lavaPit(builder, 111, 113);
  builder.coinArc(110, SURFACE - 3, 5);
  builder.add('spiky', 120, FLOOR);
  builder.add('robot', 128, FLOOR);
  builder.add('portal', 142, FLOOR);

  scatter(builder, 'tree', [1, 14, 27, 51, 74, 96, 117, 137]);
  scatter(builder, 'rock', [10, 42, 67, 106, 134, 147]);

  return builder.build({ id: '4-3', name: 'Pontes de Basalto', theme: 'vulcao', targetTimeSeconds: 100 });
}

/** 4-S — Forja Secreta, a fase secreta do vulcão. */
export function buildForjaSecreta(): LevelBlueprint {
  return buildTreasureLevel({
    id: '4-S',
    name: 'Forja Secreta',
    theme: 'vulcao',
    floor: 'stone',
    welcome: 'A forja escondida do vulcão!',
    mascotText: 'Aqui não tem lava, só tesouro. Pode pular à vontade!',
    farewell: 'Forjado pelo Pedro 🔨',
  });
}
