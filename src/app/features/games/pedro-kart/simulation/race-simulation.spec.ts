import { SeededRandom } from '../../pedro-maker/levels/seeded-random';
import { TRACK_GRID } from '../models/track.model';
import { DEFAULT_TRACKS } from '../tracks/default-tracks';
import { buildCircuit, locate, pointAt, SAMPLES_PER_CELL, signedGap } from './circuit';
import { IDLE_DRIVE } from './kart';
import { COUNTDOWN_MS, RACE_STEP_MS, RaceSimulation, rubberBand, type RaceEvent } from './race-simulation';
import { RivalDriver } from './rival-driver';

const PARK = DEFAULT_TRACKS[0];
const TEN_MINUTES_IN_STEPS = (10 * 60 * 1000) / RACE_STEP_MS;

function createRace(trackIndex = 0): RaceSimulation {
  return new RaceSimulation({
    track: { ...DEFAULT_TRACKS[trackIndex], laps: 1 },
    playerSetup: { body: 'classico', color: 'azul' },
    playerName: 'Pedro',
    rivalPace: 0.9,
    seed: 42,
  });
}

/** Corre até a chegada do Pedro, pilotado pelo mesmo piloto automático dos adversários. */
function raceToFinish(race: RaceSimulation): RaceEvent[] {
  const pilot = new RivalDriver(race.circuit, 0, new SeededRandom(7));
  const events: RaceEvent[] = [];

  for (let step = 0; step < TEN_MINUTES_IN_STEPS && race.phase !== 'terminou'; step += 1) {
    race.step(pilot.decide(race.player, race.karts));
    events.push(...race.drainEvents());
  }

  return events;
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
    expect(rubberBand(0)).toBe(1);
    expect(rubberBand(100)).toBeLessThan(1);
    expect(rubberBand(-100)).toBeGreaterThan(1);
  });
});
