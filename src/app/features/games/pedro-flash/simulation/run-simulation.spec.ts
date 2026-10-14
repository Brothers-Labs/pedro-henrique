import { SeededRandom } from '../../pedro-maker/levels/seeded-random';
import { traceRoute } from '../../pedro-kart/tracks/default-tracks';
import { difficultyOption } from '../config/runner.config';
import { courseGap } from '../course/course-geometry';
import { ARENAS, DEFAULT_COURSES } from '../course/default-courses';
import type { CourseDefinition, CoursePiece } from '../models/course.model';
import type { FlashDifficulty, RunMode } from '../models/runner.model';
import { IDLE_RUN, type RunInput } from './runner';
import { RunnerPilot } from './runner-pilot';
import { COUNTDOWN_MS, RUN_STEP_MS, rubberBand, RunSimulation, type RunEvent, type RunResult } from './run-simulation';

const FIVE_MINUTES_IN_STEPS = (5 * 60 * 1000) / RUN_STEP_MS;

function straight(pieces: readonly CoursePiece[]): CourseDefinition {
  return { id: 'teste', name: 'Teste', theme: 'cidade', isCircuit: false, path: traceRoute({ column: 0, row: 5 }, 'R13'), pieces };
}

function createRun(course: CourseDefinition, mode: RunMode = 'aventura', difficulty: FlashDifficulty = 'normal', boss = ARENAS[0].boss): RunSimulation {
  return new RunSimulation({
    course,
    mode,
    playerSetup: { shoe: 'relampago', trail: 'amarelo' },
    playerName: 'Pedro',
    tuning: difficultyOption(difficulty).tuning,
    boss: mode === 'batalha' ? boss : undefined,
    seed: 42,
  });
}

/** Joga até a chegada com o Pedro no piloto automático caçador, o mesmo que derruba chefões. */
function playToFinish(run: RunSimulation): RunEvent[] {
  const pilot = new RunnerPilot(run, 0, new SeededRandom(7), true);

  return playWith(run, () => pilot.decide(run.player));
}

function playWith(run: RunSimulation, decide: () => RunInput): RunEvent[] {
  const events: RunEvent[] = [];

  for (let step = 0; step < FIVE_MINUTES_IN_STEPS && run.phase !== 'terminou'; step += 1) {
    run.step(decide());
    events.push(...run.drainEvents());
  }

  return events;
}

function finishOf(events: readonly RunEvent[]): RunResult | null {
  const finish = events.find((event) => event.type === 'chegada');

  return finish?.type === 'chegada' ? finish.result : null;
}

function skipCountdown(run: RunSimulation): void {
  for (let elapsed = 0; elapsed <= COUNTDOWN_MS; elapsed += RUN_STEP_MS) {
    run.step(IDLE_RUN);
  }

  run.drainEvents();
}

