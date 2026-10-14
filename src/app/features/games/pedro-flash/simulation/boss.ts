import type { SeededRandom } from '../../pedro-maker/levels/seeded-random';
import { LANE_WIDTH } from '../course/course-geometry';
import type { BossAttackKind, BossProfile } from '../config/boss.config';
import type { FlashTuning } from './flash-tuning';

export type BossPhase = 'chegando' | 'voando' | 'cansado' | 'atingido' | 'derrotado';

/** O que o chefão decidiu fazer neste passo. */
export type BossAttack = { readonly kind: 'bomba'; readonly lateral: number } | { readonly kind: 'onda' };

/** Raio do corpo do chefão, para o golpe do Pedro encostar. */
export const BOSS_RADIUS = 2.6;

/**
 * Distância à frente do Pedro, em metros, e altura em cada momento da luta.
 *
 * Voando, ele fica longe o bastante para o Pedro ver cada bomba cair e cada
 * onda vir: quase um segundo inteiro para reagir.
 */
const POSE: Readonly<Record<BossPhase, { readonly gap: number; readonly height: number }>> = {
  chegando: { gap: 34, height: 7 },
  voando: { gap: 34, height: 6.5 },
  // Cansado, ele desce quase na frente do Pedro: um pulo simples já alcança.
  cansado: { gap: 2.4, height: 2.6 },
  atingido: { gap: 34, height: 8 },
  derrotado: { gap: 20, height: 0.5 },
};

const ARRIVAL_GAP = 80;
const ARRIVAL_SECONDS = 2.5;
const FLYING_SECONDS = 6.5;
const HIT_SECONDS = 1.2;
/** Quão depressa ele chega na pose nova; maior é mais brusco. */
const POSE_RATE = 2.4;
const SWAY_WIDTH = LANE_WIDTH;

/**
 * O chefão da arena, sem desenho nenhum.
 *
 * Voa sempre à frente do Pedro e ataca. De tempos em tempos cansa e desce
 * ao alcance de um pulo: é a hora do golpe. Se o Pedro não acertar, ele se
 * recupera e volta a atacar — ninguém perde por demorar.
 */
export class Boss {
  distance: number;
  lateral = 0;
  height = POSE.chegando.height;
  previousDistance: number;
  previousLateral = 0;
  previousHeight = POSE.chegando.height;
  hits = 0;

  private phaseState: BossPhase = 'chegando';
  private phaseSeconds = 0;
  private attackSeconds = 0;
  private gap = ARRIVAL_GAP;
  private clockSeconds = 0;
  private nextAttack = 0;

  constructor(
    readonly profile: BossProfile,
    readonly hitsNeeded: number,
    private readonly tuning: FlashTuning,
    private readonly random: SeededRandom,
    playerDistance: number,
  ) {
    this.distance = playerDistance + ARRIVAL_GAP;
    this.previousDistance = this.distance;
  }

  get phase(): BossPhase {
    return this.phaseState;
  }

  get isVulnerable(): boolean {
    return this.phaseState === 'cansado';
  }

  get isDefeated(): boolean {
    return this.phaseState === 'derrotado';
  }

  get hitsLeft(): number {
    return Math.max(0, this.hitsNeeded - this.hits);
  }

  /** Um passo da luta. Devolve o ataque, quando ele resolve atacar. */
  update(seconds: number, playerDistance: number): BossAttack | null {
    this.previousDistance = this.distance;
    this.previousLateral = this.lateral;
    this.previousHeight = this.height;
    this.clockSeconds += seconds;
    this.phaseSeconds += seconds;
    this.advancePhase();

    const pose = POSE[this.phaseState];
    const blend = 1 - Math.exp(-POSE_RATE * seconds);
    const sway = this.phaseState === 'voando' ? SWAY_WIDTH * Math.sin(this.clockSeconds * 0.8) : 0;

    this.gap += (pose.gap - this.gap) * blend;
    this.height += (pose.height - this.height) * blend;
    this.lateral += (sway - this.lateral) * blend;
    this.distance = playerDistance + this.gap;

    return this.phaseState === 'voando' ? this.tickAttack(seconds) : null;
  }

  /** Levou um golpe. Devolve verdadeiro quando foi o último. */
  takeHit(): boolean {
    if (!this.isVulnerable) {
      return false;
    }

    this.hits += 1;
    this.enter(this.hits >= this.hitsNeeded ? 'derrotado' : 'atingido');

    return this.isDefeated;
  }

  private advancePhase(): void {
    switch (this.phaseState) {
      case 'chegando':
        if (this.phaseSeconds >= ARRIVAL_SECONDS) {
          this.enter('voando');
        }

        return;
      case 'voando':
        if (this.phaseSeconds >= FLYING_SECONDS) {
          this.enter('cansado');
        }

        return;
      case 'cansado':
        if (this.phaseSeconds >= this.tuning.bossTiredSeconds) {
          this.enter('voando');
        }

        return;
      case 'atingido':
        if (this.phaseSeconds >= HIT_SECONDS) {
          this.enter('voando');
        }

        return;
      case 'derrotado':
        return;
    }
  }

  private enter(phase: BossPhase): void {
    this.phaseState = phase;
    this.phaseSeconds = 0;
    this.attackSeconds = 0;
  }

  private tickAttack(seconds: number): BossAttack | null {
    this.attackSeconds += seconds;

    if (this.attackSeconds < this.profile.attackSeconds * this.tuning.bossAttackInterval) {
      return null;
    }

    this.attackSeconds = 0;

    const kind: BossAttackKind = this.profile.attacks[this.nextAttack % this.profile.attacks.length];
    this.nextAttack += 1;

    if (kind === 'onda') {
      return { kind: 'onda' };
    }

    // A bomba cai numa das três faixas: sempre sobra caminho livre para desviar.
    return { kind: 'bomba', lateral: this.random.pick([-1, 0, 1] as const) * LANE_WIDTH };
  }
}
