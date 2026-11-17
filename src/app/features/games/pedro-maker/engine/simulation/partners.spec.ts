import { TILE_SIZE } from '../../config/physics.config';
import { DIFFICULTY_RULES } from '../../config/rules.config';
import { LevelBuilder } from '../../levels/level-builder';
import type { LevelBlueprint } from '../../models/level.model';
import type { HeroId } from '../../models/progress.model';
import type { GameSessionEvent, HudState } from '../../models/session.model';
import { IDLE_INPUT, type InputSnapshot } from '../input/input-snapshot';
import { GameSimulation, MAX_PARTNERS, PARTNER_LEASH, STEP_MS } from './game-simulation';
import { bottom, centerX } from './physics-body';

const META = { id: 'teste-turma', name: 'Teste da turma', theme: 'vale', targetTimeSeconds: 60 } as const;
const SURFACE = 12;
const START_COLUMN = 3;

interface Harness {
  readonly simulation: GameSimulation;
  readonly events: GameSessionEvent[];
}

function flatLevel(width = 40): LevelBuilder {
  return new LevelBuilder(width, 15)
    .ground(0, width - 1, SURFACE)
    .add('start', START_COLUMN, SURFACE - 1)
    .add('portal', width - 3, SURFACE - 1);
}

function start(blueprint: LevelBlueprint, partners: readonly HeroId[] = ['gui']): Harness {
  const events: GameSessionEvent[] = [];
  const simulation = new GameSimulation({
    blueprint,
    hero: 'pedro',
    rules: DIFFICULTY_RULES.aventura,
    isTouch: false,
    listener: (event) => events.push(event),
    partners,
  });

  simulation.announceReady();

  return { simulation, events };
}

/** Um passo com o Jogador 1 parado e o Jogador 2 fazendo `partner`. */
function stepPartner(harness: Harness, partner: Partial<InputSnapshot>): void {
  harness.simulation.step(IDLE_INPUT, [{ ...IDLE_INPUT, ...partner }]);
}

function runPartner(harness: Harness, seconds: number, partner: Partial<InputSnapshot> = {}): void {
  const steps = Math.round((seconds * 1000) / STEP_MS);

  for (let step = 0; step < steps; step += 1) {
    stepPartner(harness, partner);
  }
}

function lastHud(events: readonly GameSessionEvent[]): HudState | undefined {
  const huds = events.filter((event): event is Extract<GameSessionEvent, { type: 'hud' }> => event.type === 'hud');

  return huds[huds.length - 1]?.hud;
}

/** O amigo está colado no Jogador 1, como fica logo depois de voltar para perto dele. */
function isBesideLeader(harness: Harness, partnerIndex = 0): boolean {
  const leader = harness.simulation.player.body;
  const partner = harness.simulation.partners[partnerIndex].body;

  return Math.abs(centerX(partner) - centerX(leader)) < 1 && Math.abs(bottom(partner) - bottom(leader)) < 1;
}

