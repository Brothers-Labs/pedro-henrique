import type { HeroAbilities } from '../../config/hero.config';
import {
  CAT_SUIT_PHYSICS,
  GIGA_PHYSICS,
  LEAF_SUIT_PHYSICS,
  PLAYER_PHYSICS,
  POWER_UP_DURATION_MS,
  RACCOON_SUIT_PHYSICS,
  SLIDE_PHYSICS,
  SWIM_PHYSICS,
} from '../../config/physics.config';
import type { PowerUpKind } from '../../models/level.model';
import type { MakerSoundCue } from '../../models/session.model';
import type { InputSnapshot } from '../input/input-snapshot';
import type { BallElement } from './fireballs';
import { bottom, centerX, createBody, type PhysicsBody, placeFeet, type WorldArea } from './physics-body';
import { rampSurfaceY, type SlideRamp } from './slides';
import type { VisualEventQueue } from './visual-events';

export type PlayerMode = 'IDLE' | 'RUN' | 'JUMP' | 'FALL' | 'SLIDE' | 'HIT' | 'DEAD' | 'WIN';

/** O que o jogador precisa da partida, sem conhecer a partida inteira. */
export interface PlayerHost {
  readonly effects: VisualEventQueue;
  playSound(cue: MakerSoundCue): void;
  onPowerUpEnded(kind: PowerUpKind): void;
  /** Cabe um corpo nesta área sem ficar preso no cenário? */
  hasRoomFor(area: WorldArea): boolean;
}

/** O que há em volta do Pedro neste passo, medido pela partida. */
export interface PlayerSurroundings {
  readonly isOnIce: boolean;
  readonly isInWater: boolean;
  /** Dentro da água, mas com a cabeça para fora: a braçada vira salto. */
  readonly isAtWaterSurface: boolean;
}

/** Poderes que duram até proteger de um toque, em vez de acabar com o tempo. */
const PROTECTIVE_POWER_UPS: ReadonlySet<PowerUpKind> = new Set<PowerUpKind>([
  'shield',
  'mushroom',
  'fire-flower',
  'ice-flower',
  'cat-mushroom',
  'leaf-mushroom',
  'raccoon-leaf',
]);

/**
 * Trajes: fazem o herói crescer e dão um jeito próprio de se mexer ou atacar.
 * Só se veste um de cada vez — pegar outro troca o de antes.
 */
export const SUIT_POWER_UPS = [
  'fire-flower',
  'ice-flower',
  'cat-mushroom',
  'leaf-mushroom',
  'raccoon-leaf',
] as const satisfies readonly PowerUpKind[];

const SUIT_SET: ReadonlySet<PowerUpKind> = new Set<PowerUpKind>(SUIT_POWER_UPS);

/** Cada flor lança o seu elemento; pegar uma troca a outra. */
const FLOWER_ELEMENTS = [
  ['fire-flower', 'fire'],
  ['ice-flower', 'ice'],
] as const satisfies readonly (readonly [PowerUpKind, BallElement])[];

/** Descida em andamento num escorregador. */
interface SlideRide {
  readonly ramp: SlideRamp;
  speed: number;
}

/** Viagem até o centro do portal, desenhada pela tela a partir destes pontos. */
export interface Celebration {
  readonly startedAt: number;
  readonly fromX: number;
  readonly fromY: number;
  readonly toX: number;
  readonly toY: number;
}

/** Duração do "ai!" depois de um toque. */
const HIT_POSE_MS = 320;

/** Velocidade de queda a partir da qual o pouso levanta poeira. */
const DUST_LANDING_SPEED = 420;

/** Correndo, uma nuvenzinha de poeira a cada tantos milissegundos. */
const RUN_DUST_INTERVAL_MS = 220;
const RUN_DUST_SPEED = 200;

/**
 * O Pedro em movimento.
 *
 * Aqui mora a sensação do controle: aceleração e freio suaves, gelo
 * escorregadio, pulo que perdoa o botão apertado um pouquinho cedo ou tarde,
 * pulo curto ao soltar o botão, pulo duplo com a Asa, escalada e pulo de
 * parede com o Cogumelo Gato, voo planado com o Cogumelo Folha, voo curto e
 * giro de rabo com a Folha do Guaxinim, o corpo gigante do Giga Cogumelo,
 * braçadas na água, a descida no escorregador e a piscada de invencibilidade
 * depois de um toque.
 *
 * Todo tempo aqui é o relógio da partida, e não o do navegador — assim a pausa
 * não consome power-up nem invencibilidade.
 *
 * Cada herói ajusta pulo e freio pelas próprias habilidades; a caixa de
 * colisão é a mesma para todos, e por isso toda fase serve para qualquer um.
 * Só o Giga Cogumelo a aumenta, e por pouco tempo.
 */
