import { EDITOR_PIECES, findEditorPiece } from '../../config/object-catalog';
import { DIFFICULTY_RULES } from '../../config/rules.config';
import { TILE_SIZE } from '../../config/physics.config';
import { LevelBuilder } from '../../levels/level-builder';
import { analyzeReachability } from '../../levels/level-reachability';
import type { LevelBlueprint } from '../../models/level.model';
import type { GameSessionEvent, HudState } from '../../models/session.model';
import { IDLE_INPUT, type InputSnapshot } from '../input/input-snapshot';
import { coinValue, MEGA_COIN } from './collectibles';
import { GameSimulation, STEP_MS } from './game-simulation';
import { centerX, isAreaClear } from './physics-body';

const META = { id: 'teste-cadeados', name: 'Teste', theme: 'vale', targetTimeSeconds: 60 } as const;
const SURFACE = 12;

interface Harness {
  readonly simulation: GameSimulation;
  readonly events: GameSessionEvent[];
}

function flatLevel(width = 40): LevelBuilder {
  return new LevelBuilder(width, 15).ground(0, width - 1, SURFACE).add('start', 2, SURFACE - 1).add('portal', width - 3, SURFACE - 1);
}

function start(blueprint: LevelBlueprint): Harness {
  const events: GameSessionEvent[] = [];
  const simulation = new GameSimulation({
    blueprint,
    hero: 'pedro',
    rules: DIFFICULTY_RULES.aventura,
    isTouch: false,
    listener: (event) => events.push(event),
  });

  simulation.announceReady();

  return { simulation, events };
}

function run(harness: Harness, seconds: number, input: Partial<InputSnapshot> = {}): void {
  const steps = Math.round((seconds * 1000) / STEP_MS);

  for (let step = 0; step < steps; step += 1) {
    harness.simulation.step({ ...IDLE_INPUT, ...input });
  }
}

function lastHud(events: readonly GameSessionEvent[]): HudState | undefined {
  const huds = events.filter((event): event is Extract<GameSessionEvent, { type: 'hud' }> => event.type === 'hud');

  return huds[huds.length - 1]?.hud;
}

function mascotTexts(events: readonly GameSessionEvent[]): string[] {
  return events.flatMap((event) => (event.type === 'mascot' ? [event.text] : []));
}

function solidAt(harness: Harness, cellX: number, cellY: number): boolean {
  return !isAreaClear(harness.simulation.grid, { x: cellX * TILE_SIZE + 4, y: cellY * TILE_SIZE + 4, width: 8, height: 8 });
}

function playerCellX(harness: Harness): number {
  return Math.floor(centerX(harness.simulation.player.body) / TILE_SIZE);
}

describe('Chave e porta com cadeado', () => {
  it('sem chave a porta segura o herói e avisa; com a chave no bolso ela abre e gasta a chave', () => {
    const harness = start(flatLevel().add('locked-door', 10, SURFACE - 1).build(META));

    run(harness, 3, { right: true });

    expect(playerCellX(harness)).withContext('a porta trancada é uma parede').toBeLessThan(10);
    expect(harness.simulation.locks.doors[0].isOpen).toBeFalse();
    expect(solidAt(harness, 10, SURFACE - 1)).toBeTrue();
    expect(solidAt(harness, 10, SURFACE - 2)).withContext('a porta tem dois blocos de altura').toBeTrue();
    expect(mascotTexts(harness.events)).toContain('Essa porta está trancada! Procure uma chave pela fase.');
  });

  it('pega a chave no caminho, abre a porta e passa por ela', () => {
    const harness = start(flatLevel().add('key', 6, SURFACE - 1).add('locked-door', 10, SURFACE - 1).build(META));

    run(harness, 0.2);
    expect(lastHud(harness.events)?.keys).toBe(0);

    run(harness, 0.9, { right: true });
    expect(harness.simulation.locks.keys[0].isTaken).toBeTrue();
    expect(mascotTexts(harness.events)).toContain('Você pegou uma chave! Encoste numa porta com cadeado para abrir.');
    expect(harness.events.some((event) => event.type === 'hud' && event.hud.keys === 1)).toBeTrue();

    run(harness, 3, { right: true });

    expect(harness.simulation.locks.doors[0].isOpen).toBeTrue();
    expect(lastHud(harness.events)?.keys).withContext('a chave foi gasta na porta').toBe(0);
    expect(solidAt(harness, 10, SURFACE - 1)).toBeFalse();
    expect(solidAt(harness, 10, SURFACE - 2)).toBeFalse();
    expect(playerCellX(harness)).toBeGreaterThan(10);
  });

  it('uma chave abre uma porta só: a segunda porta continua trancada', () => {
    const harness = start(flatLevel().add('key', 6, SURFACE - 1).add('locked-door', 10, SURFACE - 1).add('locked-door', 16, SURFACE - 1).build(META));

    run(harness, 5, { right: true });

    expect(harness.simulation.locks.doors.map((door) => door.isOpen)).toEqual([true, false]);
    expect(playerCellX(harness)).toBeLessThan(16);
  });
});

