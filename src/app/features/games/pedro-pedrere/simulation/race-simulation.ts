import { SeededRandom } from '../../pedro-maker/levels/seeded-random';
import type { HeroLook } from '../config/hero-look.config';
import { PHYSICS } from '../config/physics.config';
import { type LevelLayout, layoutLevel } from '../levels/level-layout';
import type { RaceTrack } from '../levels/race-track';
import type { ControlState } from '../models/controls.model';
import type { GameEvent, RaceResult } from '../models/scene.model';
import { HeroMotion } from './hero-motion';

export type RaceStatus = 'contagem' | 'correndo' | 'terminou';

export interface RivalProfile {
  readonly name: string;
  readonly look: HeroLook;
  /** Velocidade de corrida em blocos por segundo; o Pedro corre a 7. */
  readonly speed: number;
  /** Chance de tropeçar em cada obstáculo. */
  readonly stumbleChance: number;
}

/**
 * Os três rivais, do mais rápido para o mais tranquilo.
 *
 * Nenhum corre tão rápido quanto o Pedro: quem pula todos os obstáculos
 * ganha. Bater num tijolo custa o tempo de parar e pular de novo, e é aí que
 * eles passam.
 */
export const RIVALS: readonly RivalProfile[] = [
  { name: 'Lia', look: { shirt: 'roxo', pants: 'preta', hat: 'coroa' }, speed: 6.8, stumbleChance: 0.2 },
  { name: 'Tito', look: { shirt: 'verde', pants: 'marrom', hat: 'capacete' }, speed: 6.3, stumbleChance: 0.25 },
  { name: 'Nina', look: { shirt: 'amarelo', pants: 'cinza', hat: 'cartola' }, speed: 5.8, stumbleChance: 0.3 },
];

export const COUNTDOWN_SECONDS = 3;
/**
 * Os rivais largam enfileirados atrás do Pedro, um bloco de distância entre
 * cada um: todos aparecem na tela desde a largada, e a vantagem do Pedro é
 * de menos de meio segundo.
 */
const RIVAL_START_GAP = 0.9;
export const STUMBLE_SECONDS = 0.7;
/** Distância antes e depois do obstáculo em que o rival está no ar. */
const RIVAL_JUMP_REACH = 1.1;
const RIVAL_JUMP_HEIGHT = 2.6;

export class RivalRunner {
  x: number;
  /** Altura do pulo, em blocos acima do chão; só serve para o desenho. */
  lift = 0;
  stumbleLeft = 0;
  finishedAtSeconds: number | null = null;

  private nextHurdleIndex = 0;

  constructor(
    readonly profile: RivalProfile,
    startX: number,
  ) {
    this.x = startX;
  }

  step(track: RaceTrack, random: SeededRandom, elapsedSeconds: number, seconds: number): void {
    if (this.finishedAtSeconds !== null) {
      return;
    }

    if (this.stumbleLeft > 0) {
      this.stumbleLeft = Math.max(0, this.stumbleLeft - seconds);
      this.lift = 0;

      return;
    }

    const hurdle = track.hurdles[this.nextHurdleIndex];

    if (hurdle && this.x + PHYSICS.heroWidth >= hurdle.column - RIVAL_JUMP_REACH) {
      this.nextHurdleIndex += 1;

      if (random.chance(this.profile.stumbleChance)) {
        this.stumbleLeft = STUMBLE_SECONDS;

        return;
      }
    }

    this.x += this.profile.speed * seconds;
    this.lift = this.liftOver(track);

    if (this.x + PHYSICS.heroWidth >= track.finishColumn) {
      this.finishedAtSeconds = elapsedSeconds;
    }
  }

