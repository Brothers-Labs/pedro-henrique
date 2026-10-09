import { DIFFICULTY_RULES } from '../../config/rules.config';
import { PLAYER_PHYSICS, SWIM_PHYSICS, TILE_SIZE } from '../../config/physics.config';
import { campaignLevelById } from '../../levels/campaign';
import { LevelBuilder } from '../../levels/level-builder';
import { CLASSIC_POWER_UPS, type LevelBlueprint, type PowerUpKind } from '../../models/level.model';
import type { GameSessionEvent, HudState } from '../../models/session.model';
import { IDLE_INPUT, type InputSnapshot } from '../input/input-snapshot';
import { GameSimulation, STEP_MS } from './game-simulation';
import { bottom, centerX } from './physics-body';

const META = { id: 'teste', name: 'Teste', theme: 'vale', targetTimeSeconds: 60 } as const;
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

/** Aperta o pulo num passo e segura pelos seguintes, como um dedo de verdade. */
function jump(harness: Harness, holdSeconds: number, input: Partial<InputSnapshot> = {}): void {
  harness.simulation.step({ ...IDLE_INPUT, ...input, jumpHeld: true, jumpPressed: true });
  run(harness, holdSeconds, { ...input, jumpHeld: true });
}

function lastHud(events: readonly GameSessionEvent[]): HudState | undefined {
  return events.filter((event) => event.type === 'hud').at(-1)?.hud;
}

/** Fase plana com um poder logo à frente do início: dois passos e o Pedro pega. */
function levelWithPowerUp(powerUp: PowerUpKind): LevelBuilder {
  return flatLevel().add('power-up', 3, SURFACE - 1, { powerUp });
}

/** Encosta o Pedro de lado no primeiro inimigo da fase. */
function bumpIntoFirstEnemy(harness: Harness): void {
  const enemy = harness.simulation.enemies[0];

  harness.simulation.player.placeFeetAt(enemy.body.x - 10, bottom(enemy.body));
  run(harness, 0.2, { right: true });
}