describe('Corrente e alavanca', () => {
  /** Uma parede de três correntes na coluna 12. */
  const chainWall = (builder: LevelBuilder): LevelBuilder =>
    builder.add('chain', 12, SURFACE - 1).add('chain', 12, SURFACE - 2).add('chain', 12, SURFACE - 3);

  it('a corrente é firme até alguém puxar a alavanca', () => {
    const harness = start(chainWall(flatLevel()).add('lever', 20, SURFACE - 1).build(META));

    run(harness, 3, { right: true });

    expect(playerCellX(harness)).toBeLessThan(12);
    expect(harness.simulation.locks.areChainsOpen).toBeFalse();
    expect(solidAt(harness, 12, SURFACE - 2)).toBeTrue();
  });

  it('encostar na alavanca solta todas as correntes, e o caminho abre', () => {
    const harness = start(chainWall(flatLevel()).add('lever', 6, SURFACE - 1).build(META));

    run(harness, 3, { right: true });

    const { levers, chains } = harness.simulation.locks;

    expect(levers[0].isPulled).toBeTrue();
    expect(chains.every((chain) => chain.isOpen)).toBeTrue();
    expect(solidAt(harness, 12, SURFACE - 1)).toBeFalse();
    expect(solidAt(harness, 12, SURFACE - 3)).toBeFalse();
    expect(playerCellX(harness)).toBeGreaterThan(12);
    expect(mascotTexts(harness.events)).toContain('A alavanca soltou as correntes! O caminho abriu.');
    // A mais perto da alavanca solta primeiro; as outras vêm logo atrás.
    expect(chains.map((chain) => chain.openedAt - levers[0].pulledAt).every((delay) => delay >= 0)).toBeTrue();
  });

  it('o validador de alcance conta com a chave e a alavanca: o portal atrás delas é alcançável', () => {
    const blueprint = chainWall(flatLevel()).add('lever', 6, SURFACE - 1).add('key', 7, SURFACE - 1).add('locked-door', 16, SURFACE - 1).build(META);

    expect(analyzeReachability(blueprint).isPortalReachable).toBeTrue();
  });
});

describe('Moeda Gigantesca', () => {
  it('vale 30 na meta: 10 na hora e uma chuva de 20 moedas', () => {
    expect(coinValue('mega-coin')).toBe(MEGA_COIN.directValue + MEGA_COIN.showerCoins);
    expect(MEGA_COIN.showerCoins).toBe(20);
  });

  it('pega, ela estoura em moedas comuns em volta; as que cairiam no chão já vão para o placar', () => {
    const harness = start(flatLevel().add('mega-coin', 10, SURFACE - 3).build(META));

    run(harness, 0.2);

    const megaCoin = harness.simulation.collectibles.items.find((item) => item.kind === 'mega-coin');

    expect(megaCoin).toBeDefined();
    harness.simulation.player.placeFeetAt(10.5 * TILE_SIZE, (SURFACE - 1) * TILE_SIZE);
    harness.simulation.step(IDLE_INPUT);

    const items = harness.simulation.collectibles.items;
    const shower = items.filter((item) => item.kind === 'coin' && item.spawnedAt !== null);
    const buried = MEGA_COIN.showerCoins - shower.length;

    expect(items.some((item) => item.kind === 'mega-coin')).toBeFalse();
    expect(shower.length).toBeGreaterThan(10);
    expect(buried).withContext('algumas cairiam dentro do chão').toBeGreaterThan(0);
    expect(lastHud(harness.events)?.coins).toBe(MEGA_COIN.directValue + buried);
    expect(shower.every((coin) => !solidAt(harness, Math.floor(coin.x / TILE_SIZE), Math.floor(coin.y / TILE_SIZE)))).toBeTrue();
    expect(mascotTexts(harness.events)).toEqual([]);
  });

  it('a chuva inteira, catada, fecha os 30 da moeda', () => {
    const harness = start(flatLevel().add('mega-coin', 10, SURFACE - 3).build(META));

    run(harness, 0.2);
    harness.simulation.player.placeFeetAt(10.5 * TILE_SIZE, (SURFACE - 1) * TILE_SIZE);
    harness.simulation.step(IDLE_INPUT);

    for (const coin of [...harness.simulation.collectibles.items]) {
      harness.simulation.player.placeFeetAt(coin.x, coin.y + 20);
      harness.simulation.step(IDLE_INPUT);
    }

    expect(harness.simulation.collectibles.items.filter((item) => item.kind === 'coin')).toEqual([]);
    expect(lastHud(harness.events)?.coins).toBe(30);
  });
});

describe('Peças novas no editor', () => {
  it('chave, porta com chave, corrente, alavanca e Moeda Gigantesca estão na paleta', () => {
    const pieces = ['key', 'locked-door', 'chain', 'lever', 'mega-coin'] as const;

    expect(pieces.map((type) => findEditorPiece({ type })?.label)).toEqual(['Chave', 'Porta com Chave', 'Corrente', 'Alavanca', 'Moeda Gigantesca']);
    expect(EDITOR_PIECES.find((piece) => piece.type === 'locked-door')?.category).toBe('portais');
    expect(EDITOR_PIECES.find((piece) => piece.type === 'chain')?.category).toBe('blocos');
  });
});
