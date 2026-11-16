import { EDITOR_PIECES, findEditorPiece } from '../../config/object-catalog';
import { DIFFICULTY_RULES } from '../../config/rules.config';
import { TILE_SIZE } from '../../config/physics.config';
import { LevelBuilder } from '../../levels/level-builder';
import { analyzeReachability } from '../../levels/level-reachability';
import type { LevelBlueprint } from '../../models/level.model';
import type { GameSessionEvent, HudState } from '../../models/session.model';
import { IDLE_INPUT, type InputSnapshot } from '../input/input-snapshot';
import { CRUSHER, CRUSHER_CYCLE_MS } from './crushers';
import { GameSimulation, STEP_MS } from './game-simulation';
import { bottom, centerX, isAreaClear } from './physics-body';

const META = { id: 'teste-maquinas', name: 'Teste', theme: 'vale', targetTimeSeconds: 60 } as const;
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

/** Segura o pulo: o primeiro passo conta como apertada, os outros como botão segurado. */
function holdJump(harness: Harness, seconds: number, input: Partial<InputSnapshot> = {}): void {
  harness.simulation.step({ ...IDLE_INPUT, ...input, jumpHeld: true, jumpPressed: true });
  run(harness, seconds, { ...input, jumpHeld: true });
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

/** Um paredão de pedra de cinco blocos de altura, da coluna indicada até a 20: alto demais para qualquer pulo. */
function tallWall(builder: LevelBuilder, column: number): LevelBuilder {
  return builder.fill('stone', column, 20, SURFACE - 5, SURFACE - 1);
}

/** A Corrente de Subir pendurada na coluna indicada, do alto da parede até o chão. */
function hangingChain(builder: LevelBuilder, column: number): LevelBuilder {
  for (let row = SURFACE - 5; row < SURFACE; row += 1) {
    builder.add('climb-chain', column, row);
  }

  return builder;
}

describe('Prensa Esmagadora', () => {
  /** Prensa a três blocos do chão, na coluna 10. */
  const CRUSHER_ROW = SURFACE - 4;

  it('desce até o chão e sobe de novo, num ciclo que se repete', () => {
    const harness = start(flatLevel().add('crusher', 10, CRUSHER_ROW).build(META));
    const system = harness.simulation.crushers;
    const [crusher] = system.crushers;

    expect(crusher.dropCells).withContext('três blocos vazios até o chão').toBe(3);

    const phases = new Set<string>();
    let deepest = 0;

    for (let time = 0; time < CRUSHER_CYCLE_MS; time += 20) {
      const state = system.stateOf(crusher, time);

      phases.add(state.phase);
      deepest = Math.max(deepest, state.offsetPx);
    }

    expect([...phases].sort()).toEqual(['down', 'fall', 'rest', 'rise']);
    expect(deepest).toBe(3 * TILE_SIZE);
    expect(system.stateOf(crusher, 0)).toEqual(system.stateOf(crusher, CRUSHER_CYCLE_MS));
  });

  it('esmaga o herói parado embaixo dela: perde um coração', () => {
    const harness = start(flatLevel().add('crusher', 10, CRUSHER_ROW).build(META));

    run(harness, 0.1);
    const heartsBefore = lastHud(harness.events)?.hearts ?? 0;

    harness.simulation.player.placeFeetAt(10.5 * TILE_SIZE, SURFACE * TILE_SIZE);
    run(harness, CRUSHER_CYCLE_MS / 1000);

    expect(lastHud(harness.events)?.hearts).toBeLessThan(heartsBefore);
  });

  it('parada lá em cima é firme: dá para subir nela', () => {
    const harness = start(flatLevel().add('crusher', 10, CRUSHER_ROW).build(META));

    run(harness, 0.1);

    expect(harness.simulation.crushers.stateOf(harness.simulation.crushers.crushers[0], harness.simulation.clockMs).phase).toBe('rest');
    expect(solidAt(harness, 10, CRUSHER_ROW)).toBeTrue();
  });

  it('esmaga os inimigos que passam embaixo', () => {
    // Duas pedras prendem o slime bem embaixo da prensa: ele vai e volta sem sair dali.
    const harness = start(
      flatLevel().add('crusher', 10, CRUSHER_ROW).add('stone', 9, SURFACE - 1).add('stone', 11, SURFACE - 1).add('slime', 10, SURFACE - 1).build(META),
    );
    const slime = harness.simulation.enemies[0];

    run(harness, CRUSHER_CYCLE_MS / 1000);

    expect(slime.isDefeated).toBeTrue();
  });

  it('a alavanca faz a prensa subir e ficar lá em cima: o caminho fica livre', () => {
    const harness = start(flatLevel().add('lever', 5, SURFACE - 1).add('crusher', 10, CRUSHER_ROW).build(META));

    run(harness, 0.1);
    const heartsBefore = lastHud(harness.events)?.hearts ?? 0;

    run(harness, 3, { right: true });

    const system = harness.simulation.crushers;
    const [crusher] = system.crushers;

    expect(harness.simulation.locks.levers[0].isPulled).toBeTrue();
    expect(crusher.isRaised).toBeTrue();
    expect(playerCellX(harness)).toBeGreaterThan(10);
    expect(lastHud(harness.events)?.hearts).withContext('passou embaixo sem ser esmagado').toBe(heartsBefore);
    expect(mascotTexts(harness.events)).toContain('A alavanca levantou a prensa! Pode passar embaixo dela.');

    // Daqui em diante ela fica lá em cima, um bloco acima de onde foi posta, e não esmaga mais ninguém.
    const later = harness.simulation.clockMs + CRUSHER.liftMs + CRUSHER_CYCLE_MS;

    expect(system.stateOf(crusher, later)).toEqual({ phase: 'raised', offsetPx: -CRUSHER.liftPx });
    expect(solidAt(harness, 10, CRUSHER_ROW)).toBeFalse();
    expect(system.crushing(later, { x: 10 * TILE_SIZE, y: (SURFACE - 1) * TILE_SIZE, width: TILE_SIZE, height: TILE_SIZE })).toBeNull();
  });

  it('no validador, a prensa no caminho é parede; com uma alavanca na fase, o caminho conta como aberto', () => {
    // Pedra do teto até a prensa; embaixo dela sobra um vão de um bloco, onde o herói não cabe.
    // Levantada pela alavanca, a prensa deixa o vão com dois blocos de altura.
    const wall = (builder: LevelBuilder): LevelBuilder => builder.fill('stone', 12, 12, 0, SURFACE - 3).add('crusher', 12, SURFACE - 2);

    expect(analyzeReachability(wall(flatLevel()).build(META)).isPortalReachable).toBeFalse();
    expect(analyzeReachability(wall(flatLevel()).add('lever', 6, SURFACE - 1).build(META)).isPortalReachable).toBeTrue();
  });
});

describe('Corrente de Subir', () => {
  it('sem corrente, a parede alta segura o herói', () => {
    const harness = start(tallWall(flatLevel(), 12).build(META));

    harness.simulation.player.placeFeetAt(11.5 * TILE_SIZE, SURFACE * TILE_SIZE);
    holdJump(harness, 2, { right: true });

    expect(playerCellX(harness)).toBeLessThan(12);
  });

  it('segurando o pulo, o herói sobe pela corrente e chega em cima da parede', () => {
    const harness = start(hangingChain(tallWall(flatLevel(), 12), 11).build(META));
    const player = harness.simulation.player;

    player.placeFeetAt(11.5 * TILE_SIZE, SURFACE * TILE_SIZE);
    harness.simulation.step({ ...IDLE_INPUT, jumpHeld: true, jumpPressed: true });
    run(harness, 0.3, { jumpHeld: true });

    expect(player.isOnClimbChain).toBeTrue();
    expect(player.isClimbing).withContext('a pose de escalada aparece na tela').toBeTrue();

    run(harness, 1.5, { jumpHeld: true });
    run(harness, 1, { jumpHeld: true, right: true });
    run(harness, 0.6, { right: true });

    expect(playerCellX(harness)).toBeGreaterThanOrEqual(12);
    expect(bottom(player.body)).toBeCloseTo((SURFACE - 5) * TILE_SIZE, 0);
    expect(player.isGrounded).toBeTrue();
  });

  it('soltando o pulo, o herói escorrega devagarinho em vez de despencar', () => {
    const harness = start(hangingChain(tallWall(flatLevel(), 12), 11).build(META));
    const player = harness.simulation.player;

    player.placeFeetAt(11.5 * TILE_SIZE, (SURFACE - 3) * TILE_SIZE);
    run(harness, 0.5);

    expect(player.isOnClimbChain).toBeTrue();
    expect(player.body.vy).toBeLessThan(200);
    expect(bottom(player.body) - (SURFACE - 3) * TILE_SIZE).withContext('caindo solto, desceria uns 230 pixels em meio segundo').toBeLessThan(60);
  });

  it('pular apertando para o lado solta da corrente', () => {
    const harness = start(hangingChain(flatLevel(), 11).build(META));
    const player = harness.simulation.player;

    player.placeFeetAt(11.5 * TILE_SIZE, (SURFACE - 3) * TILE_SIZE);
    run(harness, 0.2);
    harness.simulation.step({ ...IDLE_INPUT, left: true, jumpHeld: true, jumpPressed: true });
    run(harness, 0.4, { left: true });

    expect(playerCellX(harness)).toBeLessThan(11);
    expect(player.isOnClimbChain).toBeFalse();
  });

  it('no validador, a corrente abre o caminho para o alto da parede', () => {
    // O portal fica em cima de um paredão de cinco blocos: só a corrente leva até lá.
    const tower = (): LevelBuilder => tallWall(new LevelBuilder(40, 15).ground(0, 39, SURFACE).add('start', 2, SURFACE - 1), 12).add('portal', 16, SURFACE - 6);

    expect(analyzeReachability(tower().build(META)).isPortalReachable).toBeFalse();
    expect(analyzeReachability(hangingChain(tower(), 11).build(META)).isPortalReachable).toBeTrue();
  });
});

describe('Peças de máquina no editor', () => {
  it('a Prensa Esmagadora e a Corrente de Subir estão na aba de blocos', () => {
    expect(findEditorPiece({ type: 'crusher' })?.label).toBe('Prensa Esmagadora');
    expect(findEditorPiece({ type: 'climb-chain' })?.label).toBe('Corrente de Subir');
    expect(EDITOR_PIECES.filter((piece) => piece.type === 'crusher' || piece.type === 'climb-chain').map((piece) => piece.category)).toEqual(['blocos', 'blocos']);
  });
});
