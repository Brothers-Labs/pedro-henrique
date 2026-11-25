import { DIFFICULTY_RULES } from '../../config/rules.config';
import { EXTRA_LIFE, TILE_SIZE } from '../../config/physics.config';
import { LevelBuilder } from '../../levels/level-builder';
import { CLASSIC_POWER_UPS, type LevelBlueprint, type PowerUpKind } from '../../models/level.model';
import type { GameSessionEvent, HudState } from '../../models/session.model';
import { IDLE_INPUT, type InputSnapshot } from '../input/input-snapshot';
import { CRUSHER_CYCLE_MS } from './crushers';
import { WALKING_BOMB } from './enemy';
import { FIRE_TRAP, FIRE_TRAP_CYCLE_MS } from './fire-traps';
import { GameSimulation, STEP_MS } from './game-simulation';
import { bottom, centerX, centerY, isAreaClear } from './physics-body';

const META = { id: 'teste-armadilhas', name: 'Teste', theme: 'vale', targetTimeSeconds: 60 } as const;
const SURFACE = 12;

interface Harness {
  readonly simulation: GameSimulation;
  readonly events: GameSessionEvent[];
}

function flatLevel(width = 40): LevelBuilder {
  return new LevelBuilder(width, 15).ground(0, width - 1, SURFACE).add('start', 2, SURFACE - 1).add('portal', width - 3, SURFACE - 1);
}