describe('Simulação do Pedro Maker', () => {
  it('assenta o Pedro no chão e anuncia a fase pronta', () => {
    const harness = start(flatLevel().build(META));

    run(harness, 0.2);

    const body = harness.simulation.player.body;

    expect(harness.events[0]).toEqual({ type: 'ready' });
    expect(body.blockedDown).toBeTrue();
    expect(bottom(body)).toBeCloseTo(SURFACE * TILE_SIZE, 3);
  });

  it('pula a altura que o validador de fases espera', () => {
    const harness = start(flatLevel().build(META));
    run(harness, 0.2);

    const groundY = bottom(harness.simulation.player.body);
    let highest = groundY;

    harness.simulation.step({ ...IDLE_INPUT, jumpHeld: true, jumpPressed: true });

    for (let step = 0; step < 90; step += 1) {
      harness.simulation.step({ ...IDLE_INPUT, jumpHeld: true });
      highest = Math.min(highest, bottom(harness.simulation.player.body));
    }

    const expectedApex = PLAYER_PHYSICS.jumpVelocity ** 2 / (2 * 1900);

    expect(groundY - highest).toBeGreaterThan(expectedApex * 0.9);
    expect(groundY - highest).toBeLessThan(expectedApex * 1.1);
  });

  it('corta o pulo quando o botão é solto cedo', () => {
    const full = start(flatLevel().build(META));
    const short = start(flatLevel().build(META));
    run(full, 0.2);
    run(short, 0.2);

    jump(full, 0.5);
    jump(short, 0.05);
    run(short, 0.45);

    expect(bottom(short.simulation.player.body)).toBeGreaterThan(bottom(full.simulation.player.body));
  });

  it('não atravessa parede andando', () => {
    const harness = start(flatLevel().fill('stone', 8, 8, SURFACE - 3, SURFACE - 1).build(META));

    run(harness, 3, { right: true });

    const body = harness.simulation.player.body;

    expect(body.x + body.width).toBeLessThanOrEqual(8 * TILE_SIZE + 0.001);
    expect(body.blockedRight).toBeTrue();
  });

  it('passa por baixo da nuvem e pousa em cima dela', () => {
    const harness = start(flatLevel().row('cloud', 1, SURFACE - 3, 4).build(META));
    run(harness, 0.2);

    jump(harness, 0.6);
    run(harness, 1);

    expect(bottom(harness.simulation.player.body)).toBeCloseTo((SURFACE - 3) * TILE_SIZE, 3);
  });

  it('quebra o tijolo com uma cabeçada', () => {
    const harness = start(flatLevel().add('brick', 2, SURFACE - 3).build(META));
    run(harness, 0.2);

    jump(harness, 0.4);

    expect(harness.simulation.blocks.blockAt(2, SURFACE - 3)?.isBroken).toBeTrue();
    expect(harness.events.some((event) => event.type === 'sound' && event.cue === 'break')).toBeTrue();
  });

  it('abre o bloco surpresa e soma as moedas dele', () => {
    const harness = start(flatLevel().add('surprise', 2, SURFACE - 3).build(META));
    run(harness, 0.2);

    jump(harness, 0.4);

    expect(harness.simulation.blocks.blockAt(2, SURFACE - 3)?.isUsed).toBeTrue();
    expect(lastHud(harness.events)?.coins).toBe(5);
  });

  it('coleta moedas no caminho', () => {
    const harness = start(flatLevel().coins(5, SURFACE - 1, 4).build(META));

    run(harness, 2, { right: true });

    expect(lastHud(harness.events)?.coins).toBe(4);
  });

  it('derrota o slime com um pisão e quica', () => {
    const harness = start(flatLevel().add('slime', 12, SURFACE - 1).build(META));
    run(harness, 0.2);

    const slime = harness.simulation.enemies[0];
    const player = harness.simulation.player;

    player.placeFeetAt(centerX(slime.body), slime.body.y - 4);
    player.body.vy = 300;
    run(harness, 0.1);

    expect(slime.isDefeated).toBeTrue();
    expect(player.body.vy).toBeLessThan(0);
    expect(lastHud(harness.events)?.hearts).toBe(3);
  });

  it('perde um coração ao esbarrar de lado no inimigo', () => {
    const harness = start(flatLevel().add('spiky', 12, SURFACE - 1).build(META));
    run(harness, 0.2);

    const spiky = harness.simulation.enemies[0];

    harness.simulation.player.placeFeetAt(spiky.body.x - 10, bottom(spiky.body));
    run(harness, 0.2, { right: true });

    expect(lastHud(harness.events)?.hearts).toBe(2);
    expect(spiky.isDefeated).toBeFalse();
  });

  it('perde um coração ao cair no buraco e volta ao início', () => {
    const harness = start(flatLevel().clearColumns(5, 8).build(META));

    for (let step = 0; step < 300 && lastHud(harness.events)?.hearts === 3; step += 1) {
      harness.simulation.step({ ...IDLE_INPUT, right: true });
    }

    expect(lastHud(harness.events)?.hearts).toBe(2);
    expect(centerX(harness.simulation.player.body)).toBeLessThan(5 * TILE_SIZE);
  });

  it('mostra o "quase!" quando os corações acabam', () => {
    const harness = start(flatLevel().row('lava', 4, SURFACE, 30).build(META));

    for (let attempt = 0; attempt < 3; attempt += 1) {
      run(harness, 1.5, { right: true });
    }

    run(harness, 1);

    expect(harness.events.some((event) => event.type === 'defeated')).toBeTrue();
    expect(harness.simulation.isDefeated).toBeTrue();

    harness.simulation.retryFromCheckpoint();

    expect(harness.simulation.isDefeated).toBeFalse();
    expect(lastHud(harness.events)?.hearts).toBe(3);
  });

  it('termina a fase no portal com o resultado da partida', () => {
    const harness = start(flatLevel(20).coins(6, SURFACE - 1, 3).build(META));

    run(harness, 6, { right: true });

    const completed = harness.events.find((event) => event.type === 'completed');

    expect(completed?.type).toBe('completed');

    if (completed?.type === 'completed') {
      expect(completed.result.coinsCollected).toBe(3);
      expect(completed.result.coinsTotal).toBe(3);
      expect(completed.result.timeMs).toBeGreaterThan(0);
    }
  });

  it('termina a fase uma vez só, mesmo com o jogo rodando depois do portal', () => {
    const harness = start(flatLevel(20).build(META));

    run(harness, 6, { right: true });
    run(harness, 2, { right: true });

    expect(harness.events.filter((event) => event.type === 'completed').length).toBe(1);
    expect(harness.simulation.isFinished).toBeTrue();
  });

  it('cresce com o Super Cogumelo e encolhe no toque, sem perder coração', () => {
    const harness = start(levelWithPowerUp('mushroom').add('spiky', 14, SURFACE - 1).build(META));
    run(harness, 0.4, { right: true });

    expect(harness.simulation.player.isBig).toBeTrue();

    bumpIntoFirstEnemy(harness);

    expect(harness.simulation.player.isBig).toBeFalse();
    expect(lastHud(harness.events)?.hearts).toBe(3);
    expect(harness.events).toContain({ type: 'power-up-ended', kind: 'mushroom' });
  });

  it('derruba o inimigo só de encostar com a Super Estrela', () => {
    const harness = start(levelWithPowerUp('star').add('spiky', 14, SURFACE - 1).build(META));
    run(harness, 0.4, { right: true });

    bumpIntoFirstEnemy(harness);

    expect(harness.simulation.enemies[0]?.isDefeated ?? true).toBeTrue();
    expect(lastHud(harness.events)?.hearts).toBe(3);
  });

  it('enche os corações com o Cogumelo Vida', () => {
    const harness = start(flatLevel().add('spiky', 14, SURFACE - 1).add('power-up', 25, SURFACE - 1, { powerUp: 'one-up' }).build(META));
    run(harness, 0.2);

    bumpIntoFirstEnemy(harness);

    expect(lastHud(harness.events)?.hearts).toBe(2);

    harness.simulation.player.placeFeetAt(25.5 * TILE_SIZE, SURFACE * TILE_SIZE);
    run(harness, 0.1);

    expect(lastHud(harness.events)?.hearts).toBe(3);
    expect(harness.simulation.player.hasPowerUp('one-up')).toBeFalse();
  });

  it('lança bolas de fogo com a Flor de Fogo e derruba o slime', () => {
    const harness = start(levelWithPowerUp('fire-flower').add('slime', 12, SURFACE - 1).build(META));
    run(harness, 0.4, { right: true });

    expect(harness.simulation.player.isBig).toBeTrue();

    harness.simulation.step({ ...IDLE_INPUT, actionPressed: true });
    run(harness, 1.5);

    expect(harness.events.some((event) => event.type === 'sound' && event.cue === 'fireball')).toBeTrue();
    expect(harness.simulation.enemies.length).toBe(0);
  });

  it('não lança fogo sem a Flor de Fogo', () => {
    const harness = start(flatLevel().build(META));
    run(harness, 0.2);

    harness.simulation.step({ ...IDLE_INPUT, actionPressed: true });

    expect(harness.simulation.fireballs.fireballs.length).toBe(0);
  });

  it('sorteia um poder clássico no Lucky Block', () => {
    const harness = start(flatLevel().add('surprise', 2, SURFACE - 3, { contents: 'lucky' }).build(META));
    run(harness, 0.2);

    jump(harness, 0.4);

    const prize = harness.simulation.collectibles.items.find((item) => item.kind === 'power-up');

    expect(harness.simulation.blocks.blockAt(2, SURFACE - 3)?.isUsed).toBeTrue();
    expect(CLASSIC_POWER_UPS).toContain(prize?.powerUp as (typeof CLASSIC_POWER_UPS)[number]);
  });

  it('nada na água: afunda devagar e sobe com braçadas', () => {
    const harness = start(flatLevel().fill('water', 6, 12, SURFACE - 6, SURFACE - 1).build(META));
    const player = harness.simulation.player;

    player.placeFeetAt(9.5 * TILE_SIZE, (SURFACE - 2) * TILE_SIZE);
    run(harness, 0.5);

    expect(player.isInWater).toBeTrue();
    expect(player.body.vy).toBeLessThanOrEqual(SWIM_PHYSICS.maxSinkSpeed);

    const before = bottom(player.body);

    jump(harness, 0.25);

    expect(bottom(player.body)).toBeLessThan(before);
  });

  it('pega as primeiras moedas da fase 1-1 andando para a direita', () => {
    const level = campaignLevelById('1-1');

    if (!level) {
      throw new Error('A fase 1-1 precisa existir.');
    }

    const harness = start(level.build());

    run(harness, 6, { right: true });

    expect(lastHud(harness.events)?.coins).toBeGreaterThanOrEqual(4);
  });
});
