import { paintObjectIcon } from '../../art/texture-catalog';
import { EDITOR_PIECES, findEditorPiece } from '../../config/object-catalog';
import { TILE_SIZE } from '../../config/physics.config';
import { DIFFICULTY_RULES } from '../../config/rules.config';
import { LevelBuilder } from '../../levels/level-builder';
import { analyzeReachability } from '../../levels/level-reachability';
import type { ItemType } from '../../models/level.model';
import type { GameSessionEvent } from '../../models/session.model';
import { sanitizeCustomLevel } from '../../services/custom-level.service';
import { CollectibleView } from '../render/collectible-view';
import { WorldSpace } from '../render/world-space';
import { IDLE_INPUT } from '../input/input-snapshot';
import { CollectibleSystem, coinValue } from './collectibles';
import { GameSimulation } from './game-simulation';

describe('Moedas de alto valor do Pedro Maker', () => {
  for (const value of [2500, 5000, 10000, 50000]) {
    const type = `coin-${value}` as ItemType;

    it(`oferece e restaura a moeda de ${value} em fases salvas`, () => {
      const object = { id: 'moeda', type, x: 2, y: 11 };
      expect(EDITOR_PIECES.find((piece) => piece.id === type)?.category).toBe('itens');
      expect(findEditorPiece(object)?.type).toBe(type);
      const saved = JSON.stringify({ id: 'fase', name: 'Moedas', width: 40, height: 15, objects: [object] });
      expect(sanitizeCustomLevel(JSON.parse(saved))?.objects).toEqual([jasmine.objectContaining(object)]);
    });

    it(`contabiliza ${value} uma única vez durante a partida`, () => {
      const blueprint = new LevelBuilder(40, 15).ground(0, 39, 12)
        .add('start', 2, 11).add('portal', 38, 11).add(type, 2, 11)
        .build({ id: 'moedas', name: 'Moedas', theme: 'vale', targetTimeSeconds: 60 });
      const events: GameSessionEvent[] = [];
      const simulation = new GameSimulation({ blueprint, hero: 'pedro', rules: DIFFICULTY_RULES.aventura,
        isTouch: false, listener: (event) => events.push(event) });
      expect(simulation.collectibles.coinCount).toBe(value);
      expect(coinValue(type)).toBe(value);
      simulation.step(IDLE_INPUT);
      simulation.step(IDLE_INPUT);
      expect(events.filter((event) => event.type === 'hud').at(-1)?.hud.coins).toBe(value);
      expect(simulation.collectibles.items).toEqual([]);
    });

    it(`atrai a moeda de ${value} com o ímã e coleta uma vez`, () => {
      const onCollected = jasmine.createSpy('onCollected');
      const system = new CollectibleSystem([{ id: 'moeda', type, x: 5, y: 5 }], new Map(), { onCollected });
      expect(system.items.length).toBe(1);
      system.update(100, 5.5 * TILE_SIZE - 60, 5.5 * TILE_SIZE, true);
      system.update(100, 5.5 * TILE_SIZE - 60, 5.5 * TILE_SIZE, true);
      expect(onCollected).toHaveBeenCalledTimes(1);
      expect(system.coinCount).toBe(0);
    });

    it(`detecta a moeda de ${value} fora de alcance`, () => {
      const blueprint = new LevelBuilder(40, 15).ground(0, 39, 12)
        .add('start', 2, 11).add('portal', 38, 11).add(type, 10, 1)
        .build({ id: 'alcance', name: 'Alcance', theme: 'vale', targetTimeSeconds: 60 });
      expect(analyzeReachability(blueprint).unreachableCollectibles.map((object) => object.type)).toEqual([type]);
    });

    it(`desenha ${value} por inteiro no editor e nas duas faces 3D`, () => {
      const text = spyOn(CanvasRenderingContext2D.prototype, 'fillText').and.callThrough();
      paintObjectIcon({ type }, 'vale');
      expect(text.calls.allArgs().some(([label]) => label === String(value))).toBeTrue();
      text.calls.reset();
      const system = new CollectibleSystem([{ id: 'moeda', type, x: 5, y: 5 }], new Map(), { onCollected: () => {} });
      const view = new CollectibleView(system, new WorldSpace(15 * TILE_SIZE));
      try {
        view.update(0);
        expect(text.calls.allArgs().some(([label]) => label === String(value))).toBeTrue();
        expect(view.root.children.some((child) => child.children.length === 3)).toBeTrue();
      } finally {
        view.dispose();
      }
    });
  }
});
