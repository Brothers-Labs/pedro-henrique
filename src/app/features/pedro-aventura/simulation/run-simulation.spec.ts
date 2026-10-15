import { DIFFICULTIES, difficultyById } from '../config/difficulty.config';
import { REGIONS, findLevel } from '../config/regions.config';
import type { LevelDefinition } from '../models/campaign.model';
import { generateLayout } from './level-generator';
import { NO_COMMANDS, RUN_PHYSICS, type RunCommands, type RunEvent, RunSimulation } from './run-simulation';
import { type Lane, LANES, laneX, OBSTACLE_SIZE, type TrackLayout } from './track.model';

const MAX_STEPS = 60 * 240;

function level(id: string): LevelDefinition {
  const found = findLevel(id);

  if (!found) {
    throw new Error(`Fase ${id} não existe.`);
  }

  return found;
}

/** Pista vazia, para testar um movimento por vez. */
function emptyTrack(length = 200): TrackLayout {
  return {
    levelId: 'teste',
    length,
    checkpoints: [Math.round(length / 3), Math.round((length * 2) / 3)],
    obstacles: [],
    pickups: [],
    ramps: [],
    totals: { coins: 0, hearts: 0, crowns: 0, ramps: 0 },
  };
}

function startRun(layout: TrackLayout, definition = level('1-1')): RunSimulation {
  const run = new RunSimulation(definition, layout);

  run.start();

  return run;
}

function advance(run: RunSimulation, steps: number, commands: Partial<RunCommands> = {}): RunEvent[] {
  const events: RunEvent[] = [];

  for (let index = 0; index < steps; index += 1) {
    run.step(index === 0 ? { ...NO_COMMANDS, ...commands } : NO_COMMANDS);
    events.push(...run.drainEvents());
  }

  return events;
}

/**
 * Piloto automático simples: olha a faixa à frente e escolhe pular, derrapar,
 * atacar ou trocar de faixa. Serve para provar que a fase gerada é vencível.
 */
function pilot(run: RunSimulation): RunCommands {
  const { player } = run;
  const lookahead = player.speed * 0.9 + 3;
  const ahead = run.obstacles
    .filter((obstacle) => !obstacle.isBroken && obstacle.z - player.z > -0.5 && obstacle.z - player.z < lookahead)
    .sort((first, second) => first.z - second.z);
  const inLane = (lane: Lane) =>
    ahead.filter((obstacle) => Math.abs(obstacle.x - laneX(lane)) < OBSTACLE_SIZE[obstacle.spec.kind].width / 2 + 0.6);
  const current = inLane(player.lane)[0];

  if (!current) {
    return NO_COMMANDS;
  }

  const distance = current.z - player.z;
  const kind = current.spec.kind;

  if (kind === 'crate' && distance < RUN_PHYSICS.attackRange - 0.5) {
    return { ...NO_COMMANDS, attack: true };
  }

  if (kind === 'high-bar') {
    return distance < player.speed * 0.25 + 1 && player.isGrounded ? { ...NO_COMMANDS, slide: true } : NO_COMMANDS;
  }

  const freeLane = LANES.filter((lane) => inLane(lane).length === 0).sort(
    (first, second) => Math.abs(first - player.lane) - Math.abs(second - player.lane),
  )[0];

  if (freeLane !== undefined && freeLane !== player.lane && distance > 2) {
    return freeLane < player.lane ? { ...NO_COMMANDS, left: true } : { ...NO_COMMANDS, right: true };
  }

  return distance < player.speed * 0.22 + 1.2 && player.isGrounded ? { ...NO_COMMANDS, jump: true } : NO_COMMANDS;
}