export class Player {
  readonly body: PhysicsBody = createBody(PLAYER_PHYSICS.bodyWidth, PLAYER_PHYSICS.bodyHeight, true, PLAYER_PHYSICS.maxFallSpeed);

  mode: PlayerMode = 'IDLE';
  /** 1 olhando para a direita, -1 para a esquerda. */
  facing: 1 | -1 = 1;
  isInWater = false;
  celebration: Celebration | null = null;

  private readonly timedPowerUps = new Map<PowerUpKind, number>();
  private readonly protections = new Set<PowerUpKind>();
  private lastGroundedAt = Number.NEGATIVE_INFINITY;
  private lastJumpPressedAt = Number.NEGATIVE_INFINITY;
  private isJumpCut = true;
  private hasUsedDoubleJump = false;
  private invincibleUntil = 0;
  private hitPoseUntil = 0;
  private wasGrounded = false;
  private previousFallSpeed = 0;
  private lastRunDustAt = 0;
  private slideRide: SlideRide | null = null;
  private climbTimeLeftMs: number = CAT_SUIT_PHYSICS.climbMs;
  private climbing = false;
  private gliding = false;
  private flightTimeLeftMs: number = RACCOON_SUIT_PHYSICS.flightMs;
  private flying = false;
  private tailSpinStartedAt = Number.NEGATIVE_INFINITY;

  constructor(
    feetX: number,
    feetY: number,
    private readonly host: PlayerHost,
    private readonly abilities: HeroAbilities,
  ) {
    placeFeet(this.body, feetX, feetY);
  }

  get isGrounded(): boolean {
    return this.body.blockedDown;
  }

  get isActive(): boolean {
    return this.mode !== 'DEAD' && this.mode !== 'WIN';
  }

  get hasShield(): boolean {
    return this.protections.has('shield');
  }

  /** Com o Super Cogumelo (ou uma flor, que também faz crescer) o Pedro fica grande. */
  get isBig(): boolean {
    return this.protections.has('mushroom');
  }

  get isSliding(): boolean {
    return this.slideRide !== null;
  }

  /** Subindo uma parede com o Cogumelo Gato. */
  get isClimbing(): boolean {
    return this.climbing;
  }

  /** Planando com o Cogumelo Folha. */
  get isGliding(): boolean {
    return this.gliding;
  }

  /** Subindo no ar com a Folha do Guaxinim. */
  get isFlying(): boolean {
    return this.flying;
  }

  /** Com o corpo dobrado do Giga Cogumelo. */
  get isGiant(): boolean {
    return this.body.height > PLAYER_PHYSICS.bodyHeight;
  }

  /** Super Estrela ou Giga Cogumelo: encostar derruba o inimigo, e nada machuca. */
  get defeatsEnemiesOnTouch(): boolean {
    return this.timedPowerUps.has('star') || this.timedPowerUps.has('giga-mushroom');
  }

  /** O que o botão de ação lança: fogo, gelo ou nada, conforme a flor. */
  get flowerElement(): BallElement | null {
    return FLOWER_ELEMENTS.find(([flower]) => this.protections.has(flower))?.[1] ?? null;
  }

  isSpinningTail(now: number): boolean {
    return now - this.tailSpinStartedAt < RACCOON_SUIT_PHYSICS.tailSpinMs;
  }

  /** Nos últimos segundos do Giga Cogumelo o herói pisca, para avisar que vai encolher. */
  isGigaEnding(now: number): boolean {
    const expiresAt = this.timedPowerUps.get('giga-mushroom');

    return expiresAt !== undefined && expiresAt - now <= GIGA_PHYSICS.warningMs;
  }

  isInvincible(now: number): boolean {
    return now < this.invincibleUntil;
  }

  hasPowerUp(kind: PowerUpKind): boolean {
    return PROTECTIVE_POWER_UPS.has(kind) ? this.protections.has(kind) : this.timedPowerUps.has(kind);
  }

  placeFeetAt(feetX: number, feetY: number): void {
    this.stopSliding();
    placeFeet(this.body, feetX, feetY);
  }

