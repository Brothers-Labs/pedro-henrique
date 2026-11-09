import { heroDefinition } from '../../config/hero.config';
import { DIFFICULTY_RULES } from '../../config/rules.config';
import {
  BIG_COIN_VALUE,
  GIGA_PHYSICS,
  HUGE_COIN_VALUE,
  LEAF_SUIT_PHYSICS,
  MULTI_COIN_BLOCK_COUNT,
  PLAYER_PHYSICS,
  SLIDE_PHYSICS,
  SWIM_PHYSICS,
  TILE_SIZE,
  TURBO_MUSHROOM_PHYSICS,
} from '../../config/physics.config';
import { campaignLevelById } from '../../levels/campaign';
import { LevelBuilder } from '../../levels/level-builder';
import { CLASSIC_POWER_UPS, type LevelBlueprint, type PowerUpKind } from '../../models/level.model';
import type { HeroId } from '../../models/progress.model';
import type { GameSessionEvent, HudState } from '../../models/session.model';
import { IDLE_INPUT, type InputSnapshot } from '../input/input-snapshot';
import { MOVING_PLATFORM_WIDTH } from './blocks';
import { GameSimulation, STEP_MS } from './game-simulation';
import { bottom, centerX, centerY, isAreaClear } from './physics-body';

const META = { id: 'teste', name: 'Teste', theme: 'vale', targetTimeSeconds: 60 } as const;
const SURFACE = 12;

interface Harness {
  readonly simulation: GameSimulation;
  readonly events: GameSessionEvent[];
}

function flatLevel(width = 40): LevelBuilder {
  return new LevelBuilder(width, 15).ground(0, width - 1, SURFACE).add('start', 2, SURFACE - 1).add('portal', width - 3, SURFACE - 1);
}

