import { PHYSICS } from '../config/physics.config';
import { LevelSketch } from '../levels/level-sketch';
import { createRaceTrack } from '../levels/race-track';
import { type ControlState, createControlState } from '../models/controls.model';
import { type PedrereLevel, TILE } from '../models/level.model';
import type { GameEvent } from '../models/scene.model';
import { AdventureSimulation, adventureStars } from './adventure-simulation';
import { BounceSimulation } from './bounce-simulation';
import { COUNTDOWN_SECONDS, RaceSimulation } from './race-simulation';

interface Steppable {
  step(controls: ControlState): readonly GameEvent[];
}

/** Roda a simulação por alguns segundos e devolve tudo o que aconteceu. */
function run(
  simulation: Steppable,
  seconds: number,
  controls: Partial<ControlState> | ((controls: ControlState) => void) = {},
): GameEvent[] {
  const state = createControlState();
  const events: GameEvent[] = [];

  if (typeof controls === 'object') {
    Object.assign(state, controls);
  }

  for (let step = 0; step < Math.round(seconds / PHYSICS.stepSeconds); step += 1) {
    if (typeof controls === 'function') {
      controls(state);
    }

    events.push(...simulation.step(state));
  }

  return events;
}

function levelFrom(sketch: LevelSketch): PedrereLevel {
  return { id: 'teste', name: 'Teste', theme: 'campo', rows: sketch.toRows() };
}

function flatLevel(): LevelSketch {
  return new LevelSketch(30).ground(0, 29).put(1, 11, TILE.start).put(28, 11, TILE.goal);
}

describe('Aventura do Pedro Pedrerê', () => {
  it('o Pedro pousa no chão e fica parado', () => {
    const simulation = new AdventureSimulation(levelFrom(flatLevel()));

    run(simulation, 0.5);

    expect(simulation.hero.isGrounded).toBeTrue();
    expect(simulation.hero.body.y + PHYSICS.heroHeight).toBeCloseTo(12, 5);
    expect(simulation.status).toBe('jogando');
  });

  it('o pulo sobe quase três blocos', () => {
    const simulation = new AdventureSimulation(levelFrom(flatLevel()));

    run(simulation, 0.3);

    const groundY = simulation.hero.body.y;
    let highest = groundY;
    const events = run(simulation, 1, (controls) => {
      controls.jump = true;
      highest = Math.min(highest, simulation.hero.body.y);
    });

    expect(events).toContain('jump');
    expect(groundY - highest).toBeGreaterThan(2.5);
    expect(groundY - highest).toBeLessThan(3.1);
  });

  it('pega a moeda, chega na bandeira e ganha as três estrelas', () => {
    const simulation = new AdventureSimulation(levelFrom(flatLevel().put(5, 11, TILE.coin)));
    const events = run(simulation, 5, { right: true });

    expect(events).toContain('coin');
    expect(events).toContain('finish');
    expect(simulation.result()).toEqual({ mode: 'aventura', isVictory: true, coins: 1, totalCoins: 1, stars: 3 });
  });

  it('pisar na pedrinha amassa ela sem machucar o Pedro', () => {
    const sketch = new LevelSketch(30)
      .ground(0, 29)
      .put(5, 11, TILE.brick)
      .put(7, 11, TILE.brick)
      .put(6, 11, TILE.pebble)
      .put(6, 5, TILE.start)
      .put(28, 11, TILE.goal);
    const simulation = new AdventureSimulation(levelFrom(sketch));
    const events = run(simulation, 1);

    expect(events).toContain('stomp');
    expect(simulation.pebbles[0].isActive).toBeFalse();
    expect(simulation.hearts).toBe(PHYSICS.heroHearts);
  });

  it('encostar de lado na pedrinha custa uma vida', () => {
    const simulation = new AdventureSimulation(levelFrom(flatLevel().put(8, 11, TILE.pebble)));
    const events = run(simulation, 3.5);

    expect(events).toContain('hurt');
    expect(simulation.hearts).toBe(PHYSICS.heroHearts - 1);
  });

  it('o espinho machuca', () => {
    const simulation = new AdventureSimulation(levelFrom(flatLevel().put(4, 11, TILE.spike)));
    const events = run(simulation, 1, { right: true });

    expect(events).toContain('hurt');
  });

  it('cair no buraco custa uma vida e volta para o último marco', () => {
    const sketch = new LevelSketch(30)
      .ground(0, 9)
      .ground(16, 29)
      .put(1, 11, TILE.start)
      .put(5, 11, TILE.checkpoint)
      .put(28, 11, TILE.goal);
    const simulation = new AdventureSimulation(levelFrom(sketch));
    const events = [...run(simulation, 1.8, { right: true }), ...run(simulation, 1.5)];

    expect(events).toContain('checkpoint');
    expect(events).toContain('fall');
    expect(simulation.hearts).toBe(PHYSICS.heroHearts - 1);
    expect(simulation.hero.body.x).toBeGreaterThan(5);
    expect(simulation.hero.body.x).toBeLessThan(7);
  });

  it('sem vidas, a partida acaba sem estrelas', () => {
    const sketch = new LevelSketch(30).ground(0, 9).ground(16, 29).put(1, 11, TILE.start).put(28, 11, TILE.goal);
    const simulation = new AdventureSimulation(levelFrom(sketch));

    run(simulation, 10, { right: true });

    expect(simulation.status).toBe('perdeu');
    expect(simulation.result()).toEqual(jasmine.objectContaining({ isVictory: false, stars: 0 }));
    expect(run(simulation, 1, { right: true })).toEqual([]);
  });

  it('o pula-pula joga o Pedro para o alto', () => {
    const simulation = new AdventureSimulation(levelFrom(flatLevel().put(3, 12, TILE.trampoline)));
    const events = run(simulation, 0.6, { right: true });

    expect(events).toContain('bounce');
  });

  it('dá uma estrela por chegar, outra por metade das moedas e a terceira por todas', () => {
    expect(adventureStars(0, 10)).toBe(1);
    expect(adventureStars(5, 10)).toBe(2);
    expect(adventureStars(10, 10)).toBe(3);
    expect(adventureStars(0, 0)).toBe(3);
  });
});