describe('Partida do Pedro Flash', () => {
  it('conta 3, 2, 1 e larga, sem ninguém sair do lugar antes', () => {
    const run = createRun(DEFAULT_COURSES[0]);
    const start = run.player.distance;
    const events: RunEvent[] = [];

    for (let elapsed = 0; elapsed <= COUNTDOWN_MS; elapsed += RUN_STEP_MS) {
      run.step(IDLE_RUN);
      events.push(...run.drainEvents());
    }

    expect(events.filter((event) => event.type === 'contagem').map((event) => (event.type === 'contagem' ? event.value : 0))).toEqual([3, 2, 1]);
    expect(events.some((event) => event.type === 'largada')).toBeTrue();
    expect(run.player.distance).toBe(start);
  });

  for (const course of DEFAULT_COURSES) {
    for (const difficulty of ['facil', 'normal', 'dificil'] as const) {
      it(`termina a fase "${course.name}" na aventura (${difficulty})`, () => {
        const events = playToFinish(createRun(course, 'aventura', difficulty));
        const result = finishOf(events);

        expect(result).not.toBeNull();
        expect(events.some((event) => event.type === 'raio')).toBeTrue();
        expect(result?.timeMs).toBeGreaterThan(0);
        expect(result?.racers).toBe(1);
      });
    }

    it(`termina a corrida em "${course.name}" com colocação de verdade`, () => {
      const run = createRun(course, 'corrida');
      const result = finishOf(playToFinish(run));

      expect(result?.racers).toBe(4);
      expect(result?.placement).toBeGreaterThanOrEqual(1);
      expect(result?.placement).toBeLessThanOrEqual(4);
    });
  }

  for (const arena of ARENAS) {
    for (const difficulty of ['facil', 'normal', 'dificil'] as const) {
      it(`derrota o ${arena.boss} na "${arena.name}" (${difficulty})`, () => {
        const events = playToFinish(createRun(arena.course, 'batalha', difficulty, arena.boss));
        const result = finishOf(events);

        expect(result?.bossDefeated).toBeTrue();
        expect(events.some((event) => event.type === 'chefe-chegou')).toBeTrue();
        expect(events.some((event) => event.type === 'chefe-ataque')).toBeTrue();
      });
    }
  }

  it('recusa o modo que não combina com a fase', () => {
    expect(() => createRun(DEFAULT_COURSES[0], 'batalha')).toThrowError(/não combina/);
    expect(() => createRun(ARENAS[0].course, 'aventura')).toThrowError(/não combina/);
  });

  it('perde metade dos raios nos espinhos no normal, e nada com escudo', () => {
    const run = createRun(straight([{ cell: 5, kind: 'espinhos', lane: 0 }]));

    skipCountdown(run);
    run.player.raios = 10;

    const events = playWith(run, () => IDLE_RUN);

    expect(events).toContain({ type: 'dano', lost: 5 });
    expect(finishOf(events)?.raios).toBe(5);

    const shielded = createRun(straight([{ cell: 5, kind: 'espinhos', lane: 0 }]));

    skipCountdown(shielded);
    shielded.player.raios = 10;
    shielded.player.hasShield = true;

    const shieldEvents = playWith(shielded, () => IDLE_RUN);

    expect(shieldEvents.some((event) => event.type === 'escudo-quebrou')).toBeTrue();
    expect(finishOf(shieldEvents)?.raios).toBe(10);
  });

  it('cai no buraco sem pular e reaparece antes dele', () => {
    const run = createRun(straight([{ cell: 5, kind: 'buraco', lane: 0 }]));
    const gapStart = run.course.gaps[0].start;
    let fellAt: number | null = null;

    skipCountdown(run);

    for (let step = 0; step < 600 && fellAt === null; step += 1) {
      run.step(IDLE_RUN);

      if (run.drainEvents().some((event) => event.type === 'caiu')) {
        fellAt = run.player.distance;
      }
    }

    expect(fellAt).not.toBeNull();
    expect(fellAt ?? Infinity).toBeLessThan(gapStart);
    expect(run.player.isGrounded).toBeTrue();
  });

  it('pula o buraco sozinho no fácil', () => {
    const events = playWith(createRun(straight([{ cell: 5, kind: 'buraco', lane: 0 }]), 'aventura', 'facil'), () => IDLE_RUN);

    expect(events.some((event) => event.type === 'caiu')).toBeFalse();
    expect(finishOf(events)).not.toBeNull();
  });

  it('derruba o robô com o ataque teleguiado', () => {
    const run = createRun(straight([{ cell: 7, kind: 'abelha', lane: 1 }]));
    const [bee] = run.enemies;
    let presses = 0;

    skipCountdown(run);

    const events = playWith(run, () => {
      const gap = courseGap(run.course, run.player.distance, bee.distance);
      const shouldPress = gap < 20 && presses < 2 && (presses === 0 || !run.player.isGrounded);

      if (shouldPress) {
        presses += 1;
      }

      return { ...IDLE_RUN, jump: shouldPress };
    });

    expect(events.some((event) => event.type === 'ataque')).toBeTrue();
    expect(events).toContain({ type: 'inimigo-derrotado', kind: 'abelha' });
    expect(bee.isDefeated).toBeTrue();
  });

  it('é jogado para o alto pela mola', () => {
    const run = createRun(straight([{ cell: 4, kind: 'mola', lane: 0 }]));
    let highest = 0;

    skipCountdown(run);

    for (let step = 0; step < 600 && run.phase !== 'terminou'; step += 1) {
      run.step(IDLE_RUN);
      highest = Math.max(highest, run.player.height);
    }

    expect(highest).toBeGreaterThan(7);
  });

  it('atravessa o looping colado na pista e junta os raios dele', () => {
    const run = createRun(straight([{ cell: 6, kind: 'loop', lane: 0 }]));
    const [loop] = run.course.loops;
    let maxHeight = 0;

    skipCountdown(run);

    for (let step = 0; step < 1200 && run.phase !== 'terminou'; step += 1) {
      run.step(IDLE_RUN);

      if (run.player.distance > loop.start && run.player.distance < loop.end) {
        maxHeight = Math.max(maxHeight, run.player.height);
      }
    }

    expect(maxHeight).toBe(0);
    expect(run.player.raios).toBe(9);
  });

  it('gasta energia no modo relâmpago e corre bem mais rápido', () => {
    const run = createRun(straight([]));

    skipCountdown(run);

    for (let step = 0; step < 180; step += 1) {
      run.step(IDLE_RUN);
    }

    const cruising = run.player.speed;

    run.player.energy = 100;
    run.step({ ...IDLE_RUN, dash: true });

    for (let step = 0; step < 60; step += 1) {
      run.step(IDLE_RUN);
    }

    expect(run.player.energy).toBe(50);
    expect(run.player.speed).toBeGreaterThan(cruising * 1.3);
  });

  it('segura quem dispara na frente e dá fôlego a quem fica para trás', () => {
    const tuning = difficultyOption('normal').tuning;

    expect(rubberBand(0, tuning)).toBe(1);
    expect(rubberBand(tuning.rivalLeadLimit + 1, tuning)).toBe(tuning.rivalLeadPace);
    expect(rubberBand(-80, tuning)).toBeGreaterThan(1);
  });
});
