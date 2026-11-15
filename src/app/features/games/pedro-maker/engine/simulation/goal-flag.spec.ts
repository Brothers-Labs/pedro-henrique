import { EDITOR_CATEGORIES, EDITOR_PIECES, findEditorPiece } from '../../config/object-catalog';
import { TILE_SIZE } from '../../config/physics.config';
import { DIFFICULTY_RULES } from '../../config/rules.config';
import { LevelBuilder } from '../../levels/level-builder';
import { sanitizeLevelObject } from '../../levels/level-validation';
import type { LevelBlueprint } from '../../models/level.model';
import type { GameSessionEvent } from '../../models/session.model';
import { IDLE_INPUT, type InputSnapshot } from '../input/input-snapshot';
import { GameSimulation, STEP_MS } from './game-simulation';
import { GOAL_FLAG_HEIGHT } from './triggers';

const META = { id: 'teste-bandeira', name: 'Teste', theme: 'vale', targetTimeSeconds: 60 } as const;
const SURFACE = 12;
const FLAG_COLUMN = 20;

interface Harness {
  readonly simulation: GameSimulation;
  readonly events: GameSessionEvent[];
}

/** Chão reto com a bandeira final na coluna 20, no lugar do portal. */
function flagLevel(): LevelBlueprint {
  return new LevelBuilder(30, 15)
    .ground(0, 29, SURFACE)
    .add('start', 2, SURFACE - 1)
    .add('portal', FLAG_COLUMN, SURFACE - 1, { portalLook: 'flag' })
    .build(META);
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

describe('Bandeira Final', () => {
  it('andando até o mastro, a fase termina e o herói desce até o pé dele', () => {
    const harness = start(flagLevel());

    run(harness, 6, { right: true });

    const { simulation } = harness;
    const celebration = simulation.player.celebration;

    expect(simulation.isFinished).toBeTrue();
    expect(simulation.triggers.portal?.look).toBe('flag');
    expect(celebration?.toY).withContext('os pés chegam ao chão, ao pé do mastro').toBe(SURFACE * TILE_SIZE);
    expect(celebration?.toX).toBeLessThan((FLAG_COLUMN + 0.5) * TILE_SIZE);
    expect(harness.events.some((event) => event.type === 'completed')).toBeTrue();
  });

  it('encostar lá no alto do mastro também termina a fase', () => {
    const harness = start(flagLevel());

    run(harness, 0.2);

    const flagX = (FLAG_COLUMN + 0.5) * TILE_SIZE;
    const groundY = SURFACE * TILE_SIZE;

    // No ar, perto da bola dourada: bem acima de onde o portal comum alcança.
    harness.simulation.player.placeFeetAt(flagX - 10, groundY - GOAL_FLAG_HEIGHT + TILE_SIZE * 1.5);
    harness.simulation.step(IDLE_INPUT);

    expect(harness.simulation.isFinished).toBeTrue();
  });

  it('longe do mastro, nada acontece', () => {
    const harness = start(flagLevel());

    run(harness, 0.2);
    harness.simulation.player.placeFeetAt((FLAG_COLUMN - 2) * TILE_SIZE, SURFACE * TILE_SIZE);
    run(harness, 0.3);

    expect(harness.simulation.isFinished).toBeFalse();
  });

  it('a fase salva guarda o desenho de bandeira', () => {
    const object = sanitizeLevelObject({ id: 'p', type: 'portal', x: 4, y: 4, properties: { portalLook: 'flag' } }, 30, 15);

    expect(object?.properties?.portalLook).toBe('flag');
  });
});

describe('Aba Bandeiras no editor', () => {
  it('troca a aba Checkpoints pela Bandeiras, com o Checkpoint e a Bandeira Final', () => {
    const labels = EDITOR_CATEGORIES.map((category) => category.label);

    expect(labels).toContain('Bandeiras');
    expect(labels).not.toContain('Checkpoints');
    expect(EDITOR_PIECES.filter((piece) => piece.category === 'bandeiras').map((piece) => piece.label)).toEqual(['Checkpoint', 'Bandeira Final']);
    expect(findEditorPiece({ type: 'portal', properties: { portalLook: 'flag' } })?.label).toBe('Bandeira Final');
    expect(findEditorPiece({ type: 'portal' })?.label).withContext('o portal comum continua o mesmo').toBe('Portal final');
  });
});
