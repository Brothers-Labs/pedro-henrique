import { SeededRandom } from '../../pedro-maker/levels/seeded-random';
import { difficultyOption } from '../config/kart.config';
import type { RaceDifficulty } from '../models/kart.model';
import { TRACK_GRID } from '../models/track.model';
import { DEFAULT_TRACKS } from '../tracks/default-tracks';
import { buildCircuit, locate, pointAt, SAMPLES_PER_CELL, signedGap } from './circuit';
import { type DriveInput, handlingFor, IDLE_DRIVE, Kart, STANDARD_FORGIVENESS } from './kart';
import {
  COUNTDOWN_MS,
  RACE_STEP_MS,
  RaceSimulation,
  rubberBand,
  type RaceEvent,
  type RaceResult,
} from './race-simulation';
import { RivalDriver } from './rival-driver';

const PARK = DEFAULT_TRACKS[0];
const TEN_MINUTES_IN_STEPS = (10 * 60 * 1000) / RACE_STEP_MS;

function createRace(trackIndex = 0, difficulty: RaceDifficulty = 'normal', laps = 1): RaceSimulation {
  return new RaceSimulation({
    track: { ...DEFAULT_TRACKS[trackIndex], laps },
    playerSetup: { body: 'classico', color: 'azul' },
    playerName: 'Pedro',
    tuning: difficultyOption(difficulty).tuning,
    seed: 42,
  });
}

/** Corre até a chegada do Pedro, pilotado pelo mesmo piloto automático dos adversários. */
function raceToFinish(race: RaceSimulation): RaceEvent[] {
  const pilot = new RivalDriver(race.circuit, 0, new SeededRandom(7));

  return raceWith(race, () => pilot.decide(race.player, race.karts));
}

function raceWith(race: RaceSimulation, drive: () => DriveInput): RaceEvent[] {
  const events: RaceEvent[] = [];

  for (let step = 0; step < TEN_MINUTES_IN_STEPS && race.phase !== 'terminou'; step += 1) {
    race.step(drive());
    events.push(...race.drainEvents());
  }

  return events;
}

function finishOf(events: readonly RaceEvent[]): RaceResult | null {
  const finish = events.find((event) => event.type === 'chegada');

  return finish?.type === 'chegada' ? finish.result : null;
}

describe('Circuito do Pedro Kart', () => {
  const circuit = buildCircuit(PARK);

  it('gera uma linha central fechada, com seis pontos por casa', () => {
    expect(circuit.samples.length).toBe(PARK.path.length * SAMPLES_PER_CELL);
    // A curva arredonda as quinas, mas a volta continua do tamanho das casas desenhadas.
    const drawnLength = PARK.path.length * TRACK_GRID.cellSize;

    expect(circuit.length).toBeGreaterThan(drawnLength * 0.95);
    expect(circuit.length).toBeLessThan(drawnLength * 1.05);
  });

  it('localiza um ponto da pista pela distância desde a largada', () => {
    const point = pointAt(circuit, 100);
    const location = locate(circuit, point.x, point.z);

    expect(location.along).toBeCloseTo(100, 0);
    expect(Math.abs(location.lateral)).toBeLessThan(0.01);
  });

  it('mede a distância entre dois pontos pelo lado mais curto da volta', () => {
    expect(signedGap(circuit, circuit.length - 5, 5)).toBeCloseTo(10, 5);
    expect(signedGap(circuit, 5, circuit.length - 5)).toBeCloseTo(-10, 5);
  });
});