function levelWithPowerUp(powerUp: PowerUpKind): LevelBuilder {
  return flatLevel().add('power-up', 3, SURFACE - 1, { powerUp });
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

function heardSound(harness: Harness, cue: string): boolean {
  return harness.events.some((event) => event.type === 'sound' && event.cue === cue);
}

function solidAt(harness: Harness, cellX: number, cellY: number): boolean {
  return !isAreaClear(harness.simulation.grid, { x: cellX * TILE_SIZE + 4, y: cellY * TILE_SIZE + 4, width: 8, height: 8 });
}

/** Pega o poder da coluna 3 andando para a direita e lança com o botão de ação. */
function grabAndThrow(harness: Harness): void {
  run(harness, 0.4, { right: true });
  harness.simulation.step({ ...IDLE_INPUT, actionPressed: true });
}

describe('Armadilha de Fogo', () => {
  const TRAP_ROW = SURFACE - 1;

  it('é um bloco firme, que segura quem pisa em cima', () => {
    const harness = start(flatLevel().add('fire-trap', 10, TRAP_ROW).build(META));

    expect(solidAt(harness, 10, TRAP_ROW)).toBeTrue();
  });

  it('espera apagada, avisa e acende uma coluna de três blocos, num ciclo que se repete', () => {
    const harness = start(flatLevel().add('fire-trap', 10, TRAP_ROW).build(META));
    const system = harness.simulation.fireTraps;
    const [trap] = system.traps;
    const phases = new Set<string>();
    let tallest = 0;

    for (let time = 0; time < FIRE_TRAP_CYCLE_MS; time += 20) {
      phases.add(system.phaseOf(trap, time));
      tallest = Math.max(tallest, system.flameHeight(trap, time));
    }

    expect([...phases].sort()).toEqual(['burn', 'idle', 'warn']);
    expect(tallest).toBe(FIRE_TRAP.flameCells * TILE_SIZE);
    expect(system.flameArea(trap, 0)).withContext('apagada não queima').toBeNull();
    expect(system.phaseOf(trap, 100)).toBe(system.phaseOf(trap, 100 + FIRE_TRAP_CYCLE_MS));
  });

  it('o fogo para no teto: não atravessa o bloco firme de cima', () => {
    const harness = start(flatLevel().add('fire-trap', 10, TRAP_ROW).add('stone', 10, TRAP_ROW - 2).build(META));

    expect(harness.simulation.fireTraps.traps[0].flameCells).toBe(1);
  });

  it('armadilhas vizinhas se revezam', () => {
    const harness = start(flatLevel().add('fire-trap', 10, TRAP_ROW).add('fire-trap', 11, TRAP_ROW).build(META));
    const system = harness.simulation.fireTraps;
    const burning = FIRE_TRAP.idleMs + FIRE_TRAP.warnMs + 10;

    expect(system.phaseOf(system.traps[0], burning)).toBe('burn');
    expect(system.phaseOf(system.traps[1], burning)).toBe('idle');
  });

  it('apagada não machuca quem está em cima; acesa, tira um coração', () => {
    const harness = start(flatLevel().add('fire-trap', 10, TRAP_ROW).build(META));
    run(harness, 0.1);

    harness.simulation.player.placeFeetAt(10.5 * TILE_SIZE, TRAP_ROW * TILE_SIZE);
    run(harness, 0.5);

    expect(lastHud(harness.events)?.hearts).withContext('ainda apagada').toBe(3);

    run(harness, (FIRE_TRAP.idleMs + FIRE_TRAP.warnMs) / 1000);

    expect(lastHud(harness.events)?.hearts).toBe(2);
  });
});

describe('Prensa Esmagadora Larga', () => {
  const CRUSHER_ROW = SURFACE - 4;

  it('tem três blocos de largura, com a peça no bloco do meio', () => {
    const harness = start(flatLevel().add('wide-crusher', 10, CRUSHER_ROW).build(META));
    const system = harness.simulation.crushers;
    const [crusher] = system.crushers;

    expect(crusher.widthCells).toBe(3);
    expect(crusher.cellX).toBe(9);
    expect(crusher.dropCells).toBe(3);
    expect(system.headArea(crusher, 0).width).toBe(3 * TILE_SIZE);
  });

  it('desce só até o chão mais alto embaixo dela', () => {
    const harness = start(flatLevel().add('wide-crusher', 10, CRUSHER_ROW).add('stone', 11, SURFACE - 1).build(META));

    expect(harness.simulation.crushers.crushers[0].dropCells).toBe(2);
  });

  it('parada lá em cima, os três blocos da casa são firmes; a alavanca a levanta e libera', () => {
    const harness = start(flatLevel().add('wide-crusher', 10, CRUSHER_ROW).build(META));
    run(harness, 0.1);

    for (const column of [9, 10, 11]) {
      expect(solidAt(harness, column, CRUSHER_ROW)).withContext(`coluna ${column}`).toBeTrue();
    }

    harness.simulation.crushers.raiseAll(harness.simulation.clockMs);

    for (const column of [9, 10, 11]) {
      expect(solidAt(harness, column, CRUSHER_ROW)).withContext(`coluna ${column}`).toBeFalse();
    }
  });

  it('esmaga o herói embaixo da ponta, e não só do meio', () => {
    const harness = start(flatLevel().add('wide-crusher', 10, CRUSHER_ROW).build(META));
    run(harness, 0.1);

    harness.simulation.player.placeFeetAt(11.5 * TILE_SIZE, SURFACE * TILE_SIZE);
    run(harness, CRUSHER_CYCLE_MS / 1000);

    expect(lastHud(harness.events)?.hearts).toBe(2);
  });
});

describe('Bomb-omb', () => {
  const BOMB_COLUMN = 12;

  function stompFirstBomb(harness: Harness): void {
    const bomb = harness.simulation.enemies[0];
    const player = harness.simulation.player;

    player.placeFeetAt(centerX(bomb.body), bomb.body.y - 4);
    player.body.vy = 300;
    run(harness, 0.1);
  }

  it('patrulha como o goomba e machuca quem encosta de lado', () => {
    const harness = start(flatLevel().add('walking-bomb', BOMB_COLUMN, SURFACE - 1).build(META));
    run(harness, 0.2);

    const bomb = harness.simulation.enemies[0];

    expect(bomb.body.vx).toBeLessThan(0);

    harness.simulation.player.placeFeetAt(bomb.body.x - 10, bottom(bomb.body));
    run(harness, 0.2, { right: true });

    expect(lastHud(harness.events)?.hearts).toBe(2);
  });

  it('pisada, não cai: acende o pavio, para e não machuca quem encosta', () => {
    const harness = start(flatLevel().add('walking-bomb', BOMB_COLUMN, SURFACE - 1).build(META));
    run(harness, 0.2);

    const bomb = harness.simulation.enemies[0];
    const player = harness.simulation.player;

    stompFirstBomb(harness);

    expect(bomb.isFuseLit).toBeTrue();
    expect(bomb.isDefeated).toBeFalse();
    expect(bomb.isHarmful).toBeFalse();
    expect(player.body.vy).withContext('quica no pisão').toBeLessThan(0);

    const parkedX = bomb.body.x;
    player.placeFeetAt(bomb.body.x - 10, bottom(bomb.body));
    run(harness, 0.3, { right: true });

    expect(bomb.body.x).toBeCloseTo(parkedX, 0);
    expect(lastHud(harness.events)?.hearts).toBe(3);
  });

  it('explode quando o pavio acaba: quebra os tijolos e derruba os inimigos em volta', () => {
    const harness = start(
      flatLevel().add('walking-bomb', BOMB_COLUMN, SURFACE - 1).add('brick', 10, SURFACE - 1).add('slime', 14, SURFACE - 1).build(META),
    );
    run(harness, 0.2);

    const [bomb, slime] = harness.simulation.enemies;

    stompFirstBomb(harness);
    harness.simulation.player.placeFeetAt(30.5 * TILE_SIZE, SURFACE * TILE_SIZE);
    run(harness, WALKING_BOMB.fuseMs / 1000);

    expect(bomb.isDefeated).toBeTrue();
    expect(slime.isDefeated).withContext('o slime estava perto').toBeTrue();
    expect(harness.simulation.blocks.blockAt(10, SURFACE - 1)?.isBroken).toBeTrue();
    expect(heardSound(harness, 'explosion')).toBeTrue();
    expect(lastHud(harness.events)?.hearts).withContext('o herói estava longe').toBe(3);
  });

  it('machuca o herói que ficou perto da explosão', () => {
    const harness = start(flatLevel().add('walking-bomb', BOMB_COLUMN, SURFACE - 1).build(META));
    run(harness, 0.2);

    const bomb = harness.simulation.enemies[0];

    stompFirstBomb(harness);
    harness.simulation.player.placeFeetAt(centerX(bomb.body) - TILE_SIZE, SURFACE * TILE_SIZE);
    run(harness, WALKING_BOMB.fuseMs / 1000);

    expect(bomb.isDefeated).toBeTrue();
    expect(lastHud(harness.events)?.hearts).toBe(2);
  });

  it('a bola de fogo acende o pavio em vez de derrubar a bomba', () => {
    const harness = start(levelWithPowerUp('fire-flower').add('walking-bomb', BOMB_COLUMN, SURFACE - 1).build(META));

    grabAndThrow(harness);
    run(harness, 0.6);

    const bomb = harness.simulation.enemies[0];

    expect(bomb.isFuseLit).toBeTrue();
    expect(bomb.isDefeated).toBeFalse();
  });
});

describe('Cogumelo 1UP', () => {
  it('dá um coração a mais, além do máximo da fase, e não fica com o herói', () => {
    const harness = start(flatLevel().add('power-up', 6, SURFACE - 1, { powerUp: 'extra-life-mushroom' }).build(META));
    run(harness, 0.1);

    harness.simulation.player.placeFeetAt(6.5 * TILE_SIZE, SURFACE * TILE_SIZE);
    run(harness, 0.1);

    expect(lastHud(harness.events)?.hearts).toBe(4);
    expect(lastHud(harness.events)?.maxHearts).toBe(4);
    expect(harness.simulation.player.hasPowerUp('extra-life-mushroom')).toBeFalse();
  });

  it('tem um teto de corações extras', () => {
    const columns = [6, 8, 10, 12, 14, 16, 18];
    const builder = flatLevel();

    for (const column of columns) {
      builder.add('power-up', column, SURFACE - 1, { powerUp: 'extra-life-mushroom' });
    }

    const harness = start(builder.build(META));
    run(harness, 0.1);

    for (const column of columns) {
      harness.simulation.player.placeFeetAt((column + 0.5) * TILE_SIZE, SURFACE * TILE_SIZE);
      run(harness, 0.1);
    }

    const maximum = DIFFICULTY_RULES.aventura.hearts + EXTRA_LIFE.maxExtraHearts;

    expect(lastHud(harness.events)?.maxHearts).toBe(maximum);
    expect(lastHud(harness.events)?.hearts).toBe(maximum);
  });

  it('a volta ao checkpoint enche também o coração do 1UP', () => {
    const harness = start(
      flatLevel().add('power-up', 6, SURFACE - 1, { powerUp: 'extra-life-mushroom' }).add('spiky', 14, SURFACE - 1).build(META),
    );
    run(harness, 0.1);

    harness.simulation.player.placeFeetAt(6.5 * TILE_SIZE, SURFACE * TILE_SIZE);
    run(harness, 0.1);

    const spiky = harness.simulation.enemies[0];
    harness.simulation.player.placeFeetAt(spiky.body.x - 10, bottom(spiky.body));
    run(harness, 0.2, { right: true });

    expect(lastHud(harness.events)?.hearts).toBe(3);

    harness.simulation.retryFromCheckpoint();

    expect(lastHud(harness.events)?.hearts).toBe(4);
  });

  it('o Lucky Block sorteia o Cogumelo 1UP no lugar do Cogumelo Vida', () => {
    expect(CLASSIC_POWER_UPS).toContain('extra-life-mushroom');
    expect(CLASSIC_POWER_UPS as readonly PowerUpKind[]).not.toContain('one-up');
  });
});

describe('Flor de Bolha', () => {
  it('sopra bolhas com o botão de ação e prende o slime', () => {
    const harness = start(levelWithPowerUp('bubble-flower').add('slime', 12, SURFACE - 1).build(META));

    grabAndThrow(harness);

    expect(harness.simulation.player.isBig).toBeTrue();
    expect(harness.simulation.fireballs.fireballs[0]?.element).toBe('bubble');
    expect(heardSound(harness, 'bubble')).toBeTrue();

    run(harness, 1.5);

    expect(harness.simulation.enemies.length).toBe(0);
  });

  it('a bolha voa reto: não cai no buraco', () => {
    const harness = start(levelWithPowerUp('bubble-flower').clearColumns(8, 20).build(META));

    grabAndThrow(harness);

    const bubble = harness.simulation.fireballs.fireballs[0];
    const startX = centerX(bubble.body);
    const startY = centerY(bubble.body);

    run(harness, 0.8);

    expect(harness.simulation.fireballs.fireballs).toContain(bubble);
    expect(centerX(bubble.body) - startX).toBeGreaterThan(4 * TILE_SIZE);
    expect(Math.abs(centerY(bubble.body) - startY)).toBeLessThan(TILE_SIZE / 2);
  });

  it('a bolha passa pela água, onde o fogo se apaga', () => {
    const harness = start(levelWithPowerUp('bubble-flower').fill('water', 7, 14, SURFACE - 4, SURFACE - 1).build(META));

    grabAndThrow(harness);
    run(harness, 0.6);

    const [bubble] = harness.simulation.fireballs.fireballs;

    expect(bubble?.element).toBe('bubble');
    expect(harness.simulation.blocks.isWaterAtPoint(centerX(bubble.body), centerY(bubble.body))).toBeTrue();
  });
});