  /** Pousou na rampa: dali em diante quem leva é o escorregador, até o fim dele ou um pulo. */
  startSliding(ramp: SlideRamp): void {
    this.slideRide = { ramp, speed: Math.max(SLIDE_PHYSICS.startSpeed, Math.abs(this.body.vx)) };
    this.body.hasGravity = false;
    this.body.riding = null;
    this.facing = ramp.bottomX > ramp.topX ? 1 : -1;
  }

  /** Decide a velocidade deste passo; a física move o corpo logo depois. */
  control(now: number, deltaMs: number, input: InputSnapshot, surroundings: PlayerSurroundings): void {
    this.expirePowerUps(now);
    this.climbing = false;
    this.gliding = false;
    this.flying = false;

    if (!this.isActive) {
      return;
    }

    this.fitGigaSize();

    const grounded = this.isGrounded;

    if (grounded) {
      this.lastGroundedAt = now;
      this.hasUsedDoubleJump = false;
      this.climbTimeLeftMs = CAT_SUIT_PHYSICS.climbMs;
      this.flightTimeLeftMs = RACCOON_SUIT_PHYSICS.flightMs;
    }

    if (this.slideRide) {
      this.rideSlide(this.slideRide, deltaMs / 1000, input);
      this.wasGrounded = false;
      this.previousFallSpeed = this.body.vy;
      return;
    }

    this.handleWater(surroundings.isInWater);
    this.handleLanding(grounded);
    this.moveHorizontally(deltaMs / 1000, input, grounded, surroundings.isOnIce);
    this.kickUpDust(now, grounded);

    if (this.isInWater) {
      this.handleSwim(input, surroundings.isAtWaterSurface);
    } else if (!this.climbWall(deltaMs, input, grounded) && !this.fly(now, deltaMs, input, grounded)) {
      this.handleJump(now, input, grounded);
      this.glide(input, grounded);
    }

    this.updateMode(now, grounded);

    this.wasGrounded = grounded;
    this.previousFallSpeed = this.body.vy;
  }

  /**
   * Impulso para cima vindo de fora: mola ou pisão em inimigo.
   *
   * A mola nunca é cortada; o pisão vira pulo alto só se o botão de pular
   * estiver apertado, e um quiquinho se não estiver.
   */
  bounce(velocity: number, canBeCut: boolean): void {
    this.stopSliding();
    this.body.vy = -velocity;
    this.body.riding = null;
    this.isJumpCut = !canBeCut;
    this.hasUsedDoubleJump = false;
  }

  grantPowerUp(kind: PowerUpKind, now: number): void {
    if (!PROTECTIVE_POWER_UPS.has(kind)) {
      this.timedPowerUps.set(kind, now + POWER_UP_DURATION_MS[kind]);
      return;
    }

    this.protections.add(kind);

    if (SUIT_SET.has(kind)) {
      this.protections.add('mushroom');
      this.dropOtherSuits(kind);
    }
  }

  /** Folha do Guaxinim: começa um giro de rabo, se o anterior já acabou de descansar. */
  startTailSpin(now: number): boolean {
    const isResting = now - this.tailSpinStartedAt < RACCOON_SUIT_PHYSICS.tailSpinCooldownMs;

    if (!this.isActive || isResting || !this.protections.has('raccoon-leaf')) {
      return false;
    }

    this.tailSpinStartedAt = now;

    return true;
  }

  /** Tira um poder de proteção, gasto num toque. */
  losePowerUp(kind: PowerUpKind): void {
    this.protections.delete(kind);
  }

  clearPowerUps(): void {
    this.timedPowerUps.clear();
    this.protections.clear();
  }

  makeInvincible(now: number, durationMs: number): void {
    this.invincibleUntil = now + durationMs;
  }

  showHitPose(now: number, knockbackDirection: number): void {
    this.stopSliding();
    this.hitPoseUntil = now + HIT_POSE_MS;
    this.body.vx = knockbackDirection * 220;
    this.body.vy = -380;
    this.body.riding = null;
    this.mode = 'HIT';
  }

  defeat(): void {
    this.stopSliding();
    this.mode = 'DEAD';
    this.body.vx = 0;
    this.body.vy = 0;
  }

  /** Vitória: o Pedro para e viaja girando até o centro do portal. */
  celebrate(now: number, portalX: number, portalY: number): void {
    this.stopSliding();
    this.mode = 'WIN';
    this.body.vx = 0;
    this.body.vy = 0;
    this.celebration = {
      startedAt: now,
      fromX: centerX(this.body),
      fromY: bottom(this.body),
      toX: portalX,
      toY: portalY,
    };
  }