describe('RunSimulation', () => {
  it('só anda depois de começar e para quando pausa', () => {
    const run = new RunSimulation(level('1-1'), emptyTrack());

    run.step(NO_COMMANDS);
    expect(run.player.z).toBe(0);
    expect(run.phase).toBe('ready');

    run.start();
    advance(run, 30);
    const moved = run.player.z;

    expect(moved).toBeGreaterThan(0);

    run.pause();
    advance(run, 30);
    expect(run.player.z).toBe(moved);
    expect(run.phase).toBe('paused');

    run.resume();
    expect(run.phase).toBe('playing');
  });

  it('pula, sobe e volta ao chão', () => {
    const run = startRun(emptyTrack());
    const events = advance(run, 30, { jump: true });

    expect(events.some((event) => event.type === 'jump')).toBeTrue();
    expect(run.player.y).toBeGreaterThan(1.5);

    const landing = advance(run, 60);

    expect(landing.some((event) => event.type === 'land')).toBeTrue();
    expect(run.player.y).toBe(0);
  });

  it('troca de faixa um passo por toque, sem passar das bordas', () => {
    const run = startRun(emptyTrack());

    advance(run, 20, { left: true });
    advance(run, 20, { left: true });

    expect(run.player.lane).toBe(-1);
    expect(run.player.x).toBeCloseTo(laneX(-1), 5);
  });

  it('perde um coração ao bater e fica invencível por um instante', () => {
    const layout = { ...emptyTrack(), obstacles: [{ id: 1, kind: 'barrier' as const, lane: 0 as const, z: 20 }] };
    const run = startRun(layout);
    const events = advance(run, 200);

    expect(events.filter((event) => event.type === 'hit').length).toBe(1);
    expect(run.hud().lives).toBe(DIFFICULTIES[0].maxLives - 1);
    expect(run.result().damageTaken).toBe(1);
  });

  it('passa por cima da barreira pulando e por baixo da barra derrapando', () => {
    const jumpLayout = { ...emptyTrack(), obstacles: [{ id: 1, kind: 'barrier' as const, lane: 0 as const, z: 20 }] };
    const jumper = startRun(jumpLayout);

    advance(jumper, Math.round(((20 - 2.6) / jumper.level.startSpeed) * 60));
    advance(jumper, 120, { jump: true });
    expect(jumper.result().damageTaken).toBe(0);

    const slideLayout = { ...emptyTrack(), obstacles: [{ id: 1, kind: 'high-bar' as const, lane: 0 as const, z: 20 }] };
    const slider = startRun(slideLayout);

    advance(slider, Math.round(((20 - 4) / slider.level.startSpeed) * 60));
    advance(slider, 120, { slide: true });
    expect(slider.result().damageTaken).toBe(0);
  });

  it('quebra a caixa com o ataque', () => {
    const layout = { ...emptyTrack(), obstacles: [{ id: 7, kind: 'crate' as const, lane: 0 as const, z: 12 }] };
    const run = startRun(layout);

    advance(run, Math.round(((12 - 3) / run.level.startSpeed) * 60));
    const events = advance(run, 120, { attack: true });

    expect(events).toContain({ type: 'break', obstacleId: 7 });
    expect(run.result().damageTaken).toBe(0);
  });

  it('quebra a caixa em que o Pedro bate, para ela sumir da cena', () => {
    const layout = { ...emptyTrack(), obstacles: [{ id: 9, kind: 'crate' as const, lane: 0 as const, z: 12 }] };
    const events = advance(startRun(layout), 200);

    expect(events).toContain({ type: 'hit', obstacleId: 9 });
    expect(events).toContain({ type: 'break', obstacleId: 9 });
  });

  it('pega moedas e corações e conta a rampa uma vez só', () => {
    const layout: TrackLayout = {
      ...emptyTrack(),
      pickups: [
        { id: 1, kind: 'coin', lane: 0, z: 8, y: 1 },
        { id: 2, kind: 'heart', lane: 0, z: 10, y: 1 },
      ],
      ramps: [{ id: 3, lane: 0, z: 30 }],
    };
    const run = startRun(layout);

    advance(run, 300);

    expect(run.result()).toEqual(jasmine.objectContaining({ coins: 1, hearts: 1, ramps: 1 }));
  });

  it('chega à vitória no fim da pista', () => {
    const run = startRun(emptyTrack(60));
    const events = advance(run, 60 * 10);

    expect(run.phase).toBe('victory');
    expect(events.filter((event) => event.type === 'victory').length).toBe(1);
    expect(run.result().timeMs).toBeGreaterThan(0);
  });

  it('cai na derrota sem corações e continua do checkpoint com o coração cheio', () => {
    const obstacles = [30, 45, 60, 75].map((z, index) => ({ id: index + 1, kind: 'parked-car' as const, lane: 0 as const, z }));
    const run = startRun({ ...emptyTrack(300), obstacles });

    advance(run, 60 * 12);
    expect(run.phase).toBe('defeat');

    run.continueFromCheckpoint();

    expect(run.phase).toBe('playing');
    expect(run.hud().lives).toBe(DIFFICULTIES[0].maxLives);
  });

  it('corre mais rápido no Médio e no Difícil, e o Difícil tem só 2 corações', () => {
    const distance = (id: 'facil' | 'medio' | 'dificil') => {
      const run = new RunSimulation(level('1-1'), emptyTrack(), difficultyById(id));

      run.start();
      advance(run, 60);

      return run.player.z;
    };

    expect(distance('medio')).toBeGreaterThan(distance('facil'));
    expect(distance('dificil')).toBeGreaterThan(distance('medio'));
    expect(new RunSimulation(level('1-1'), emptyTrack(), difficultyById('dificil')).hud().maxLives).toBe(2);
  });

  for (const regionId of ['ilha-inicial', 'montanha-radical'] as const) {
    const region = REGIONS.find((candidate) => candidate.id === regionId);

    for (const definition of region?.levels ?? []) {
      it(`o piloto automático vence a fase ${definition.id}`, () => {
        const run = startRun(generateLayout(definition), definition);

        for (let step = 0; step < MAX_STEPS && run.phase === 'playing'; step += 1) {
          run.step(pilot(run));
          run.drainEvents();
        }

        expect(run.phase).withContext(`dano: ${run.result().damageTaken}`).toBe('victory');
      });
    }
  }
});