describe('Pedro Maker em turma: os amigos do Jogador 1', () => {
  it('sem amigos, a partida é a de sempre, de uma criança só', () => {
    const events: GameSessionEvent[] = [];
    const simulation = new GameSimulation({
      blueprint: flatLevel().build(META),
      hero: 'pedro',
      rules: DIFFICULTY_RULES.aventura,
      isTouch: false,
      listener: (event) => events.push(event),
    });

    simulation.step(IDLE_INPUT);

    expect(simulation.partners).toEqual([]);
  });

  it('entra com no máximo dois amigos, o Jogador 2 e o Jogador 3, enfileirados atrás do Jogador 1', () => {
    const { simulation } = start(flatLevel().build(META), ['gui', 'tina', 'mario']);
    const leaderX = centerX(simulation.player.body);

    expect(simulation.partners.length).toBe(MAX_PARTNERS);

    const [second, third] = simulation.partners;

    expect(centerX(second.body)).toBeLessThan(leaderX);
    expect(centerX(third.body)).toBeLessThan(centerX(second.body));
    expect(bottom(second.body)).toBe(bottom(simulation.player.body));
  });

  it('cada amigo anda com a própria entrada, e o Jogador 1 fica onde está', () => {
    const harness = start(flatLevel().build(META));
    const leaderX = centerX(harness.simulation.player.body);
    const partnerX = centerX(harness.simulation.partners[0].body);

    runPartner(harness, 0.6, { right: true });

    expect(centerX(harness.simulation.partners[0].body)).toBeGreaterThan(partnerX + TILE_SIZE);
    expect(centerX(harness.simulation.player.body)).toBeCloseTo(leaderX, 5);
  });

  it('o amigo pega moedas para a turma, mas deixa o cogumelo para o Jogador 1', () => {
    const harness = start(flatLevel().add('coin', START_COLUMN + 3, SURFACE - 1).add('power-up', START_COLUMN + 5, SURFACE - 1, { powerUp: 'mushroom' }).build(META));
    const items = harness.simulation.collectibles.items;

    runPartner(harness, 1.4, { right: true });

    expect(lastHud(harness.events)?.coins).toBe(1);
    expect(items.some((item) => item.kind === 'coin')).toBeFalse();
    expect(items.some((item) => item.kind === 'power-up')).withContext('o cogumelo continua lá').toBeTrue();
    expect(harness.simulation.player.isBig).toBeFalse();
  });

  it('pisar num inimigo derruba ele e faz o amigo quicar, sem tirar coração da turma', () => {
    const harness = start(flatLevel().add('slime', START_COLUMN + 4, SURFACE - 1).build(META));
    const slime = harness.simulation.enemies[0];
    const partner = harness.simulation.partners[0];
    const hearts = lastHud(harness.events)?.hearts;

    partner.placeFeetAt(centerX(slime.body), slime.body.y - TILE_SIZE * 2);

    for (let step = 0; step < 60 && !slime.isDefeated; step += 1) {
      stepPartner(harness, {});
    }

    expect(slime.isDefeated).toBeTrue();
    expect(partner.body.vy).withContext('o amigo quica para cima').toBeLessThan(0);
    expect(lastHud(harness.events)?.hearts).toBe(hearts);
  });

  it('esbarrar de lado num inimigo leva o amigo de volta para perto do Jogador 1, sem perder coração', () => {
    const harness = start(flatLevel().add('slime', START_COLUMN + 4, SURFACE - 1).build(META));
    const hearts = lastHud(harness.events)?.hearts;
    const leaderX = centerX(harness.simulation.player.body);
    let walkedPast = false;
    let cameBack = false;

    // O amigo começa atrás do Jogador 1 e passa por ele: só vale a volta depois de ir na frente.
    for (let step = 0; step < 120 && !cameBack; step += 1) {
      stepPartner(harness, { right: true });
      walkedPast ||= centerX(harness.simulation.partners[0].body) > leaderX + TILE_SIZE;
      cameBack = walkedPast && isBesideLeader(harness);
    }

    expect(cameBack).toBeTrue();
    expect(harness.simulation.enemies[0].isDefeated).toBeFalse();
    expect(lastHud(harness.events)?.hearts).toBe(hearts);
    expect(harness.events.some((event) => event.type === 'damage')).toBeFalse();
    expect(harness.simulation.partners[0].isInvincible(harness.simulation.clockMs)).withContext('volta piscando').toBeTrue();
  });

  it('o amigo que cai num buraco volta para perto do Jogador 1', () => {
    const harness = start(flatLevel().clearColumns(START_COLUMN + 2, START_COLUMN + 4).build(META));
    const hearts = lastHud(harness.events)?.hearts;
    let fell = false;
    let cameBack = false;

    for (let step = 0; step < 240 && !cameBack; step += 1) {
      stepPartner(harness, { right: true });
      fell ||= bottom(harness.simulation.partners[0].body) > (SURFACE + 1) * TILE_SIZE;
      cameBack = fell && isBesideLeader(harness);
    }

    expect(fell).toBeTrue();
    expect(cameBack).toBeTrue();
    expect(lastHud(harness.events)?.hearts).toBe(hearts);
  });

  it('o amigo que se afasta demais do Jogador 1 volta para perto dele num estalo', () => {
    const harness = start(flatLevel().build(META));
    const leader = harness.simulation.player.body;

    harness.simulation.partners[0].placeFeetAt(centerX(leader) + PARTNER_LEASH.x + TILE_SIZE, bottom(leader));
    stepPartner(harness, {});

    expect(isBesideLeader(harness)).toBeTrue();
    expect(harness.simulation.effects.drain().some((effect) => effect.type === 'burst' && effect.kind === 'poof')).toBeTrue();
  });

  it('o Start do controle de um amigo pausa a turma toda', () => {
    const harness = start(flatLevel().build(META));

    stepPartner(harness, { pausePressed: true });

    expect(harness.events.some((event) => event.type === 'pause-requested')).toBeTrue();
  });

  it('voltar ao checkpoint junta a turma de novo no lugar do Jogador 1', () => {
    const harness = start(flatLevel().build(META));

    runPartner(harness, 0.8, { right: true });
    harness.simulation.retryFromCheckpoint();

    const leader = harness.simulation.player.body;
    const partner = harness.simulation.partners[0].body;

    expect(Math.abs(centerX(partner) - centerX(leader))).toBeLessThan(TILE_SIZE);
    expect(bottom(partner)).toBe(bottom(leader));
  });
});