  /** Arco do pulo por cima do obstáculo mais próximo, para o rival não atravessar o tijolo no desenho. */
  private liftOver(track: RaceTrack): number {
    const center = this.x + PHYSICS.heroWidth / 2;
    const nearest = track.hurdles.find((hurdle) => Math.abs(hurdle.column + 0.5 - center) < RIVAL_JUMP_REACH + 0.5);

    if (!nearest) {
      return 0;
    }

    const progress = 1 - Math.abs(nearest.column + 0.5 - center) / (RIVAL_JUMP_REACH + 0.5);

    return Math.sin((progress * Math.PI) / 2) * RIVAL_JUMP_HEIGHT;
  }
}

/**
 * A corrida: o Pedro corre sozinho para a frente e só precisa pular.
 *
 * Os rivais não usam física; andam no ritmo deles e às vezes tropeçam. É
 * mais simples e mais previsível que simular quatro corredores de verdade, e
 * para a criança a diferença não aparece.
 */
export class RaceSimulation {
  readonly layout: LevelLayout;
  readonly hero: HeroMotion;
  readonly rivals: readonly RivalRunner[];

  status: RaceStatus = 'contagem';
  countdownLeft = COUNTDOWN_SECONDS;
  elapsedSeconds = 0;

  private readonly random: SeededRandom;
  private finalPlacement: number | null = null;

  constructor(
    readonly track: RaceTrack,
    seed: number,
  ) {
    this.layout = layoutLevel(track.level);
    this.random = new SeededRandom(seed);

    const startX = this.layout.start.column + (1 - PHYSICS.heroWidth) / 2;
    const startY = this.layout.start.row + 1 - PHYSICS.heroHeight;

    this.hero = new HeroMotion(startX, startY);
    this.rivals = RIVALS.map((profile, index) => new RivalRunner(profile, startX - (index + 1) * RIVAL_START_GAP));
  }

  /** O número da contagem regressiva (3, 2, 1), ou `null` depois da largada. */
  countdownValue(): number | null {
    return this.status === 'contagem' ? Math.ceil(this.countdownLeft) : null;
  }

  /** Posição do Pedro agora: um mais quantos estão na frente dele. */
  currentPlacement(): number {
    if (this.finalPlacement !== null) {
      return this.finalPlacement;
    }

    return 1 + this.rivals.filter((rival) => rival.finishedAtSeconds !== null || rival.x > this.hero.body.x).length;
  }

  step(controls: ControlState): readonly GameEvent[] {
    const seconds = PHYSICS.stepSeconds;

    if (this.status === 'terminou') {
      // Os rivais terminam a corrida deles mesmo depois que o Pedro chega.
      this.stepRivals(seconds);

      return [];
    }

    if (this.status === 'contagem') {
      return this.stepCountdown(seconds);
    }

    const events: GameEvent[] = [];

    this.elapsedSeconds += seconds;

    const motion = this.hero.step({ direction: 1, isJumpHeld: controls.jump }, this.layout.terrainAt, seconds);

    if (motion.didJump) {
      events.push('jump');
    }

    this.stepRivals(seconds);

    if (this.hero.body.x + this.hero.body.width >= this.track.finishColumn) {
      this.finalPlacement = 1 + this.rivals.filter((rival) => rival.finishedAtSeconds !== null).length;
      this.status = 'terminou';
      events.push('finish');
    }

    return events;
  }

  result(): RaceResult | null {
    if (this.finalPlacement === null) {
      return null;
    }

    return {
      mode: 'corrida',
      placement: this.finalPlacement,
      runners: this.rivals.length + 1,
      timeMs: Math.round(this.elapsedSeconds * 1000),
    };
  }

  private stepCountdown(seconds: number): readonly GameEvent[] {
    const before = Math.ceil(this.countdownLeft);

    this.countdownLeft = Math.max(0, this.countdownLeft - seconds);

    if (this.countdownLeft === 0) {
      this.status = 'correndo';

      return ['start'];
    }

    return Math.ceil(this.countdownLeft) < before ? ['countdown'] : [];
  }

  private stepRivals(seconds: number): void {
    for (const rival of this.rivals) {
      rival.step(this.track, this.random, this.elapsedSeconds, seconds);
    }
  }
}
