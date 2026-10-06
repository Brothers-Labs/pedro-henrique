import { TILE_SIZE } from '../../config/physics.config';
import type { BossDefinition } from '../../models/level.model';
import type { MakerSoundCue } from '../../models/session.model';
import { bottom, centerX, createBody, type PhysicsBody } from './physics-body';
import type { VisualEventQueue } from './visual-events';

export interface BossHost {
  readonly effects: VisualEventQueue;
  playSound(cue: MakerSoundCue): void;
  spawnMinion(worldX: number, worldY: number): void;
  onHitPointsChanged(hitPoints: number): void;
  onDefeated(x: number): void;
}

export type BossMode = 'waiting' | 'idle' | 'windup' | 'leap' | 'charge' | 'summon' | 'tired' | 'hurt' | 'defeated';

type Attack = 'leap' | 'charge' | 'summon';

const BODY_WIDTH = 112;
const BODY_HEIGHT = 78;

const IDLE_MS = 1000;
const WINDUP_MS = 550;
const TIRED_MS = 1800;
const HURT_MS = 900;
const LEAP_VELOCITY = 880;
const CHARGE_SPEED = 400;
export const BOSS_DEFEAT_MS = 1100;

/** Ordem dos ataques: previsível de propósito, para a criança aprender o ritmo. */
const ATTACK_CYCLE: readonly Attack[] = ['leap', 'charge', 'summon', 'leap', 'charge'];

/**
 * O chefão da fase final de cada mundo.
 *
 * Três ataques em ciclo — pulo que treme o chão, investida de parede a parede
 * e chamado de ajudantes — e, depois de pular ou investir, ele cansa: os olhos
 * viram espiral e é aí que um pisão vale. Pisar nele fora dessa janela só faz
 * o Pedro quicar, sem machucar ninguém.
 */
export class Boss {
  readonly body: PhysicsBody = createBody(BODY_WIDTH, BODY_HEIGHT, true);
  hitPoints: number;
  mode: BossMode = 'waiting';
  modeStartedAt = 0;
  /** 1 olhando para a direita, -1 para a esquerda. */
  direction: 1 | -1 = -1;
  /** Terminou a animação de derrota: sai da partida e larga o baú. */
  isGone = false;

  private modeUntil = 0;
  private attackIndex = 0;
  private wasAirborne = false;

  constructor(
    readonly definition: BossDefinition,
    cellX: number,
    cellY: number,
    private readonly arenaLeft: number,
    private readonly arenaRight: number,
    private readonly host: BossHost,
  ) {
    this.hitPoints = definition.hitPoints;
    this.body.x = cellX * TILE_SIZE + TILE_SIZE / 2 - BODY_WIDTH / 2;
    this.body.y = (cellY + 1) * TILE_SIZE - BODY_HEIGHT;
    this.body.previousX = this.body.x;
    this.body.previousY = this.body.y;
  }

  get isAwake(): boolean {
    return this.mode !== 'waiting' && this.mode !== 'defeated';
  }

  get isVulnerable(): boolean {
    return this.mode === 'tired';
  }

  /** Machuca ao encostar? Cansado, atingido ou derrotado, não. */
  get isHarmful(): boolean {
    return this.isAwake && this.mode !== 'tired' && this.mode !== 'hurt';
  }

  wake(now: number): void {
    if (this.mode !== 'waiting') {
      return;
    }

    this.enter('idle', now, IDLE_MS);
    this.host.playSound('boss');
    this.host.effects.shake('forte');
  }

