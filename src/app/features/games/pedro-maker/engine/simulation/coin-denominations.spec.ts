import { paintObjectIcon } from '../../art/texture-catalog';
import { EDITOR_PIECES, findEditorPiece } from '../../config/object-catalog';
import { TILE_SIZE } from '../../config/physics.config';
import { DIFFICULTY_RULES } from '../../config/rules.config';
import { LevelBuilder } from '../../levels/level-builder';
import { analyzeReachability } from '../../levels/level-reachability';
import { formatCoinValue, GIANT_COIN_VALUES, giantCoinType } from '../../models/level.model';
import type { GameSessionEvent } from '../../models/session.model';
import { sanitizeCustomLevel } from '../../services/custom-level.service';
import { CollectibleView } from '../render/collectible-view';
import { WorldSpace } from '../render/world-space';
import { IDLE_INPUT } from '../input/input-snapshot';
import { CollectibleSystem, coinValue } from './collectibles';
import { GameSimulation } from './game-simulation';

describe('Moedas de alto valor do Pedro Maker', () => {
  it('escreve os valores grandes abreviados: mil vira k e milhão vira M', () => {
    expect(formatCoinValue(5)).toBe('5');
    expect(formatCoinValue(5000)).toBe('5000');
    expect(formatCoinValue(10_000)).toBe('10k');
    expect(formatCoinValue(25_000)).toBe('25k');
    expect(formatCoinValue(50_000)).toBe('50k');
    expect(formatCoinValue(500_000)).toBe('500k');
    expect(formatCoinValue(1_000_000)).toBe('1M');
    expect(formatCoinValue(5_000_000)).toBe('5M');
    expect(formatCoinValue(10_000_000)).toBe('10M');
    expect(formatCoinValue(25_000_000)).toBe('25M');
    expect(formatCoinValue(50_000_000)).toBe('50M');
  });

  it('mostra as moedas no editor da menor para a maior, com o valor abreviado no nome', () => {
    const coins = EDITOR_PIECES.filter((piece) => piece.label.startsWith('Moeda Gigante'));

    expect(coins.map((piece) => piece.label)).toEqual([
      'Moeda Gigante 5', 'Moeda Gigante 10', 'Moeda Gigante 25', 'Moeda Gigante 50', 'Moeda Gigante 100',
      'Moeda Gigante 250', 'Moeda Gigante 500', 'Moeda Gigante 1000', 'Moeda Gigante 2500', 'Moeda Gigante 5000',
      'Moeda Gigante 10k', 'Moeda Gigante 25k', 'Moeda Gigante 50k', 'Moeda Gigante 100k', 'Moeda Gigante 250k',
      'Moeda Gigante 500k', 'Moeda Gigante 1M', 'Moeda Gigante 5M', 'Moeda Gigante 10M', 'Moeda Gigante 25M',
      'Moeda Gigante 50M',
    ]);
  });

  for (const value of GIANT_COIN_VALUES) {
    const type = giantCoinType(value);
    const label = formatCoinValue(value);

    it(`oferece e restaura a moeda de ${value} em fases salvas`, () => {
      const object = { id: 'moeda', type, x: 2, y: 11 };
      expect(EDITOR_PIECES.find((piece) => piece.id === type)?.category).toBe('itens');
      expect(findEditorPiece(object)?.type).toBe(type);
      const saved = JSON.stringify({ id: 'fase', name: 'Moedas', width: 40, height: 15, objects: [object] });
      expect(sanitizeCustomLevel(JSON.parse(saved))?.objects).toEqual([jasmine.objectContaining(object)]);
    });

    it(`contabiliza ${value} uma única vez durante a partida`, () => {
      const blueprint = new LevelBuilder(40, 15).ground(0, 39, 12)
        .add('start', 2, 11).add('portal', 38, 11).add(type, 4, 11)
        .build({ id: 'moedas', name: 'Moedas', theme: 'vale', targetTimeSeconds: 60 });
      const events: GameSessionEvent[] = [];
      const simulation = new GameSimulation({ blueprint, hero: 'pedro', rules: DIFFICULTY_RULES.aventura,
        isTouch: false, listener: (event) => events.push(event) });
      expect(simulation.collectibles.coinCount).toBe(value);
      expect(coinValue(type)).toBe(value);
      simulation.announceReady();
      for (let step = 0; step < 60; step += 1) {
        simulation.step({ ...IDLE_INPUT, right: true });
      }
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

    it(`estampa ${label} na moeda de ${value} no editor e nas duas faces 3D`, () => {
      const text = spyOn(CanvasRenderingContext2D.prototype, 'fillText').and.callThrough();
      paintObjectIcon({ type }, 'vale');
      expect(text.calls.allArgs().some(([drawn]) => drawn === label)).toBeTrue();
      text.calls.reset();
      const system = new CollectibleSystem([{ id: 'moeda', type, x: 5, y: 5 }], new Map(), { onCollected: () => {} });
      const view = new CollectibleView(system, new WorldSpace(15 * TILE_SIZE));
      try {
        view.update(0);
        expect(text.calls.allArgs().some(([drawn]) => drawn === label)).toBeTrue();
        expect(view.root.children.some((child) => child.children.length === 3)).toBeTrue();
      } finally {
        view.dispose();
      }
    });
  }
});