function start(blueprint: LevelBlueprint, hero: HeroId = 'pedro'): Harness {
  const events: GameSessionEvent[] = [];
  const simulation = new GameSimulation({
    blueprint,
    hero,
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

/** Altura máxima de um pulo segurado até o fim, a partir do chão. */
function jumpApex(harness: Harness): number {
  run(harness, 0.2);

  const groundY = bottom(harness.simulation.player.body);
  let highest = groundY;

  harness.simulation.step({ ...IDLE_INPUT, jumpHeld: true, jumpPressed: true });

  for (let step = 0; step < 90; step += 1) {
    harness.simulation.step({ ...IDLE_INPUT, jumpHeld: true });
    highest = Math.min(highest, bottom(harness.simulation.player.body));
  }

  return groundY - highest;
}

/** Distância percorrida entre soltar o direcional, já na velocidade máxima, e parar. */
function brakingDistance(harness: Harness): number {
  run(harness, 1, { right: true });

  const releasedAt = centerX(harness.simulation.player.body);

  run(harness, 1);

  return centerX(harness.simulation.player.body) - releasedAt;
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
    const apex = jumpApex(start(flatLevel().build(META)));
    const expectedApex = PLAYER_PHYSICS.jumpVelocity ** 2 / (2 * 1900);

    expect(apex).toBeGreaterThan(expectedApex * 0.9);
    expect(apex).toBeLessThan(expectedApex * 1.1);
  });

  it('faz o Gui pular mais alto que o Pedro', () => {
    const pedroApex = jumpApex(start(flatLevel().build(META), 'pedro'));
    const guiApex = jumpApex(start(flatLevel().build(META), 'gui'));
    const expectedRatio = heroDefinition('gui').abilities.jumpMultiplier ** 2;

    expect(guiApex / pedroApex).toBeCloseTo(expectedRatio, 1);
  });

  it('faz o Mario e o Luigi pularem mais alto que o Pedro, e o Luigi mais que todos', () => {
    const pedroApex = jumpApex(start(flatLevel().build(META), 'pedro'));
    const marioApex = jumpApex(start(flatLevel().build(META), 'mario'));
    const luigiApex = jumpApex(start(flatLevel().build(META), 'luigi'));

    expect(marioApex).toBeGreaterThan(pedroApex);
    expect(luigiApex).toBeGreaterThan(marioApex);
    expect(luigiApex / pedroApex).toBeCloseTo(heroDefinition('luigi').abilities.jumpMultiplier ** 2, 1);
  });

  it('faz o Gui escorregar mais que o Pedro ao frear', () => {
    const pedro = start(flatLevel().build(META), 'pedro');
    const gui = start(flatLevel().build(META), 'gui');

    expect(brakingDistance(gui)).toBeGreaterThan(brakingDistance(pedro) * 1.5);
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

  describe('Cogumelo Gato', () => {
    /** Parede alta de pedra na coluna 10, do chão até bem acima do pulo. */
    const wallLevel = (powerUp: PowerUpKind | null): LevelBlueprint => {
      const builder = flatLevel().fill('stone', 10, 10, SURFACE - 9, SURFACE - 1);

      return (powerUp ? builder.add('power-up', 3, SURFACE - 1, { powerUp }) : builder).build(META);
    };

    /** Corre até a parede, pula e continua empurrando: devolve quanto os pés subiram. */
    const climbHeight = (harness: Harness): { readonly lift: number; readonly climbed: boolean } => {
      const player = harness.simulation.player;

      run(harness, 1.2, { right: true });

      const groundY = bottom(player.body);
      let highest = groundY;
      let climbed = false;

      jump(harness, 0.1, { right: true });

      for (let step = 0; step < 120; step += 1) {
        harness.simulation.step({ ...IDLE_INPUT, right: true });
        highest = Math.min(highest, bottom(player.body));
        climbed ||= player.isClimbing;
      }

      return { lift: groundY - highest, climbed };
    };

    it('cresce e escala a parede bem mais alto do que um pulo alcança', () => {
      const withCat = start(wallLevel('cat-mushroom'));
      const withoutCat = start(wallLevel(null));
      const cat = climbHeight(withCat);
      const plain = climbHeight(withoutCat);

      expect(withCat.simulation.player.isBig).toBeTrue();
      expect(cat.climbed).toBeTrue();
      expect(plain.climbed).toBeFalse();
      expect(cat.lift).toBeGreaterThan(plain.lift + TILE_SIZE * 2);
    });

    it('para de escalar quando o fôlego acaba, e só recarrega no chão', () => {
      const harness = start(wallLevel('cat-mushroom'));
      const player = harness.simulation.player;

      run(harness, 1.2, { right: true });
      jump(harness, 0.1, { right: true });
      run(harness, 1.6, { right: true });

      expect(player.isClimbing).toBeFalse();
    });

    it('pula da parede para o lado de lá', () => {
      const harness = start(wallLevel('cat-mushroom'));
      const player = harness.simulation.player;

      run(harness, 1.2, { right: true });
      jump(harness, 0.1, { right: true });
      run(harness, 0.2, { right: true });

      expect(player.isClimbing).toBeTrue();

      harness.simulation.step({ ...IDLE_INPUT, right: true, jumpHeld: true, jumpPressed: true });

      expect(player.body.vx).toBeLessThan(0);
      expect(player.body.vy).toBeLessThan(0);
      expect(player.facing).toBe(-1);
    });

    it('perde o traje de gato no toque e volta ao tamanho normal, sem perder coração', () => {
      const harness = start(levelWithPowerUp('cat-mushroom').add('spiky', 14, SURFACE - 1).build(META));
      run(harness, 0.4, { right: true });

      bumpIntoFirstEnemy(harness);

      expect(harness.simulation.player.hasPowerUp('cat-mushroom')).toBeFalse();
      expect(harness.simulation.player.isBig).toBeFalse();
      expect(lastHud(harness.events)?.hearts).toBe(3);
      expect(harness.events).toContain({ type: 'power-up-ended', kind: 'cat-mushroom' });
    });
  });

  describe('Cogumelo Folha', () => {
    /** Solta o herói bem alto e devolve a velocidade de queda depois de meio segundo. */
    const fallSpeedFromHigh = (harness: Harness, isHoldingJump: boolean): number => {
      const player = harness.simulation.player;

      player.placeFeetAt(20 * TILE_SIZE, (SURFACE - 9) * TILE_SIZE);
      run(harness, 0.5, { jumpHeld: isHoldingJump });

      return player.body.vy;
    };

    it('plana devagar segurando o pulo e cai normal ao soltar', () => {
      const harness = start(levelWithPowerUp('leaf-mushroom').build(META));
      run(harness, 0.4, { right: true });

      expect(harness.simulation.player.isBig).toBeTrue();

      const gliding = fallSpeedFromHigh(harness, true);

      expect(harness.simulation.player.isGliding).toBeTrue();
      expect(gliding).toBeLessThanOrEqual(LEAF_SUIT_PHYSICS.glideFallSpeed);

      const falling = fallSpeedFromHigh(harness, false);

      expect(harness.simulation.player.isGliding).toBeFalse();
      expect(falling).toBeGreaterThan(LEAF_SUIT_PHYSICS.glideFallSpeed * 2);
    });

    it('não plana sem o cogumelo', () => {
      const harness = start(flatLevel().build(META));
      run(harness, 0.2);

      expect(fallSpeedFromHigh(harness, true)).toBeGreaterThan(LEAF_SUIT_PHYSICS.glideFallSpeed * 2);
      expect(harness.simulation.player.isGliding).toBeFalse();
    });
  });

  describe('Folha do Guaxinim', () => {
    /** Pula segurando o botão pelo tempo pedido: devolve quanto os pés subiram e se chegou a voar. */
    const heldJump = (harness: Harness, seconds: number): { readonly lift: number; readonly flew: boolean } => {
      const player = harness.simulation.player;
      const groundY = bottom(player.body);
      let highest = groundY;
      let flew = false;

      harness.simulation.step({ ...IDLE_INPUT, jumpHeld: true, jumpPressed: true });

      for (let step = 0; step < Math.round((seconds * 1000) / STEP_MS); step += 1) {
        harness.simulation.step({ ...IDLE_INPUT, jumpHeld: true });
        highest = Math.min(highest, bottom(player.body));
        flew ||= player.isFlying;
      }

      return { lift: groundY - highest, flew };
    };

    it('cresce, veste o traje e voa bem mais alto do que um pulo alcança', () => {
      const withLeaf = start(levelWithPowerUp('raccoon-leaf').build(META));
      const withoutLeaf = start(flatLevel().build(META));
      run(withLeaf, 0.4, { right: true });
      run(withLeaf, 0.6);
      run(withoutLeaf, 0.2);

      const player = withLeaf.simulation.player;

      expect(player.isBig).toBeTrue();
      expect(player.hasPowerUp('raccoon-leaf')).toBeTrue();

      const flight = heldJump(withLeaf, 1.5);
      const plain = heldJump(withoutLeaf, 1.5);

      expect(flight.flew).toBeTrue();
      expect(plain.flew).toBeFalse();
      expect(flight.lift).toBeGreaterThan(plain.lift + TILE_SIZE * 3);
    });

    it('voa só enquanto durar o fôlego, e o fôlego só recarrega no chão', () => {
      const harness = start(levelWithPowerUp('raccoon-leaf').build(META));
      const player = harness.simulation.player;
      run(harness, 0.4, { right: true });
      run(harness, 0.6);

      heldJump(harness, 1.5);

      expect(player.isFlying).toBeFalse();
      expect(player.isGrounded).toBeFalse();

      run(harness, 0.05);
      jump(harness, 0.2);

      expect(player.isFlying).withContext('sem fôlego, apertar de novo no ar não voa').toBeFalse();

      run(harness, 3);

      expect(player.isGrounded).toBeTrue();
      expect(heldJump(harness, 0.6).flew).withContext('no chão, o fôlego volta').toBeTrue();
    });

    it('gira o rabo com o botão de ação e derruba o inimigo ao lado, sem perder coração', () => {
      const harness = start(levelWithPowerUp('raccoon-leaf').add('spiky', 14, SURFACE - 1).build(META));
      run(harness, 0.4, { right: true });

      const spiky = harness.simulation.enemies[0];

      harness.simulation.player.placeFeetAt(spiky.body.x - 20, bottom(spiky.body));
      harness.simulation.step({ ...IDLE_INPUT, actionPressed: true });

      expect(spiky.isDefeated).toBeTrue();
      expect(harness.simulation.player.isSpinningTail(harness.simulation.clockMs)).toBeTrue();
      expect(harness.events.some((event) => event.type === 'sound' && event.cue === 'tailSpin')).toBeTrue();
      expect(lastHud(harness.events)?.hearts).toBe(3);
    });

    it('quebra com o rabo o tijolo em que encostou, e sem a folha o botão não gira nada', () => {
      const brickWall = (powerUp: PowerUpKind | null): Harness => {
        const builder = flatLevel().add('brick', 8, SURFACE - 1);

        return start((powerUp ? builder.add('power-up', 3, SURFACE - 1, { powerUp }) : builder).build(META));
      };
      const withLeaf = brickWall('raccoon-leaf');
      const withoutLeaf = brickWall(null);

      for (const harness of [withLeaf, withoutLeaf]) {
        run(harness, 2, { right: true });
        harness.simulation.step({ ...IDLE_INPUT, actionPressed: true });
      }

      expect(withLeaf.simulation.blocks.blockAt(8, SURFACE - 1)?.isBroken).toBeTrue();
      expect(withoutLeaf.simulation.blocks.blockAt(8, SURFACE - 1)?.isBroken).toBeFalse();
    });

    it('troca o traje anterior e o perde no toque, sem perder coração', () => {
      const harness = start(levelWithPowerUp('raccoon-leaf').add('spiky', 14, SURFACE - 1).build(META));
      const player = harness.simulation.player;

      player.grantPowerUp('cat-mushroom', 0);
      run(harness, 0.4, { right: true });

      expect(player.hasPowerUp('cat-mushroom')).toBeFalse();
      expect(player.hasPowerUp('raccoon-leaf')).toBeTrue();

      bumpIntoFirstEnemy(harness);

      expect(player.hasPowerUp('raccoon-leaf')).toBeFalse();
      expect(player.isBig).toBeFalse();
      expect(lastHud(harness.events)?.hearts).toBe(3);
      expect(harness.events).toContain({ type: 'power-up-ended', kind: 'raccoon-leaf' });
    });
  });

  describe('Giga Cogumelo', () => {
    /** Anda o tempo pedido conferindo, passo a passo, que o corpo nunca entra no cenário. */
    const runStayingClear = (harness: Harness, seconds: number, input: Partial<InputSnapshot> = {}): boolean => {
      let isAlwaysClear = true;

      for (let step = 0; step < Math.round((seconds * 1000) / STEP_MS); step += 1) {
        harness.simulation.step({ ...IDLE_INPUT, ...input });
        isAlwaysClear &&= isAreaClear(harness.simulation.grid, harness.simulation.player.body);
      }

      return isAlwaysClear;
    };

    it('fica gigante e invencível, e derruba o inimigo só de encostar', () => {
      const harness = start(levelWithPowerUp('giga-mushroom').add('spiky', 14, SURFACE - 1).build(META));
      const player = harness.simulation.player;
      run(harness, 0.4, { right: true });

      expect(player.isGiant).toBeTrue();
      expect(player.body.height).toBe(PLAYER_PHYSICS.bodyHeight * GIGA_PHYSICS.bodyScale);
      expect(player.body.width).toBe(PLAYER_PHYSICS.bodyWidth * GIGA_PHYSICS.bodyScale);
      expect(bottom(player.body)).toBeCloseTo(SURFACE * TILE_SIZE, 3);

      bumpIntoFirstEnemy(harness);

      expect(harness.simulation.enemies[0]?.isDefeated ?? true).toBeTrue();
      expect(lastHud(harness.events)?.hearts).toBe(3);
      expect(harness.events.some((event) => event.type === 'damage')).toBeFalse();
    });

    it('quebra os tijolos em que esbarra e passa direto', () => {
      const harness = start(levelWithPowerUp('giga-mushroom').add('brick', 8, SURFACE - 1).add('brick', 8, SURFACE - 2).build(META));

      run(harness, 2.5, { right: true });

      expect(harness.simulation.blocks.blockAt(8, SURFACE - 1)?.isBroken).toBeTrue();
      expect(harness.simulation.blocks.blockAt(8, SURFACE - 2)?.isBroken).toBeTrue();
      expect(centerX(harness.simulation.player.body)).toBeGreaterThan(9 * TILE_SIZE);
    });

    it('pisca no fim e volta ao tamanho e ao traje que tinha antes', () => {
      const harness = start(flatLevel().add('power-up', 3, SURFACE - 1, { powerUp: 'fire-flower' }).add('power-up', 5, SURFACE - 1, { powerUp: 'giga-mushroom' }).build(META));
      const player = harness.simulation.player;
      run(harness, 1, { right: true });

      expect(player.isGiant).toBeTrue();
      expect(player.isPowerUpEnding('giga-mushroom', harness.simulation.clockMs)).toBeFalse();

      run(harness, 8);

      expect(player.isGiant).toBeTrue();
      expect(player.isPowerUpEnding('giga-mushroom', harness.simulation.clockMs)).toBeTrue();

      run(harness, 3);

      expect(player.isGiant).toBeFalse();
      expect(player.hasPowerUp('giga-mushroom')).toBeFalse();
      expect(player.body.height).toBe(PLAYER_PHYSICS.bodyHeight);
      expect(bottom(player.body)).toBeCloseTo(SURFACE * TILE_SIZE, 3);
      expect(player.isBig).toBeTrue();
      expect(player.flowerElement).toBe('fire');
      expect(harness.events).toContain({ type: 'power-up-ended', kind: 'giga-mushroom' });
    });

    it('só cresce onde cabe e, ao encolher, nunca fica preso no cenário', () => {
      // Túnel baixo de pedra, das colunas 4 a 11: o Pedro normal passa, o gigante não cabe.
      const harness = start(flatLevel().row('stone', 4, SURFACE - 3, 8).add('power-up', 6, SURFACE - 1, { powerUp: 'giga-mushroom' }).build(META));
      const player = harness.simulation.player;

      expect(runStayingClear(harness, 1, { right: true })).toBeTrue();
      expect(player.hasPowerUp('giga-mushroom')).toBeTrue();
      expect(player.isGiant).withContext('dentro do túnel não há espaço').toBeFalse();

      expect(runStayingClear(harness, 1.5, { right: true })).toBeTrue();
      expect(player.isGiant).withContext('fora do túnel, cresce').toBeTrue();

      expect(runStayingClear(harness, 1, { left: true })).toBeTrue();
      expect(player.body.x).withContext('gigante, não entra no túnel').toBeGreaterThanOrEqual(12 * TILE_SIZE - 0.001);

      expect(runStayingClear(harness, 10, { left: true })).toBeTrue();
      expect(player.isGiant).toBeFalse();
      expect(centerX(player.body)).withContext('pequeno de novo, volta a passar pelo túnel').toBeLessThan(11 * TILE_SIZE);
    });
  });

  it('o Lucky Block também sorteia a Folha do Guaxinim, o Giga Cogumelo e o Cogumelo Turbo', () => {
    expect(CLASSIC_POWER_UPS).toContain('raccoon-leaf');
    expect(CLASSIC_POWER_UPS).toContain('giga-mushroom');
    expect(CLASSIC_POWER_UPS).toContain('turbo-mushroom');
  });

  describe('Cogumelo Turbo', () => {
    /** Velocidade horizontal depois de correr um segundo para a direita. */
    const topSpeedWith = (powerUp: PowerUpKind | null): number => {
      const harness = start((powerUp ? levelWithPowerUp(powerUp) : flatLevel()).build(META));

      run(harness, 1, { right: true });

      return harness.simulation.player.body.vx;
    };

    it('corre mais rápido que sem poder e que com o Turbo dos power-ups, sem somar os dois', () => {
      const normal = topSpeedWith(null);
      const turbo = topSpeedWith('turbo');
      const mushroom = topSpeedWith('turbo-mushroom');

      expect(mushroom).toBeCloseTo(normal * TURBO_MUSHROOM_PHYSICS.speedMultiplier, 3);
      expect(mushroom).toBeGreaterThan(turbo);

      const harness = start(flatLevel().add('power-up', 3, SURFACE - 1, { powerUp: 'turbo' }).add('power-up', 5, SURFACE - 1, { powerUp: 'turbo-mushroom' }).build(META));
      run(harness, 1.5, { right: true });

      expect(harness.simulation.player.body.vx).toBeCloseTo(mushroom, 3);
    });

    it('arranca mais forte: no primeiro instante já anda mais que sem poder', () => {
      const turbo = start(flatLevel().build(META));
      const plain = start(flatLevel().build(META));
      turbo.simulation.player.grantPowerUp('turbo-mushroom', turbo.simulation.clockMs);

      run(turbo, 0.1, { right: true });
      run(plain, 0.1, { right: true });

      expect(turbo.simulation.player.body.vx)
        .toBeCloseTo(plain.simulation.player.body.vx * TURBO_MUSHROOM_PHYSICS.accelerationMultiplier, 0);
    });

    it('deixa rastro de faíscas correndo, pisca no fim e avisa quando acaba', () => {
      const harness = start(flatLevel(80).add('power-up', 3, SURFACE - 1, { powerUp: 'turbo-mushroom' }).build(META));
      const player = harness.simulation.player;
      run(harness, 0.5, { right: true });

      expect(player.hasPowerUp('turbo-mushroom')).toBeTrue();
      expect(player.isPowerUpEnding('turbo-mushroom', harness.simulation.clockMs)).toBeFalse();
      expect(harness.events).toContain(jasmine.objectContaining({ type: 'mascot', text: jasmine.stringContaining('Turbo ligado') }));

      harness.simulation.effects.drain();
      run(harness, 0.5, { right: true });

      expect(harness.simulation.effects.drain().some((effect) => effect.type === 'burst' && effect.kind === 'sparkle')).toBeTrue();

      run(harness, 7.5);

      expect(player.isPowerUpEnding('turbo-mushroom', harness.simulation.clockMs)).toBeTrue();

      run(harness, 2);

      expect(player.hasPowerUp('turbo-mushroom')).toBeFalse();
      expect(harness.events).toContain({ type: 'power-up-ended', kind: 'turbo-mushroom' });
    });
  });

  describe('Grama invisível', () => {
    /** Buraco das colunas 8 a 13 coberto só por grama invisível na altura do chão. */
    const hiddenBridge = (): LevelBuilder => {
      const builder = flatLevel();

      for (let x = 8; x <= 13; x += 1) {
        builder.remove(x, SURFACE).remove(x, SURFACE + 1).remove(x, SURFACE + 2);
      }

      return builder.row('invisible-grass', 8, SURFACE, 6);
    };

    it('segura o herói como chão, mesmo antes de aparecer', () => {
      const harness = start(hiddenBridge().build(META));
      const blocks = harness.simulation.blocks;

      expect(blocks.blockAt(10, SURFACE)?.isUsed).withContext('escondida no começo').toBeFalse();

      run(harness, 2.5, { right: true });

      expect(centerX(harness.simulation.player.body)).toBeGreaterThan(14 * TILE_SIZE);
      expect(bottom(harness.simulation.player.body)).toBeCloseTo(SURFACE * TILE_SIZE, 3);
      expect(harness.events.some((event) => event.type === 'damage')).toBeFalse();
    });

    it('aparece onde o herói pisou e continua à mostra; a que ele não tocou fica escondida', () => {
      const harness = start(hiddenBridge().row('invisible-grass', 20, SURFACE - 6, 2).build(META));
      const blocks = harness.simulation.blocks;
      run(harness, 1.2, { right: true });

      expect(blocks.blockAt(8, SURFACE)?.isUsed).toBeTrue();
      expect(blocks.blockAt(13, SURFACE)?.isUsed).toBeFalse();

      run(harness, 2, { right: true });

      expect(blocks.blockAt(8, SURFACE)?.isUsed).withContext('não some de novo').toBeTrue();
      expect(blocks.blockAt(13, SURFACE)?.isUsed).toBeTrue();
      expect(blocks.blockAt(20, SURFACE - 6)?.isUsed).withContext('lá no alto, ninguém encostou').toBeFalse();
    });

    it('aparece também com uma esbarrada de lado ou uma cabeçada por baixo', () => {
      const harness = start(flatLevel().add('invisible-grass', 6, SURFACE - 1).add('invisible-grass', 3, SURFACE - 3).build(META));
      const blocks = harness.simulation.blocks;

      run(harness, 1, { right: true });

      expect(blocks.blockAt(6, SURFACE - 1)?.isUsed).withContext('parede escondida').toBeTrue();
      expect(centerX(harness.simulation.player.body)).toBeLessThan(6 * TILE_SIZE);

      harness.simulation.player.placeFeetAt(3.5 * TILE_SIZE, SURFACE * TILE_SIZE);
      jump(harness, 0.5);

      expect(blocks.blockAt(3, SURFACE - 3)?.isUsed).withContext('teto escondido').toBeTrue();
    });
  });

  describe('Castelo final', () => {
    it('termina a fase como o portal, só com o desenho de castelo', () => {
      const harness = start(new LevelBuilder(30, 15).ground(0, 29, SURFACE).add('start', 2, SURFACE - 1)
        .add('portal', 8, SURFACE - 1, { portalLook: 'castle' }).build(META));

      expect(harness.simulation.triggers.portal?.look).toBe('castle');

      run(harness, 4, { right: true });

      expect(harness.events.some((event) => event.type === 'completed')).toBeTrue();
    });

    it('sem desenho escolhido, o portal continua sendo o arco de sempre', () => {
      const harness = start(flatLevel().build(META));

      expect(harness.simulation.triggers.portal?.look).toBe('arch');
    });
  });

  it('troca de traje: o cogumelo novo tira a flor, e a flor nova tira o cogumelo', () => {
    const harness = start(flatLevel().build(META));
    const player = harness.simulation.player;

    player.grantPowerUp('fire-flower', 0);
    player.grantPowerUp('leaf-mushroom', 0);

    expect(player.flowerElement).toBeNull();
    expect(player.hasPowerUp('fire-flower')).toBeFalse();
    expect(player.hasPowerUp('leaf-mushroom')).toBeTrue();
    expect(player.isBig).toBeTrue();

    player.grantPowerUp('cat-mushroom', 0);
    player.grantPowerUp('ice-flower', 0);

    expect(player.hasPowerUp('leaf-mushroom')).toBeFalse();
    expect(player.hasPowerUp('cat-mushroom')).toBeFalse();
    expect(player.flowerElement).toBe('ice');
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

  it('derrota a tartaruga com um pisão', () => {
    const harness = start(flatLevel().add('turtle', 12, SURFACE - 1).build(META));
    run(harness, 0.2);

    const turtle = harness.simulation.enemies[0];
    const player = harness.simulation.player;

    player.placeFeetAt(centerX(turtle.body), turtle.body.y - 4);
    player.body.vy = 300;
    run(harness, 0.1);

    expect(turtle.isDefeated).toBeTrue();
    expect(lastHud(harness.events)?.hearts).toBe(3);
  });

  it('segura o Pedro em cima dos espinhos, mas tira um coração sem voltar ao início', () => {
    const harness = start(flatLevel().row('spikes', 10, SURFACE - 1, 3).build(META));
    const player = harness.simulation.player;
    run(harness, 0.2);

    player.placeFeetAt(11.5 * TILE_SIZE, (SURFACE - 1) * TILE_SIZE);
    run(harness, 0.1);

    expect(lastHud(harness.events)?.hearts).toBe(2);
    expect(bottom(player.body)).toBeLessThanOrEqual((SURFACE - 1) * TILE_SIZE);
    expect(centerX(player.body)).toBeGreaterThan(8 * TILE_SIZE);
  });

  it('esconde e mostra a planta carnívora, que só machuca fora do cano', () => {
    const harness = start(flatLevel().add('pipe', 20, SURFACE - 1).add('piranha', 20, SURFACE - 2).build(META));
    const piranha = harness.simulation.enemies[0];
    const states = new Set<boolean>();

    for (let step = 0; step < 360; step += 1) {
      harness.simulation.step(IDLE_INPUT);
      states.add(piranha.isHidden);
    }

    expect(states).toEqual(new Set([true, false]));
    expect(piranha.canBeStomped).toBeFalse();
  });

  it('deixa a planta carnívora dentro do cano com o Pedro colado nele', () => {
    const harness = start(flatLevel().add('pipe', 20, SURFACE - 1).add('piranha', 20, SURFACE - 2).build(META));
    const piranha = harness.simulation.enemies[0];

    for (let step = 0; step < 360 && piranha.emergence > 0; step += 1) {
      harness.simulation.step(IDLE_INPUT);
    }

    harness.simulation.player.placeFeetAt(21.5 * TILE_SIZE, SURFACE * TILE_SIZE);

    for (let step = 0; step < 360; step += 1) {
      harness.simulation.step(IDLE_INPUT);
      expect(piranha.emergence).toBe(0);
    }

    expect(lastHud(harness.events)?.hearts).toBe(3);
  });

  describe('Mola de cabeça pra baixo', () => {
    const ROW = SURFACE - 4;

    it('a cabeçada nela lança o herói para baixo, na queda mais rápida', () => {
      const harness = start(flatLevel().add('ceiling-spring', 10, ROW).build(META));
      const player = harness.simulation.player;
      run(harness, 0.2);

      player.placeFeetAt(10.5 * TILE_SIZE, (ROW + 1) * TILE_SIZE + player.body.height + 2);
      player.body.vy = -600;
      let fastestFall = 0;

      for (let step = 0; step < 6; step += 1) {
        harness.simulation.step(IDLE_INPUT);
        fastestFall = Math.max(fastestFall, player.body.vy);
      }

      expect(fastestFall).toBe(PLAYER_PHYSICS.maxFallSpeed);
      expect(harness.events.some((event) => event.type === 'sound' && event.cue === 'spring')).toBeTrue();
      expect(harness.simulation.blocks.blockAt(10, ROW)?.bumpedAt).toBeGreaterThan(Number.NEGATIVE_INFINITY);
    });

    it('é chão firme por cima: pisar nela não lança', () => {
      const harness = start(flatLevel().add('ceiling-spring', 10, ROW).build(META));
      const player = harness.simulation.player;
      run(harness, 0.2);

      player.placeFeetAt(10.5 * TILE_SIZE, ROW * TILE_SIZE - 2);
      run(harness, 0.5);

      expect(harness.simulation.grid.isSolidCell(10, ROW)).toBeTrue();
      expect(bottom(player.body)).toBeCloseTo(ROW * TILE_SIZE, 0);
      expect(harness.events.some((event) => event.type === 'sound' && event.cue === 'spring')).toBeFalse();
    });
  });

  describe('Plataforma de esqueleto', () => {
    const ROW = SURFACE - 3;
    const WALL = 24;
    const skeletonOf = (harness: Harness) => harness.simulation.blocks.platforms.find((platform) => platform.kind === 'skeleton');
    const rideFrom = (harness: Harness, x: number): void => {
      harness.simulation.player.placeFeetAt((x + 1) * TILE_SIZE, ROW * TILE_SIZE - 2);
    };

    it('fica parada esperando o herói', () => {
      const harness = start(flatLevel().add('skeleton-platform', 12, ROW).add('stone', WALL, ROW).build(META));
      run(harness, 2);

      expect(skeletonOf(harness)?.x).toBe(12 * TILE_SIZE);
    });

    it('com o herói em cima, segue para a direita e para encostada na parede, com ele junto', () => {
      const harness = start(flatLevel().add('skeleton-platform', 12, ROW).add('stone', WALL, ROW).build(META));
      run(harness, 0.2);
      rideFrom(harness, 12);
      run(harness, 0.5);

      const platform = skeletonOf(harness);

      expect(platform?.x).toBeGreaterThan(12 * TILE_SIZE);

      run(harness, 12);

      expect(platform?.x).toBe(WALL * TILE_SIZE - (platform?.width ?? 0));
      expect(platform?.velocity).toBe(0);
      expect(centerX(harness.simulation.player.body)).toBeGreaterThan(platform?.x ?? Number.POSITIVE_INFINITY);
    });

    it('é uma ponte de quatro esqueletos, do tamanho de quatro plataformas móveis', () => {
      const harness = start(flatLevel().add('skeleton-platform', 12, ROW).add('stone', WALL, ROW).build(META));

      expect(skeletonOf(harness)?.width).toBe(MOVING_PLATFORM_WIDTH * 4);
    });

    it('para na primeira parede, mesmo que ela fique embaixo da ponte', () => {
      const harness = start(flatLevel().add('skeleton-platform', 12, ROW).add('stone', 15, ROW).build(META));
      run(harness, 0.2);
      rideFrom(harness, 12);
      run(harness, 2);

      expect(skeletonOf(harness)?.x).toBe(12 * TILE_SIZE);
    });

    it('sem parede no caminho, vai até o fim da fase', () => {
      const harness = start(flatLevel().add('skeleton-platform', 12, ROW).build(META));
      run(harness, 0.2);
      rideFrom(harness, 12);
      run(harness, 30);

      const platform = skeletonOf(harness);

      expect(platform?.x).toBe(harness.simulation.grid.width * TILE_SIZE - (platform?.width ?? 0));
    });
  });

  it('quica alto no bloco musical segurando o pulo', () => {
    const harness = start(flatLevel().add('note', 10, SURFACE - 1).build(META));
    const player = harness.simulation.player;
    run(harness, 0.2);

    player.placeFeetAt(10.5 * TILE_SIZE, (SURFACE - 3) * TILE_SIZE);
    let fastestRise = 0;

    for (let step = 0; step < 40; step += 1) {
      harness.simulation.step({ ...IDLE_INPUT, jumpHeld: true });
      fastestRise = Math.min(fastestRise, player.body.vy);
    }

    expect(fastestRise).toBeLessThan(-PLAYER_PHYSICS.jumpVelocity);
    expect(harness.events.some((event) => event.type === 'note')).toBeTrue();
    expect(harness.simulation.grid.isSolidCell(10, SURFACE - 1)).toBeTrue();
  });

  describe('Notas do bloco musical', () => {
    const notesOf = (harness: Harness): readonly number[] =>
      harness.events.flatMap((event) => (event.type === 'note' ? [event.degree] : []));
    const landOn = (harness: Harness, column: number, row: number): void => {
      harness.simulation.player.placeFeetAt((column + 0.5) * TILE_SIZE, row * TILE_SIZE - 2);
      run(harness, 0.15);
    };

    it('toca uma nota da escala, e não o som da mola', () => {
      const harness = start(flatLevel().add('note', 10, SURFACE - 1).build(META));
      run(harness, 0.2);
      landOn(harness, 10, SURFACE - 1);

      expect(notesOf(harness)[0]).toBe((harness.simulation.grid.height - SURFACE) % 10);
      expect(harness.events.some((event) => event.type === 'sound' && event.cue === 'spring')).toBeFalse();
    });

    it('o bloco mais alto toca a nota mais aguda: a escadinha vira escala', () => {
      const harness = start(flatLevel().add('note', 10, SURFACE - 1).add('note', 16, SURFACE - 3).build(META));
      run(harness, 0.2);
      landOn(harness, 10, SURFACE - 1);
      const low = notesOf(harness)[0];

      landOn(harness, 16, SURFACE - 3);
      const high = notesOf(harness).at(-1) ?? low;

      expect(high - low).toBe(2);
    });

    it('a cabeçada por baixo também toca a nota do bloco', () => {
      const harness = start(flatLevel().add('note', 10, SURFACE - 4).build(META));
      run(harness, 0.2);
      harness.simulation.player.placeFeetAt(10.5 * TILE_SIZE, SURFACE * TILE_SIZE);
      jump(harness, 0.4);

      expect(notesOf(harness)).toContain((harness.simulation.grid.height - (SURFACE - 3)) % 10);
    });
  });

  it('derrota o pinguim com um pisão', () => {
    const harness = start(flatLevel().add('penguin', 12, SURFACE - 1).build(META));
    run(harness, 0.2);

    const penguin = harness.simulation.enemies[0];
    const player = harness.simulation.player;

    player.placeFeetAt(centerX(penguin.body), penguin.body.y - 4);
    player.body.vy = 300;
    run(harness, 0.1);

    expect(penguin.isDefeated).toBeTrue();
  });

  it('faz a bolinha de lava saltar da lava e mergulhar de volta', () => {
    const harness = start(flatLevel().clearColumns(19, 21).fill('lava', 19, 21, SURFACE, SURFACE).add('lava-bubble', 20, SURFACE).build(META));
    const bubble = harness.simulation.enemies[0];
    const homeY = bubble.body.y;
    const states = new Set<boolean>();
    let highest = homeY;

    for (let step = 0; step < 300; step += 1) {
      harness.simulation.step(IDLE_INPUT);
      states.add(bubble.isHidden);
      highest = Math.min(highest, bubble.body.y);
    }

    expect(states).toEqual(new Set([true, false]));
    expect(homeY - highest).toBeGreaterThan(TILE_SIZE * 3);
    expect(bubble.canBeStomped).toBeFalse();
    expect(bubble.isFireproof).toBeTrue();
  });

  it('soma várias moedas de uma vez com a moeda gigante', () => {
    const harness = start(flatLevel().add('big-coin', 4, SURFACE - 1).build(META));

    run(harness, 1, { right: true });

    expect(lastHud(harness.events)?.coins).toBe(BIG_COIN_VALUE);
    expect(harness.simulation.collectibles.items.length).toBe(0);
  });

  it('solta uma moeda por cabeçada no bloco de moedas até esvaziar', () => {
    const harness = start(flatLevel().add('surprise', 2, SURFACE - 3, { contents: 'multi-coins' }).build(META));
    const block = harness.simulation.blocks.blockAt(2, SURFACE - 3);
    run(harness, 0.2);

    jump(harness, 0.4);
    run(harness, 0.6);

    expect(lastHud(harness.events)?.coins).toBe(1);
    expect(block?.isUsed).toBeFalse();

    for (let attempt = 0; attempt < MULTI_COIN_BLOCK_COUNT + 2; attempt += 1) {
      jump(harness, 0.4);
      run(harness, 0.6);
    }

    expect(lastHud(harness.events)?.coins).toBe(MULTI_COIN_BLOCK_COUNT);
    expect(block?.isUsed).toBeTrue();
  });

  it('faz a abelha voar de um lado para o outro sem sair do trecho', () => {
    const harness = start(flatLevel().add('bee', 20, SURFACE - 3).build(META));
    const bee = harness.simulation.enemies[0];
    const homeX = centerX(bee.body);
    const directions = new Set<number>();
    let farthest = 0;

    for (let step = 0; step < 600; step += 1) {
      harness.simulation.step(IDLE_INPUT);
      directions.add(bee.direction);
      farthest = Math.max(farthest, Math.abs(centerX(bee.body) - homeX));
    }

    expect(directions).toEqual(new Set([1, -1]));
    expect(farthest).toBeLessThan(TILE_SIZE * 3.5);
    expect(bee.canBeStomped).toBeTrue();
  });

  it('faz o peixe nadador ir e voltar dentro da água, sem afundar', () => {
    const harness = start(flatLevel().clearColumns(14, 26).fill('water', 14, 26, SURFACE - 2, SURFACE).add('fish', 20, SURFACE - 1).build(META));
    const fish = harness.simulation.enemies[0];
    const homeX = centerX(fish.body);
    const homeY = centerY(fish.body);
    const directions = new Set<number>();
    let farthestX = 0;
    let farthestY = 0;

    for (let step = 0; step < 900; step += 1) {
      harness.simulation.step(IDLE_INPUT);
      directions.add(fish.direction);
      farthestX = Math.max(farthestX, Math.abs(centerX(fish.body) - homeX));
      farthestY = Math.max(farthestY, Math.abs(centerY(fish.body) - homeY));
    }

    expect(directions).toEqual(new Set([1, -1]));
    expect(farthestX).toBeLessThan(TILE_SIZE * 4.5);
    expect(farthestY).toBeLessThan(TILE_SIZE / 2);
    expect(fish.canBeStomped).toBeTrue();
    expect(fish.canBeFrozen).toBeTrue();
  });

  it('faz o peixe saltador pular da água e mergulhar de volta, sem machucar mergulhado', () => {
    const harness = start(flatLevel().clearColumns(19, 21).fill('water', 19, 21, SURFACE, SURFACE).add('jumping-fish', 20, SURFACE).build(META));
    const fish = harness.simulation.enemies[0];
    const homeY = fish.body.y;
    const states = new Set<boolean>();
    let highest = homeY;

    expect(fish.isHarmful).toBeFalse();

    for (let step = 0; step < 300; step += 1) {
      harness.simulation.step(IDLE_INPUT);
      states.add(fish.isHidden);
      highest = Math.min(highest, fish.body.y);

      if (fish.isHidden) {
        expect(fish.isHarmful).toBeFalse();
      }
    }

    expect(states).toEqual(new Set([true, false]));
    expect(homeY - highest).toBeGreaterThan(TILE_SIZE * 2.5);
    expect(fish.isFireproof).toBeFalse();
  });

  it('derrota o peixe nadador com um pisão', () => {
    const harness = start(flatLevel().add('fish', 12, SURFACE - 2).build(META));
    run(harness, 0.2);

    const fish = harness.simulation.enemies[0];
    const player = harness.simulation.player;

    player.placeFeetAt(centerX(fish.body), fish.body.y - 4);
    player.body.vy = 300;
    run(harness, 0.1);

    expect(fish.isDefeated).toBeTrue();
    expect(lastHud(harness.events)?.hearts).toBe(3);
  });

  it('soma cinquenta moedas de uma vez com a moeda gigante de 50', () => {
    const harness = start(flatLevel().add('huge-coin', 4, SURFACE - 1).build(META));

    run(harness, 1, { right: true });

    expect(lastHud(harness.events)?.coins).toBe(HUGE_COIN_VALUE);
    expect(harness.simulation.collectibles.items.length).toBe(0);
  });

  it('congela o slime com a Flor de Gelo: o gelo não machuca e quebra com um pisão', () => {
    const harness = start(levelWithPowerUp('ice-flower').add('slime', 12, SURFACE - 1).build(META));
    run(harness, 0.4, { right: true });

    expect(harness.simulation.player.isBig).toBeTrue();

    harness.simulation.step({ ...IDLE_INPUT, actionPressed: true });
    run(harness, 1.5);

    const slime = harness.simulation.enemies[0];
    const heartsBefore = lastHud(harness.events)?.hearts;

    expect(harness.events.some((event) => event.type === 'sound' && event.cue === 'iceball')).toBeTrue();
    expect(slime.isFrozen).toBeTrue();
    expect(slime.isHarmful).toBeFalse();

    bumpIntoFirstEnemy(harness);

    expect(lastHud(harness.events)?.hearts).toBe(heartsBefore);
    expect(harness.simulation.player.isBig).toBeTrue();

    harness.simulation.player.placeFeetAt(centerX(slime.body), slime.body.y - 20);
    run(harness, 0.6);

    expect(harness.simulation.enemies.length).toBe(0);
  });

  it('derrete o gelo depois de um tempo e o inimigo volta a andar', () => {
    const harness = start(levelWithPowerUp('ice-flower').add('slime', 12, SURFACE - 1).build(META));
    run(harness, 0.4, { right: true });

    harness.simulation.step({ ...IDLE_INPUT, actionPressed: true });
    run(harness, 1.5);

    const slime = harness.simulation.enemies[0];

    expect(slime.isFrozen).toBeTrue();

    run(harness, 5);

    expect(slime.isFrozen).toBeFalse();
    expect(slime.isHarmful).toBeTrue();
  });

  it('não congela a bolinha de lava', () => {
    const harness = start(flatLevel().add('lava-bubble', 10, SURFACE - 1).build(META));

    expect(harness.simulation.enemies[0].canBeFrozen).toBeFalse();
  });

  it('troca a Flor de Fogo pela Flor de Gelo: uma flor de cada vez', () => {
    const harness = start(levelWithPowerUp('fire-flower').add('power-up', 5, SURFACE - 1, { powerUp: 'ice-flower' }).build(META));
    run(harness, 0.8, { right: true });

    const player = harness.simulation.player;

    expect(player.hasPowerUp('fire-flower')).toBeFalse();
    expect(player.hasPowerUp('ice-flower')).toBeTrue();
    expect(player.flowerElement).toBe('ice');
    expect(harness.events).toContain({ type: 'power-up-ended', kind: 'fire-flower' });
  });

  it('desce o escorregador ganhando velocidade e sai correndo lá embaixo', () => {
    const harness = start(flatLevel().add('slide', 8, SURFACE - 1).build(META));
    const ramp = harness.simulation.slides.ramps[0];
    const player = harness.simulation.player;
    let hasSlid = false;
    let fastestX = 0;

    player.placeFeetAt(8.5 * TILE_SIZE, (SURFACE - SLIDE_PHYSICS.height) * TILE_SIZE);

    for (let step = 0; step < 90; step += 1) {
      harness.simulation.step({ ...IDLE_INPUT, right: true });
      hasSlid ||= player.mode === 'SLIDE';
      fastestX = Math.max(fastestX, player.body.vx);
    }

    expect(hasSlid).toBeTrue();
    expect(harness.events.some((event) => event.type === 'sound' && event.cue === 'slide')).toBeTrue();
    expect(player.isSliding).toBeFalse();
    expect(centerX(player.body)).toBeGreaterThan(ramp.bottomX);
    expect(bottom(player.body)).toBeCloseTo(SURFACE * TILE_SIZE, 3);
    expect(fastestX).toBeGreaterThan(PLAYER_PHYSICS.runSpeed);
  });

  it('passa por baixo do escorregador sem ser pego por ele', () => {
    const harness = start(flatLevel().add('slide', 8, SURFACE - 1).build(META));
    const player = harness.simulation.player;
    let hasSlid = false;

    for (let step = 0; step < 150; step += 1) {
      harness.simulation.step({ ...IDLE_INPUT, right: true });
      hasSlid ||= player.isSliding;
    }

    expect(hasSlid).toBeFalse();
    expect(centerX(player.body)).toBeGreaterThan(harness.simulation.slides.ramps[0].bottomX);
  });

  it('sai do escorregador com um pulo', () => {
    const harness = start(flatLevel().add('slide', 8, SURFACE - 1).build(META));
    const player = harness.simulation.player;

    player.placeFeetAt(9.3 * TILE_SIZE, (SURFACE - SLIDE_PHYSICS.height) * TILE_SIZE - 10);
    run(harness, 0.15);

    expect(player.isSliding).toBeTrue();

    jump(harness, 0.1);

    expect(player.isSliding).toBeFalse();
    expect(player.body.vy).toBeLessThan(0);
  });

  describe('Inimigos do Dia das Bruxas', () => {
    /** Pisão de cima no inimigo: o herói cai sobre a cabeça dele. */
    const stompOn = (harness: Harness, index = 0): void => {
      const enemy = harness.simulation.enemies[index];
      const player = harness.simulation.player;

      player.placeFeetAt(centerX(enemy.body), enemy.body.y - 4);
      player.body.vy = 300;
      run(harness, 0.1);
    };

    it('o Rei Cacto tem espinhos: pisar nele machuca e ele continua de pé', () => {
      const harness = start(flatLevel().add('king-cactus', 12, SURFACE - 1).build(META));
      run(harness, 0.2);
      stompOn(harness);

      expect(harness.simulation.enemies[0].isDefeated).toBeFalse();
      expect(lastHud(harness.events)?.hearts).toBe(2);
    });

    it('o Rei Cacto patrulha devagar, mais devagar que o slime', () => {
      const harness = start(flatLevel().add('king-cactus', 8, SURFACE - 1).add('slime', 16, SURFACE - 1).build(META));
      const [cactus, slime] = harness.simulation.enemies;
      const cactusStart = centerX(cactus.body);
      const slimeStart = centerX(slime.body);
      run(harness, 1);

      expect(Math.abs(centerX(cactus.body) - cactusStart)).toBeGreaterThan(0);
      expect(Math.abs(centerX(cactus.body) - cactusStart)).toBeLessThan(Math.abs(centerX(slime.body) - slimeStart));
    });

    it('a abóbora viva anda aos pulinhos e cai com um pisão', () => {
      const harness = start(flatLevel().add('living-pumpkin', 12, SURFACE - 1).build(META));
      const pumpkin = harness.simulation.enemies[0];
      const ground = bottom(pumpkin.body);
      let highest = ground;

      for (let step = 0; step < Math.round(2000 / STEP_MS); step += 1) {
        harness.simulation.step(IDLE_INPUT);
        highest = Math.min(highest, bottom(pumpkin.body));
      }

      expect(ground - highest).toBeGreaterThan(TILE_SIZE / 2);
      expect(ground - highest).toBeLessThan(TILE_SIZE * 3);

      run(harness, 1.5);
      stompOn(harness);

      expect(pumpkin.isDefeated).toBeTrue();
      expect(lastHud(harness.events)?.hearts).toBe(3);
    });

    it('a bruxa voa de vassoura de um lado para o outro, sem cair', () => {
      const harness = start(flatLevel().add('witch', 15, SURFACE - 5).build(META));
      const witch = harness.simulation.enemies[0];
      const startX = centerX(witch.body);
      let farthest = 0;

      for (let step = 0; step < Math.round(5000 / STEP_MS); step += 1) {
        harness.simulation.step(IDLE_INPUT);
        farthest = Math.max(farthest, Math.abs(centerX(witch.body) - startX));
      }

      expect(farthest).toBeGreaterThan(TILE_SIZE * 3);
      expect(bottom(witch.body)).toBeLessThan((SURFACE - 2) * TILE_SIZE);
    });

    it('a bruxa cai com um pisão', () => {
      const harness = start(flatLevel().add('witch', 12, SURFACE - 3).build(META));
      const witch = harness.simulation.enemies[0];
      run(harness, 0.2);
      stompOn(harness);

      expect(witch.isDefeated).toBeTrue();
      expect(lastHud(harness.events)?.hearts).toBe(3);
    });
  });

  it('derrota o goomba com um pisão', () => {
    const harness = start(flatLevel().add('goomba', 12, SURFACE - 1).build(META));
    run(harness, 0.2);

    const goomba = harness.simulation.enemies[0];
    const player = harness.simulation.player;

    player.placeFeetAt(centerX(goomba.body), goomba.body.y - 4);
    player.body.vy = 300;
    run(harness, 0.1);

    expect(goomba.isDefeated).toBeTrue();
    expect(lastHud(harness.events)?.hearts).toBe(3);
  });

  describe('Cogumelo no bloco musical', () => {
    /** O ponto mais alto que o pé do inimigo alcança em `seconds`. */
    const highestFeet = (harness: Harness, seconds: number): number => {
      const body = harness.simulation.enemies[0].body;
      let highest = bottom(body);

      for (let step = 0; step < Math.round((seconds * 1000) / STEP_MS); step += 1) {
        harness.simulation.step(IDLE_INPUT);
        highest = Math.min(highest, bottom(body));
      }

      return highest;
    };

    it('o goomba em cima do bloco musical quica, tocando a nota do bloco', () => {
      const harness = start(flatLevel().add('note', 12, SURFACE - 1).add('goomba', 12, SURFACE - 2).build(META));
      const noteTop = (SURFACE - 1) * TILE_SIZE;

      expect(highestFeet(harness, 1.5)).toBeLessThan(noteTop - TILE_SIZE * 2);
      expect(harness.events.some((event) => event.type === 'note')).toBeTrue();
    });

    it('o slime no bloco musical não quica: é coisa de cogumelo', () => {
      const harness = start(flatLevel().add('note', 12, SURFACE - 1).add('slime', 12, SURFACE - 2).build(META));
      const noteTop = (SURFACE - 1) * TILE_SIZE;

      expect(highestFeet(harness, 1.5)).toBeGreaterThan(noteTop - TILE_SIZE / 2);
    });

    it('o goomba congelado no bloco musical fica parado', () => {
      const harness = start(flatLevel().add('note', 12, SURFACE - 1).add('goomba', 12, SURFACE - 2).build(META));
      harness.simulation.enemies[0].freezeInIce(0);
      const noteTop = (SURFACE - 1) * TILE_SIZE;

      expect(highestFeet(harness, 0.5)).toBeGreaterThan(noteTop - TILE_SIZE / 2);
    });
  });

  it('divide o Rei Slime em dois slimes no pisão, sem machucar quem pisou', () => {
    const harness = start(flatLevel().add('king-slime', 12, SURFACE - 1).build(META));
    run(harness, 0.2);

    const king = harness.simulation.enemies[0];
    const player = harness.simulation.player;

    player.placeFeetAt(centerX(king.body), king.body.y - 4);
    player.body.vy = 300;
    run(harness, 0.1);

    const slimes = harness.simulation.enemies.filter((enemy) => enemy.kind === 'slime');

    expect(king.isDefeated).toBeTrue();
    expect(slimes.length).toBe(2);
    expect(new Set(slimes.map((slime) => slime.direction))).toEqual(new Set([-1, 1]));
    expect(lastHud(harness.events)?.hearts).toBe(3);
  });

  it('faz o thwomp despencar quando o Pedro passa embaixo e voltar para o alto', () => {
    const harness = start(flatLevel().add('thwomp', 12, SURFACE - 4).build(META));
    const thwomp = harness.simulation.enemies[0];
    const homeY = thwomp.body.y;

    run(harness, 0.5);
    expect(thwomp.body.y).toBe(homeY);

    // Um passo embaixo dele basta para a queda; depois o Pedro sai da frente.
    harness.simulation.player.placeFeetAt(centerX(thwomp.body), SURFACE * TILE_SIZE);
    harness.simulation.step(IDLE_INPUT);
    harness.simulation.player.placeFeetAt(centerX(thwomp.body) + TILE_SIZE * 6, SURFACE * TILE_SIZE);
    run(harness, 0.6);

    expect(bottom(thwomp.body)).toBeCloseTo(SURFACE * TILE_SIZE, 0);
    expect(thwomp.canBeStomped).toBeFalse();

    run(harness, 4);

    expect(thwomp.body.y).toBeCloseTo(homeY, 0);
  });

  it('dispara a bala de canhão de novo do ponto de partida quando ela bate na parede', () => {
    const harness = start(flatLevel().fill('stone', 8, 8, SURFACE - 3, SURFACE - 1).add('bullet', 14, SURFACE - 2).build(META));
    const bullet = harness.simulation.enemies[0];
    const homeX = centerX(bullet.body);
    let closest = homeX;

    for (let step = 0; step < 240; step += 1) {
      harness.simulation.step(IDLE_INPUT);
      closest = Math.min(closest, centerX(bullet.body));
    }

    expect(closest).toBeLessThan(homeX - TILE_SIZE * 4);
    expect(centerX(bullet.body)).toBeGreaterThan(9 * TILE_SIZE);
    expect(bullet.isFireproof).toBeTrue();
  });

  it('leva à outra porta dourada e dá moedas só na primeira passagem', () => {
    const harness = start(
      flatLevel().add('golden-door', 6, SURFACE - 1, { pair: 'C' }).add('golden-door', 30, SURFACE - 1, { pair: 'C' }).build(META),
    );
    const player = harness.simulation.player;
    run(harness, 0.2);

    player.placeFeetAt(6.5 * TILE_SIZE, SURFACE * TILE_SIZE);
    harness.simulation.step({ ...IDLE_INPUT, actionPressed: true });
    run(harness, 0.1);

    expect(Math.round(centerX(player.body) / TILE_SIZE - 0.5)).toBe(30);
    expect(lastHud(harness.events)?.coins).toBe(10);

    player.placeFeetAt(6.5 * TILE_SIZE, SURFACE * TILE_SIZE);
    harness.simulation.step({ ...IDLE_INPUT, actionPressed: true });
    run(harness, 0.1);

    expect(lastHud(harness.events)?.coins).toBe(10);
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
