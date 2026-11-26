import { DIFFICULTY_RULES } from '../../config/rules.config';
import { DOUBLE_CHERRY, POW_BLOCK, PROPELLER_SUIT_PHYSICS, TILE_SIZE, WING_CAP_PHYSICS } from '../../config/physics.config';
import { LevelBuilder } from '../../levels/level-builder';
import type { LevelBlueprint, LevelObjectType, PowerUpKind } from '../../models/level.model';
import type { GameSessionEvent, HudState } from '../../models/session.model';
import { IDLE_INPUT, type InputSnapshot } from '../input/input-snapshot';
import type { Enemy } from './enemy';
import { GameSimulation, STEP_MS } from './game-simulation';
import { bottom, centerX, isAreaClear } from './physics-body';

const META = { id: 'teste-pow-e-trajes', name: 'Teste', theme: 'vale', targetTimeSeconds: 60 } as const;
const SURFACE = 12;
const GROUND_Y = SURFACE * TILE_SIZE;
/** Três blocos acima do chão: a cabeça do herói alcança num pulo parado. */
const HEAD_ROW = SURFACE - 3;
const HEARTS = DIFFICULTY_RULES.aventura.hearts;

interface Harness {
  readonly simulation: GameSimulation;
  readonly events: GameSessionEvent[];
}

function flatLevel(width = 40, terrain: LevelObjectType = 'ground'): LevelBuilder {
  return new LevelBuilder(width, 15)
    .ground(0, width - 1, SURFACE, terrain)
    .add('start', 2, SURFACE - 1)
    .add('portal', width - 3, SURFACE - 1);
}