  /** Volta ao jogo depois de um checkpoint: parado, visível e com gravidade. */
  revive(now: number, invincibilityMs: number): void {
    this.mode = 'IDLE';
    this.celebration = null;
    this.body.vx = 0;
    this.body.vy = 0;
    this.wasGrounded = false;
    this.previousFallSpeed = 0;
    this.makeInvincible(now, invincibilityMs);
  }

  /**
   * Um passo de descida: acelera, gruda os pés na rampa e aponta a velocidade
   * ao longo dela, para a física mover o corpo. No fim da rampa, ou batendo
   * numa parede, o Pedro sai correndo com o embalo; o pulo também tira ele dali.
   */
  private rideSlide(ride: SlideRide, seconds: number, input: InputSnapshot): void {
    const { ramp } = ride;
    const body = this.body;
    const x = centerX(body);
    const runX = ramp.bottomX - ramp.topX;
    const runY = ramp.bottomY - ramp.topY;
    const length = Math.hypot(runX, runY);

    ride.speed = Math.min(SLIDE_PHYSICS.maxSpeed, ride.speed + SLIDE_PHYSICS.acceleration * seconds);
    body.vx = (ride.speed * runX) / length;

    if (input.jumpPressed) {
      this.stopSliding();
      this.jump(this.jumpVelocity());
      this.mode = 'JUMP';
      return;
    }

    if (x >= ramp.bottomX || body.blockedLeft || body.blockedRight) {
      this.stopSliding();
      body.vy = 0;
      this.mode = 'RUN';
      return;
    }

    body.y = rampSurfaceY(ramp, x) - body.height;
    body.vy = (ride.speed * runY) / length;
    this.mode = 'SLIDE';
  }

  private stopSliding(): void {
    this.slideRide = null;
    this.body.hasGravity = true;
  }

  /** Os trajes não se somam: o novo toma o lugar do outro. */
  private dropOtherSuits(kept: PowerUpKind): void {
    for (const suit of SUIT_POWER_UPS) {
      if (suit !== kept && this.protections.delete(suit)) {
        this.host.onPowerUpEnded(suit);
      }
    }
  }

  /**
   * Cogumelo Gato: no ar e empurrando uma parede, o herói sobe por ela enquanto
   * durar o fôlego; o pulo grudado na parede o lança para o outro lado.
   * Verdadeiro quando a parede cuidou do movimento deste passo.
   */
  private climbWall(deltaMs: number, input: InputSnapshot, grounded: boolean): boolean {
    const wallSide = this.pushedWallSide(input);

    if (grounded || wallSide === 0 || !this.protections.has('cat-mushroom')) {
      return false;
    }

    if (input.jumpPressed) {
      this.jump(this.jumpVelocity() * CAT_SUIT_PHYSICS.wallJumpMultiplier);
      this.body.vx = -wallSide * CAT_SUIT_PHYSICS.wallJumpPush;
      this.facing = wallSide === 1 ? -1 : 1;
      this.host.effects.burst('dust', centerX(this.body) + wallSide * (this.body.width / 2), this.body.y + this.body.height / 2, 6);

      return true;
    }

    if (this.climbTimeLeftMs <= 0) {
      return false;
    }

    this.climbTimeLeftMs -= deltaMs;
    this.body.vy = -CAT_SUIT_PHYSICS.climbSpeed;
    this.climbing = true;

    return true;
  }

  /** Para que lado o herói empurra uma parede encostada: 1 direita, -1 esquerda, 0 nenhum. */
  private pushedWallSide(input: InputSnapshot): -1 | 0 | 1 {
    if (input.right && this.body.blockedRight) {
      return 1;
    }

    if (input.left && this.body.blockedLeft) {
      return -1;
    }

    return 0;
  }

  /** Cogumelo Folha: caindo com o pulo apertado, a queda fica lenta como a de uma folha. */
  private glide(input: InputSnapshot, grounded: boolean): void {
    if (grounded || !input.jumpHeld || this.body.vy <= 0 || !this.protections.has('leaf-mushroom')) {
      return;
    }

    this.gliding = true;
    this.body.maxFallSpeed = LEAF_SUIT_PHYSICS.glideFallSpeed;
    this.body.vy = Math.min(this.body.vy, LEAF_SUIT_PHYSICS.glideFallSpeed);
  }