describe('Corrida do Pedro Pedrerê', () => {
  it('ninguém sai do lugar antes do "já"', () => {
    const simulation = new RaceSimulation(createRaceTrack(7), 7);
    const startX = simulation.hero.body.x;
    const events = run(simulation, COUNTDOWN_SECONDS - 0.5, { jump: true });

    expect(simulation.status).toBe('contagem');
    expect(simulation.countdownValue()).toBe(1);
    expect(simulation.hero.body.x).toBe(startX);
    expect(events).toContain('countdown');
    expect(run(simulation, 0.6)).toContain('start');
    expect(simulation.status).toBe('correndo');
  });

  it('quem pula todos os tijolos ganha a corrida', () => {
    const simulation = new RaceSimulation(createRaceTrack(11), 11);
    const { hero, track } = simulation;

    run(simulation, 40, (controls) => {
      const body = hero.body;
      const next = track.hurdles.find((hurdle) => hurdle.column + 1 > body.x);
      const distance = next ? next.column - (body.x + body.width) : Infinity;

      controls.jump = distance < 1.6;
    });

    expect(simulation.result()).toEqual(jasmine.objectContaining({ mode: 'corrida', placement: 1, runners: 4 }));
  });

  it('quem não pula fica parado no primeiro tijolo e os rivais passam', () => {
    const simulation = new RaceSimulation(createRaceTrack(3), 3);

    run(simulation, 12);

    expect(simulation.hero.body.x).toBeLessThan(simulation.track.hurdles[0].column);
    expect(simulation.currentPlacement()).toBe(4);
    expect(simulation.result()).toBeNull();
  });
});

describe('Pula-pula do Pedro Pedrerê', () => {
  it('quica sozinho no chão do começo', () => {
    const simulation = new BounceSimulation(5);
    const events = run(simulation, 0.2);

    expect(events).toContain('bounce');
    expect(simulation.hero.vy).toBeLessThan(0);
  });

  it('sai por um lado e entra pelo outro', () => {
    const simulation = new BounceSimulation(5);

    simulation.hero.x = 0.1;
    run(simulation, 0.4, { left: true });

    expect(simulation.hero.x).toBeGreaterThan(5);
  });

  it('a distância entre duas camas nunca passa do pulo normal', () => {
    const simulation = new BounceSimulation(9);

    simulation.hero.y = -500;
    simulation.hero.vy = -5;
    run(simulation, PHYSICS.stepSeconds);

    const heights = simulation.pads.map((pad) => pad.y).sort((first, second) => second - first);

    expect(heights.length).toBeGreaterThan(5);

    for (let index = 1; index < heights.length; index += 1) {
      expect(heights[index - 1] - heights[index]).toBeLessThanOrEqual(3);
    }
  });

  it('cair abaixo da tela termina a partida com a altura alcançada', () => {
    const simulation = new BounceSimulation(5);

    simulation.hero.y = -40;
    simulation.hero.vy = 0;
    run(simulation, PHYSICS.stepSeconds);
    simulation.hero.y = simulation.cameraTop + 30;

    const events = run(simulation, PHYSICS.stepSeconds);

    expect(events).toContain('fall');
    expect(simulation.result()).toEqual({ mode: 'pula-pula', heightMeters: 39 });
    expect(run(simulation, 0.5)).toEqual([]);
  });
});