  step(now: number, playerX: number): void {
    if (this.mode === 'defeated') {
      this.finishDefeat(now);
      return;
    }

    if (!this.isAwake) {
      return;
    }

    this.keepInsideArena();

    switch (this.mode) {
      case 'idle':
        this.body.vx = 0;
        this.direction = playerX < centerX(this.body) ? -1 : 1;

        if (now >= this.modeUntil) {
          this.startNextAttack(now);
        }

        return;
      case 'windup':
        if (now >= this.modeUntil) {
          this.enter('charge', now, 4000);
          this.body.vx = this.direction * CHARGE_SPEED * this.definition.fury;
        }

        return;
      case 'leap':
        this.handleLeapLanding(now);
        return;
      case 'charge':
        this.handleCharge(now);
        return;
      case 'summon':
      case 'tired':
      case 'hurt':
        this.body.vx = 0;

        if (now >= this.modeUntil) {
          this.enter('idle', now, IDLE_MS / this.definition.fury);
        }

        return;
    }
  }

  /** Pisão na hora certa: perde um ponto de vida e fica um instante intocável. */
  takeHit(now: number): void {
    if (!this.isVulnerable) {
      return;
    }

    this.hitPoints -= 1;
    this.host.onHitPointsChanged(this.hitPoints);
    this.host.playSound('enemyHit');
    this.host.effects.burst('poof', centerX(this.body), this.body.y + 10, 18);
    this.host.effects.shake('forte');

    if (this.hitPoints <= 0) {
      this.enter('defeated', now, BOSS_DEFEAT_MS);
      this.body.vx = 0;
      this.body.hasGravity = false;
      this.body.vy = 0;
      this.host.effects.burst('confetti', centerX(this.body), this.body.y, 60);
      return;
    }

    this.enter('hurt', now, HURT_MS);
  }

  private finishDefeat(now: number): void {
    if (!this.isGone && now >= this.modeUntil) {
      this.isGone = true;
      this.host.onDefeated(centerX(this.body));
    }
  }

  private startNextAttack(now: number): void {
    const attack = ATTACK_CYCLE[this.attackIndex % ATTACK_CYCLE.length];

    this.attackIndex += 1;

    switch (attack) {
      case 'leap':
        this.enter('leap', now, 3000);
        this.wasAirborne = false;
        this.body.vy = -LEAP_VELOCITY * Math.sqrt(this.definition.fury);
        this.body.vx = this.direction * 240 * this.definition.fury;
        return;
      case 'charge':
        this.enter('windup', now, WINDUP_MS);
        return;
      case 'summon':
        this.enter('summon', now, 900);
        this.host.playSound('boss');
        this.host.spawnMinion(centerX(this.body) - 90, this.body.y + 20);
        this.host.spawnMinion(centerX(this.body) + 90, this.body.y + 20);
        return;
    }
  }

  private handleLeapLanding(now: number): void {
    if (!this.body.blockedDown) {
      this.wasAirborne = true;
      return;
    }

    if (this.wasAirborne || now >= this.modeUntil) {
      this.body.vx = 0;
      this.becomeTired(now);
    }
  }

  private handleCharge(now: number): void {
    const x = centerX(this.body);
    const hitWall =
      (this.direction < 0 && (this.body.blockedLeft || x <= this.arenaLeft + BODY_WIDTH / 2)) ||
      (this.direction > 0 && (this.body.blockedRight || x >= this.arenaRight - BODY_WIDTH / 2));

    if (hitWall || now >= this.modeUntil) {
      this.body.vx = 0;
      this.becomeTired(now);
    }
  }

  private becomeTired(now: number): void {
    this.enter('tired', now, TIRED_MS);
    this.host.playSound('boss');
    this.host.effects.shake('forte');
    this.host.effects.burst('dust', centerX(this.body), bottom(this.body), 16);
  }

  private keepInsideArena(): void {
    const minimum = this.arenaLeft;
    const maximum = this.arenaRight - BODY_WIDTH;

    if (this.body.x < minimum) {
      this.body.x = minimum;
      this.body.vx = Math.max(0, this.body.vx);
    } else if (this.body.x > maximum) {
      this.body.x = maximum;
      this.body.vx = Math.min(0, this.body.vx);
    }
  }

  private enter(mode: BossMode, now: number, durationMs: number): void {
    this.mode = mode;
    this.modeStartedAt = now;
    this.modeUntil = now + durationMs;
  }
}