describe('Corrida do Pedro Kart', () => {
  it('conta três, dois, um e só então solta os karts', () => {
    const race = createRace();
    const startX = race.player.x;
    const events: RaceEvent[] = [];

    for (let step = 0; step * RACE_STEP_MS < COUNTDOWN_MS - RACE_STEP_MS; step += 1) {
      race.step(IDLE_DRIVE);
      events.push(...race.drainEvents());
    }

    expect(events).toEqual([
      { type: 'contagem', value: 3 },
      { type: 'contagem', value: 2 },
      { type: 'contagem', value: 1 },
    ]);
    expect(race.player.x).toBe(startX);
    expect(race.phase).toBe('contagem');

    race.step(IDLE_DRIVE);
    race.step(IDLE_DRIVE);

    expect(race.drainEvents()).toContain({ type: 'largada' });
    expect(race.phase).toBe('correndo');
  });

  it('larga com seis karts, o Pedro no meio do pelotão e todos antes da linha', () => {
    const race = createRace();

    expect(race.karts.length).toBe(6);
    expect(race.hud().position).toBeGreaterThan(1);
    expect(race.karts.every((kart) => kart.lap === -1)).toBeTrue();
  });

  it('termina a corrida com o resultado da chegada em todas as pistas oficiais', () => {
    DEFAULT_TRACKS.forEach((track, index) => {
      const race = createRace(index);
      const finish = raceToFinish(race).find((event) => event.type === 'chegada');

      expect(finish).withContext(track.name).toBeDefined();

      if (finish?.type === 'chegada') {
        expect(finish.result.placement).toBeGreaterThanOrEqual(1);
        expect(finish.result.placement).toBeLessThanOrEqual(6);
        expect(finish.result.timeMs).toBeGreaterThan(10_000);
      }
    });
  });

  it('não conta volta para quem fica parado na largada', () => {
    const race = createRace();

    for (let step = 0; step < 600; step += 1) {
      race.step({ steer: 0, brake: true, useItem: false });
    }

    expect(race.player.lap).toBe(-1);
    expect(race.hud().lap).toBe(1);
  });

  it('segura no muro quem tenta sair da pista', () => {
    const race = createRace();

    for (let step = 0; step < 900; step += 1) {
      race.step({ steer: 1, brake: false, useItem: false });
      expect(Math.abs(race.player.lateral)).toBeLessThanOrEqual(TRACK_GRID.cellSize / 2);
    }
  });

  it('dá um fôlego para quem ficou para trás e segura quem disparou', () => {
    const tuning = difficultyOption('normal').tuning;

    expect(rubberBand(0, tuning)).toBe(1);
    expect(rubberBand(100, tuning)).toBeLessThan(1);
    expect(rubberBand(-100, tuning)).toBeGreaterThan(1);
  });

  it('no fácil, segura mais cedo e mais forte quem disparou na frente', () => {
    const easy = difficultyOption('facil').tuning;
    const hard = difficultyOption('dificil').tuning;

    expect(rubberBand(20, easy)).toBeLessThan(rubberBand(20, hard));
    expect(rubberBand(100, easy)).toBeLessThan(rubberBand(100, hard));
  });
});

describe('Dificuldade do Pedro Kart', () => {
  it('fica mais fácil a cada nível: adversários mais lentos e erros mais perdoados', () => {
    const [easy, normal, hard] = (['facil', 'normal', 'dificil'] as const).map(
      (id) => difficultyOption(id).tuning,
    );

    expect(easy.rivalPace).toBeLessThan(normal.rivalPace);
    expect(normal.rivalPace).toBeLessThan(hard.rivalPace);
    expect(easy.steeringAssist).toBeGreaterThan(hard.steeringAssist);
    expect(easy.grassSpeedFactor).toBeGreaterThan(hard.grassSpeedFactor);
    expect(easy.wallSpeedKeep).toBeGreaterThan(hard.wallSpeedKeep);
  });

  it('no fácil, o kart acompanha a curva sozinho e completa a corrida sem ninguém no volante', () => {
    DEFAULT_TRACKS.forEach((track, index) => {
      const race = createRace(index, 'facil');

      expect(finishOf(raceWith(race, () => IDLE_DRIVE))).withContext(track.name).not.toBeNull();
    });
  });

  it('no difícil, sem ninguém no volante, o kart não completa a volta sozinho', () => {
    const race = createRace(0, 'dificil');

    expect(finishOf(raceWith(race, () => IDLE_DRIVE))).toBeNull();
  });

  it('no fácil, quem pilota direito ganha a corrida em todas as pistas oficiais', () => {
    DEFAULT_TRACKS.forEach((track, index) => {
      const result = finishOf(raceToFinish(createRace(index, 'facil', track.laps)));

      expect(result?.placement).withContext(track.name).toBe(1);
    });
  });

  it('no fácil, os adversários não jogam casca', () => {
    const race = createRace(0, 'facil', DEFAULT_TRACKS[0].laps);
    const rivalPeelOwners = new Set<string>();

    raceWith(race, () => {
      race.peels.forEach((peel) => rivalPeelOwners.add(peel.ownerId));

      return IDLE_DRIVE;
    });
    rivalPeelOwners.delete(race.player.id);

    expect([...rivalPeelOwners]).toEqual([]);
  });
});

describe('Batida no muro', () => {
  it('tira velocidade só no momento da batida, e não enquanto o kart raspa', () => {
    const kart = new Kart('k', 'Kart', handlingFor({ speed: 3, acceleration: 3, handling: 3 }), false);
    kart.speed = 20;

    kart.bounceInside(0, 0, true);
    expect(kart.speed).toBeCloseTo(20 * STANDARD_FORGIVENESS.wallSpeedKeep, 5);

    const afterImpact = kart.speed;
    kart.bounceInside(0, 0, false);
    expect(kart.speed).toBe(afterImpact);
  });
});