  /**
   * Folha do Guaxinim: no ar e segurando o pulo, o herói sobe voando enquanto
   * durar o fôlego. O voo só assume quando o pulo já perdeu força, então
   * segurar o botão desde o chão emenda pulo e voo sem encurtar o pulo.
   * Verdadeiro quando o voo cuidou do movimento deste passo.
   */
  private fly(now: number, deltaMs: number, input: InputSnapshot, grounded: boolean): boolean {
    const isPastCoyoteTime = now - this.lastGroundedAt > PLAYER_PHYSICS.coyoteTimeMs;
    const isRisingFasterThanFlight = this.body.vy < -RACCOON_SUIT_PHYSICS.flySpeed;

    if (
      grounded ||
      !isPastCoyoteTime ||
      !input.jumpHeld ||
      isRisingFasterThanFlight ||
      this.flightTimeLeftMs <= 0 ||
      !this.protections.has('raccoon-leaf')
    ) {
      return false;
    }

    this.flightTimeLeftMs -= deltaMs;
    this.body.vy = -RACCOON_SUIT_PHYSICS.flySpeed;
    this.body.riding = null;
    this.flying = true;

    return true;
  }

  /**
   * Giga Cogumelo: a caixa de colisão dobra, com os pés no mesmo lugar, mas só
   * onde o corpo gigante cabe — crescer dentro de um túnel prenderia o herói
   * na parede. Encolher é sempre seguro: a caixa menor fica dentro da maior,
   * que já estava livre. Se uma porta ou o checkpoint levar o gigante para um
   * lugar apertado, ele volta ao tamanho normal até ter espaço de novo.
   */
  private fitGigaSize(): void {
    const isGigaActive = this.timedPowerUps.has('giga-mushroom');

    if (this.isGiant) {
      if (!isGigaActive || !this.host.hasRoomFor(this.body)) {
        this.resizeBody(1);
      }

      return;
    }

    if (isGigaActive && this.host.hasRoomFor(this.areaWithScale(GIGA_PHYSICS.bodyScale))) {
      this.resizeBody(GIGA_PHYSICS.bodyScale);
    }
  }

  /** A caixa de colisão numa escala da normal, com os pés no mesmo ponto de agora. */
  private areaWithScale(scale: number): WorldArea {
    const width = PLAYER_PHYSICS.bodyWidth * scale;
    const height = PLAYER_PHYSICS.bodyHeight * scale;

    return { x: centerX(this.body) - width / 2, y: bottom(this.body) - height, width, height };
  }

  private resizeBody(scale: number): void {
    const body = this.body;
    const area = this.areaWithScale(scale);

    // A posição anterior anda junto, para a tela não desenhar um salto entre os dois tamanhos.
    body.previousX += area.x - body.x;
    body.previousY += area.y - body.y;
    body.x = area.x;
    body.y = area.y;
    body.width = area.width;
    body.height = area.height;
  }

  /** Dentro da água a gravidade quase some e a queda fica lenta; ao entrar ou sair, espirra. */
  private handleWater(isInWater: boolean): void {
    if (isInWater !== this.isInWater) {
      this.host.effects.burst('bubble', centerX(this.body), isInWater ? bottom(this.body) : this.body.y, 10);
    }

    this.isInWater = isInWater;
    this.body.gravityScale = isInWater ? SWIM_PHYSICS.gravityScale : 1;
    this.body.maxFallSpeed = isInWater ? SWIM_PHYSICS.maxSinkSpeed : PLAYER_PHYSICS.maxFallSpeed;
  }

  /** Cada apertada de pulo é uma braçada; com a cabeça para fora, um salto para sair da água. */
  private handleSwim(input: InputSnapshot, isAtSurface: boolean): void {
    if (!input.jumpPressed) {
      return;
    }

    const velocity = isAtSurface ? this.jumpVelocity() * SWIM_PHYSICS.leapMultiplier : SWIM_PHYSICS.strokeVelocity;

    this.jump(velocity);
    this.isJumpCut = true;
    this.host.effects.burst('bubble', centerX(this.body), this.body.y, 4);
  }