function levelWithPowerUp(powerUp: PowerUpKind, terrain: LevelObjectType = 'ground'): LevelBuilder {
  return flatLevel(40, terrain).add('power-up', 3, SURFACE - 1, { powerUp });
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

function press(harness: Harness, input: Partial<InputSnapshot>): void {
  harness.simulation.step({ ...IDLE_INPUT, ...input });
}

function lastHud(events: readonly GameSessionEvent[]): HudState | undefined {
  const huds = events.filter((event): event is Extract<GameSessionEvent, { type: 'hud' }> => event.type === 'hud');

  return huds[huds.length - 1]?.hud;
}

function solidAt(harness: Harness, cellX: number, cellY: number): boolean {
  return !isAreaClear(harness.simulation.grid, { x: cellX * TILE_SIZE + 4, y: cellY * TILE_SIZE + 4, width: 8, height: 8 });
}

/** Pega o poder da coluna 3 andando para a direita e para. */
function grab(harness: Harness): void {
  run(harness, 0.4, { right: true });
  run(harness, 0.4);
}

/** Um pulo parado, segurando o botão até a cabeça bater, e a volta ao chão. */
function bumpHead(harness: Harness): void {
  press(harness, { jumpPressed: true, jumpHeld: true });
  run(harness, 0.35, { jumpHeld: true });
  run(harness, 0.8);
}

/** O ponto mais alto que os pés alcançam enquanto a partida anda `seconds` segundos. */
function highestFeet(harness: Harness, seconds: number, input: Partial<InputSnapshot> = {}): number {
  const body = harness.simulation.player.body;
  let highest = bottom(body);

  for (let elapsed = 0; elapsed < seconds * 1000; elapsed += STEP_MS) {
    press(harness, input);
    highest = Math.min(highest, bottom(body));
  }

  return highest;
}

function enemyAt(harness: Harness, cellX: number): Enemy {
  const enemy = harness.simulation.enemies.find((candidate) => Math.floor(centerX(candidate.body) / TILE_SIZE) === cellX);

  if (!enemy) {
    throw new Error(`Nenhum inimigo na coluna ${cellX}.`);
  }

  return enemy;
}

describe('Bloco POW', () => {
  function powLevel(): LevelBlueprint {
    return flatLevel()
      .add('pow-block', 2, HEAD_ROW)
      .add('slime', 14, SURFACE - 1)
      .add('bat', 16, SURFACE - 4)
      .add('slime', 36, SURFACE - 1)
      .build(META);
  }

  it('é um bloco firme', () => {
    const harness = start(powLevel());

    expect(solidAt(harness, 2, HEAD_ROW)).toBeTrue();
  });

  it('batido por baixo, derruba os inimigos da tela — os que voam também — e deixa os de longe', () => {
    const harness = start(powLevel());
    const near = enemyAt(harness, 14);
    const flying = enemyAt(harness, 16);
    const far = enemyAt(harness, 36);

    bumpHead(harness);

    expect(near.isDefeated).withContext('slime perto').toBeTrue();
    expect(flying.isDefeated).withContext('morcego perto').toBeTrue();
    expect(far.isDefeated).withContext('slime fora da tela').toBeFalse();
    expect(harness.events.some((event) => event.type === 'sound' && event.cue === 'pow')).toBeTrue();
  });

  it('aguenta três batidas: em cada uma gasta uma, e na última some e libera a casa', () => {
    const harness = start(powLevel());
    const block = harness.simulation.blocks.blockAt(2, HEAD_ROW);

    bumpHead(harness);
    expect(block?.hitsLeft).toBe(POW_BLOCK.hits - 1);
    expect(solidAt(harness, 2, HEAD_ROW)).toBeTrue();

    bumpHead(harness);
    bumpHead(harness);

    expect(block?.hitsLeft).toBe(0);
    expect(block?.isBroken).toBeTrue();
    expect(solidAt(harness, 2, HEAD_ROW)).withContext('a casa fica livre').toBeFalse();
  });
});

describe('Bloco !', () => {
  it('é firme; a cabeçada solta o Chapéu de Voar e o bloco fica vazio', () => {
    const harness = start(flatLevel().add('exclamation-block', 2, HEAD_ROW).build(META));
    const block = harness.simulation.blocks.blockAt(2, HEAD_ROW);
    const wingCaps = (): number => harness.simulation.collectibles.items.filter((item) => item.powerUp === 'wing-cap').length;

    expect(solidAt(harness, 2, HEAD_ROW)).toBeTrue();
    expect(block?.isUsed).toBeFalse();

    bumpHead(harness);

    const released = wingCaps() + (harness.simulation.player.hasPowerUp('wing-cap') ? 1 : 0);

    expect(block?.isUsed).toBeTrue();
    expect(released).withContext('o chapéu saiu do bloco').toBe(1);

    bumpHead(harness);

    expect(wingCaps() + (harness.simulation.player.hasPowerUp('wing-cap') ? 1 : 0)).withContext('vazio, não solta outro').toBe(1);
  });
});

describe('Chapéu de Voar', () => {
  it('segurando o pulo no ar, voa bem mais alto que o pulo comum', () => {
    const harness = start(levelWithPowerUp('wing-cap').build(META));
    grab(harness);

    expect(harness.simulation.player.hasPowerUp('wing-cap')).toBeTrue();

    press(harness, { jumpPressed: true, jumpHeld: true });
    const highest = highestFeet(harness, 1.2, { jumpHeld: true });

    expect(GROUND_Y - highest).toBeGreaterThan(TILE_SIZE * 5);
  });

  it('soltando o pulo no ar, plana devagar', () => {
    const harness = start(levelWithPowerUp('wing-cap').build(META));
    grab(harness);

    press(harness, { jumpPressed: true, jumpHeld: true });
    run(harness, 1, { jumpHeld: true });
    run(harness, 0.6);

    expect(harness.simulation.player.isGrounded).toBeFalse();
    expect(harness.simulation.player.body.vy).toBeLessThanOrEqual(WING_CAP_PHYSICS.glideFallSpeed);
  });

  it('acaba com o tempo', () => {
    const harness = start(levelWithPowerUp('wing-cap').build(META));
    grab(harness);
    run(harness, 12.5);

    expect(harness.simulation.player.hasPowerUp('wing-cap')).toBeFalse();
    expect(harness.events.some((event) => event.type === 'power-up-ended' && event.kind === 'wing-cap')).toBeTrue();
  });
});

describe('Cogumelo de Voar', () => {
  it('é um traje: faz crescer, e o botão de ação lança o herói bem alto', () => {
    const harness = start(levelWithPowerUp('propeller-mushroom').build(META));
    grab(harness);

    expect(harness.simulation.player.isBig).toBeTrue();

    press(harness, { actionPressed: true });
    const highest = highestFeet(harness, 0.8);

    expect(GROUND_Y - highest).toBeGreaterThan(TILE_SIZE * 5);
    expect(harness.events.some((event) => event.type === 'sound' && event.cue === 'propeller')).toBeTrue();
  });

  it('lança uma vez por pulo: no ar não lança de novo, e no chão recarrega', () => {
    const harness = start(levelWithPowerUp('propeller-mushroom').build(META));
    const body = harness.simulation.player.body;
    grab(harness);

    press(harness, { actionPressed: true });
    run(harness, 0.5);
    press(harness, { actionPressed: true });

    expect(body.vy).withContext('no ar, a hélice já foi usada').toBeGreaterThan(-PROPELLER_SUIT_PHYSICS.launchVelocity / 2);

    run(harness, 2);
    expect(harness.simulation.player.isGrounded).toBeTrue();

    press(harness, { actionPressed: true });
    expect(body.vy).withContext('de volta ao chão, lança de novo').toBeLessThan(-PROPELLER_SUIT_PHYSICS.launchVelocity / 2);
  });

  it('segurando o pulo na descida, cai devagar', () => {
    const harness = start(levelWithPowerUp('propeller-mushroom').build(META));
    grab(harness);

    press(harness, { actionPressed: true });
    run(harness, 0.7);
    run(harness, 0.3, { jumpHeld: true });

    expect(harness.simulation.player.isSpinningDown).toBeTrue();
    expect(harness.simulation.player.body.vy).toBeLessThanOrEqual(PROPELLER_SUIT_PHYSICS.spinFallSpeed);
  });
});

describe('Bota', () => {
  function spikeLevel(powerUp?: PowerUpKind): LevelBlueprint {
    const level = flatLevel().row('spikes', 8, SURFACE - 1, 3);

    return (powerUp ? level.add('power-up', 3, SURFACE - 1, { powerUp }) : level).build(META);
  }

  it('com a Bota, pisar nos espinhos não machuca', () => {
    const harness = start(spikeLevel('boot'));
    grab(harness);

    harness.simulation.player.placeFeetAt(9.5 * TILE_SIZE, (SURFACE - 1) * TILE_SIZE);
    run(harness, 1);

    expect(harness.simulation.player.hasPowerUp('boot')).withContext('a bota continua').toBeTrue();
    expect(lastHud(harness.events)?.hearts).toBe(HEARTS);
  });

  it('sem a Bota, os espinhos machucam', () => {
    const harness = start(spikeLevel());
    run(harness, 0.2);

    harness.simulation.player.placeFeetAt(9.5 * TILE_SIZE, (SURFACE - 1) * TILE_SIZE);
    run(harness, 0.5);

    expect(lastHud(harness.events)?.hearts).toBe(HEARTS - 1);
  });

  it('o pisão de Bota derruba até o espinhudo, que não se pisa', () => {
    const harness = start(levelWithPowerUp('boot').add('spiky', 12, SURFACE - 1).build(META));
    // Antes de pegar a bota: depois, o espinhudo já andou para outra coluna.
    const spiky = enemyAt(harness, 12);

    grab(harness);
    harness.simulation.player.placeFeetAt(centerX(spiky.body), spiky.body.y - TILE_SIZE);
    run(harness, 0.6);

    expect(spiky.isDefeated).toBeTrue();
    expect(harness.simulation.player.hasPowerUp('boot')).withContext('não se machucou').toBeTrue();
  });
});

describe('Martelo Gigante', () => {
  it('a martelada derruba o espinhudo na frente do herói', () => {
    const harness = start(levelWithPowerUp('hammer').add('spiky', 12, SURFACE - 1).build(META));
    // Antes de pegar o martelo: depois, o espinhudo já andou para outra coluna.
    const spiky = enemyAt(harness, 12);

    grab(harness);
    harness.simulation.player.placeFeetAt(centerX(spiky.body) - 50, GROUND_Y);
    press(harness, { actionPressed: true });

    expect(spiky.isDefeated).toBeTrue();
    expect(harness.events.some((event) => event.type === 'sound' && event.cue === 'hammer')).toBeTrue();
  });

  it('a martelada derruba até o thwomp de ferro, que o fogo não apaga', () => {
    const harness = start(levelWithPowerUp('hammer').add('thwomp', 12, SURFACE - 1).build(META));
    grab(harness);

    const thwomp = enemyAt(harness, 12);

    harness.simulation.player.placeFeetAt(centerX(thwomp.body) - 50, GROUND_Y);
    press(harness, { actionPressed: true });

    expect(thwomp.isDefeated).toBeTrue();
  });

  it('quebra o tijolo da frente e troca o ON/OFF como uma cabeçada', () => {
    const harness = start(levelWithPowerUp('hammer').add('brick', 6, SURFACE - 1).add('on-off-switch', 6, SURFACE - 2).build(META));
    grab(harness);

    expect(solidAt(harness, 6, SURFACE - 1)).toBeTrue();

    harness.simulation.player.placeFeetAt(5.2 * TILE_SIZE, GROUND_Y);
    harness.simulation.player.facing = 1;
    press(harness, { actionPressed: true });

    expect(solidAt(harness, 6, SURFACE - 1)).withContext('o tijolo quebrou').toBeFalse();
    expect(harness.simulation.blocks.isSwitchOn).withContext('o interruptor trocou').toBeFalse();
  });

  it('não martela sem o martelo', () => {
    const harness = start(flatLevel().add('spiky', 12, SURFACE - 1).build(META));
    const spiky = enemyAt(harness, 12);

    run(harness, 0.2);
    harness.simulation.player.placeFeetAt(centerX(spiky.body) - 50, GROUND_Y);
    press(harness, { actionPressed: true });

    expect(spiky.isDefeated).toBeFalse();
  });
});

describe('Roupa de Pinguim', () => {
  it('lança bolas de gelo com o botão de ação', () => {
    const harness = start(levelWithPowerUp('penguin-suit').build(META));
    grab(harness);
    press(harness, { actionPressed: true });

    expect(harness.simulation.fireballs.fireballs.map((ball) => ball.element)).toEqual(['ice']);
  });

  /** Corre no gelo, solta tudo e mede quanto o herói ainda escorrega até parar. */
  function slideOnIce(powerUp: PowerUpKind): number {
    const harness = start(levelWithPowerUp(powerUp, 'ice').build(META));
    grab(harness);
    run(harness, 0.8, { right: true, run: true });

    const releasedAt = centerX(harness.simulation.player.body);

    run(harness, 1.5);

    return centerX(harness.simulation.player.body) - releasedAt;
  }

  it('no gelo, o pinguim freia como no chão: escorrega bem menos', () => {
    const penguinSlide = slideOnIce('penguin-suit');
    const normalSlide = slideOnIce('mushroom');

    expect(penguinSlide).toBeLessThan(normalSlide / 2);
  });
});

describe('Cogumelo Cereja', () => {
  it('traz um clone, que anda junto com o herói', () => {
    const harness = start(levelWithPowerUp('double-cherry').build(META));
    grab(harness);

    const [clone] = harness.simulation.clones;

    expect(harness.simulation.clones.length).toBe(1);

    const startX = centerX(clone.body);

    run(harness, 0.5, { right: true });

    expect(centerX(clone.body) - startX).toBeGreaterThan(TILE_SIZE);
  });

  it('tem um teto de clones', () => {
    const level = flatLevel();

    for (let column = 3; column <= 3 + DOUBLE_CHERRY.maxClones; column += 1) {
      level.add('power-up', column, SURFACE - 1, { powerUp: 'double-cherry' });
    }

    const harness = start(level.build(META));
    run(harness, 1.2, { right: true });

    expect(harness.simulation.clones.length).toBe(DOUBLE_CHERRY.maxClones);
  });

  it('o clone que encosta num inimigo some, e o herói não perde coração', () => {
    const harness = start(levelWithPowerUp('double-cherry').add('slime', 32, SURFACE - 1).build(META));
    grab(harness);
    // Depois da piscada de quem acabou de aparecer.
    run(harness, DIFFICULTY_RULES.aventura.invincibilityMs / 1000 + 0.2);

    const [clone] = harness.simulation.clones;
    const slime = enemyAt(harness, 32);

    clone.placeFeetAt(centerX(slime.body), bottom(slime.body));
    run(harness, 0.1);

    expect(harness.simulation.clones.length).toBe(0);
    expect(lastHud(harness.events)?.hearts).toBe(HEARTS);
  });

  it('a volta ao checkpoint leva os clones embora', () => {
    const harness = start(levelWithPowerUp('double-cherry').build(META));
    grab(harness);

    expect(harness.simulation.clones.length).toBe(1);

    harness.simulation.retryFromCheckpoint();

    expect(harness.simulation.clones.length).toBe(0);
  });
});