  private moveHorizontally(seconds: number, input: InputSnapshot, grounded: boolean, isOnIce: boolean): void {
    const direction = (input.right ? 1 : 0) - (input.left ? 1 : 0);
    const turbo = this.timedPowerUps.has('turbo') ? PLAYER_PHYSICS.turboMultiplier : 1;
    const swim = this.isInWater ? SWIM_PHYSICS.speedMultiplier : 1;
    const topSpeed = (input.run ? PLAYER_PHYSICS.runSpeed : PLAYER_PHYSICS.walkSpeed) * turbo * swim;

    let rate: number;

    if (direction !== 0) {
      rate = grounded ? PLAYER_PHYSICS.groundAcceleration * (isOnIce ? 0.35 : 1) : PLAYER_PHYSICS.airAcceleration;
    } else if (grounded) {
      const braking = isOnIce ? PLAYER_PHYSICS.iceDeceleration : PLAYER_PHYSICS.groundDeceleration;

      rate = braking * this.abilities.brakingMultiplier;
    } else {
      rate = PLAYER_PHYSICS.airAcceleration * 0.4;
    }

    this.body.vx = approach(this.body.vx, direction * topSpeed, rate * seconds);

    if (direction !== 0) {
      this.facing = direction > 0 ? 1 : -1;
    }
  }

  private handleJump(now: number, input: InputSnapshot, grounded: boolean): void {
    if (input.jumpPressed) {
      this.lastJumpPressedAt = now;
    }

    const hasBufferedJump = now - this.lastJumpPressedAt <= PLAYER_PHYSICS.jumpBufferMs;
    const canGroundJump = grounded || now - this.lastGroundedAt <= PLAYER_PHYSICS.coyoteTimeMs;
    const velocityY = this.body.vy;

    if (hasBufferedJump && canGroundJump && velocityY >= -1) {
      this.jump(this.jumpVelocity());
      this.lastGroundedAt = Number.NEGATIVE_INFINITY;
      this.host.effects.burst('dust', centerX(this.body), bottom(this.body), 6);

      return;
    }

    if (input.jumpPressed && !canGroundJump && this.timedPowerUps.has('wings') && !this.hasUsedDoubleJump) {
      this.hasUsedDoubleJump = true;
      this.jump(this.jumpVelocity() * 0.92);
      this.host.effects.burst('poof', centerX(this.body), bottom(this.body), 8);

      return;
    }

    // Soltar o botão enquanto sobe corta o pulo: é o pulinho curto.
    if (!input.jumpHeld && !this.isJumpCut && velocityY < 0) {
      this.body.vy = velocityY * PLAYER_PHYSICS.jumpCutMultiplier;
      this.isJumpCut = true;
    }
  }

  private jump(velocity: number): void {
    this.body.vy = -velocity;
    this.body.riding = null;
    this.lastJumpPressedAt = Number.NEGATIVE_INFINITY;
    this.isJumpCut = false;
    this.host.playSound('jump');
  }

  private jumpVelocity(): number {
    const boost = this.timedPowerUps.has('super-jump') ? PLAYER_PHYSICS.superJumpMultiplier : 1;

    return PLAYER_PHYSICS.jumpVelocity * boost * this.abilities.jumpMultiplier;
  }

  private handleLanding(grounded: boolean): void {
    if (grounded && !this.wasGrounded && this.previousFallSpeed > DUST_LANDING_SPEED) {
      this.host.effects.burst('dust', centerX(this.body), bottom(this.body), 8);
    }
  }

  private kickUpDust(now: number, grounded: boolean): void {
    if (!grounded || Math.abs(this.body.vx) < RUN_DUST_SPEED || now - this.lastRunDustAt < RUN_DUST_INTERVAL_MS) {
      return;
    }

    this.lastRunDustAt = now;
    this.host.effects.burst('dust', centerX(this.body) - Math.sign(this.body.vx) * 10, bottom(this.body), 2);
  }

  private updateMode(now: number, grounded: boolean): void {
    if (this.mode === 'HIT' && now < this.hitPoseUntil) {
      return;
    }

    if (!grounded) {
      this.mode = this.body.vy < 0 ? 'JUMP' : 'FALL';
    } else {
      this.mode = Math.abs(this.body.vx) > 20 ? 'RUN' : 'IDLE';
    }
  }

  private expirePowerUps(now: number): void {
    for (const [kind, expiresAt] of this.timedPowerUps) {
      if (now >= expiresAt) {
        this.timedPowerUps.delete(kind);
        this.host.onPowerUpEnded(kind);
      }
    }
  }
}

function approach(current: number, target: number, maxStep: number): number {
  if (current < target) {
    return Math.min(target, current + maxStep);
  }

  return Math.max(target, current - maxStep);
}
