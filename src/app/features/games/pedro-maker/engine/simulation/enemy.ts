import { FROZEN_ENEMY_MS, TILE_SIZE } from '../../config/physics.config';
import type { EnemyKind } from '../../models/level.model';
import { bottom, centerX, centerY, createBody, type PhysicsBody } from './physics-body';

/** Pergunta à partida se há onde pisar num ponto do mundo. */
export type GroundProbe = (worldX: number, worldY: number) => boolean;

interface EnemyProfile {
  readonly speed: number;
  readonly bodyWidth: number;
  readonly bodyHeight: number;
  readonly flies: boolean;
  readonly isStompable: boolean;
  /** A bola de fogo se apaga nele sem derrotá-lo, e o gelo derrete sem congelá-lo. */
  readonly isFireproof: boolean;
}

const PROFILES: Readonly<Record<EnemyKind, EnemyProfile>> = {
  slime: { speed: 60, bodyWidth: 34, bodyHeight: 24, flies: false, isStompable: true, isFireproof: false },
  spiky: { speed: 50, bodyWidth: 32, bodyHeight: 26, flies: false, isStompable: false, isFireproof: false },
  robot: { speed: 110, bodyWidth: 30, bodyHeight: 34, flies: false, isStompable: true, isFireproof: false },
  bat: { speed: 1, bodyWidth: 26, bodyHeight: 20, flies: true, isStompable: true, isFireproof: false },
  ghost: { speed: 50, bodyWidth: 30, bodyHeight: 32, flies: true, isStompable: true, isFireproof: false },
  turtle: { speed: 40, bodyWidth: 34, bodyHeight: 30, flies: false, isStompable: true, isFireproof: false },
  piranha: { speed: 0, bodyWidth: 26, bodyHeight: 40, flies: false, isStompable: false, isFireproof: false },
  penguin: { speed: 95, bodyWidth: 30, bodyHeight: 34, flies: false, isStompable: true, isFireproof: false },
  'lava-bubble': { speed: 0, bodyWidth: 26, bodyHeight: 26, flies: true, isStompable: false, isFireproof: true },
  bee: { speed: 85, bodyWidth: 28, bodyHeight: 24, flies: true, isStompable: true, isFireproof: false },
  goomba: { speed: 55, bodyWidth: 34, bodyHeight: 30, flies: false, isStompable: true, isFireproof: false },
  bullet: { speed: 150, bodyWidth: 40, bodyHeight: 28, flies: true, isStompable: true, isFireproof: true },
  thwomp: { speed: 0, bodyWidth: 44, bodyHeight: 46, flies: true, isStompable: false, isFireproof: true },
  'king-slime': { speed: 40, bodyWidth: 58, bodyHeight: 46, flies: false, isStompable: true, isFireproof: false },
  'iron-ball': { speed: 0, bodyWidth: 36, bodyHeight: 36, flies: true, isStompable: false, isFireproof: true },
  fish: { speed: 70, bodyWidth: 34, bodyHeight: 22, flies: true, isStompable: true, isFireproof: false },
  'jumping-fish': { speed: 0, bodyWidth: 30, bodyHeight: 22, flies: true, isStompable: true, isFireproof: false },
};

/** Distância que o robô patrulha para cada lado do ponto de partida. */
const ROBOT_PATROL = TILE_SIZE * 4;
const ROBOT_PAUSE_MS = 450;

const BAT_RANGE_X = TILE_SIZE * 2;
const BAT_RANGE_Y = TILE_SIZE * 0.6;

const GHOST_VISIBLE_MS = 2600;
const GHOST_FADED_MS = 1600;
const GHOST_NOTICE_DISTANCE = 340;

/** Ciclo da planta carnívora: escondida, subindo, de fora e descendo. */
const PIRANHA_HIDDEN_MS = 1800;
const PIRANHA_RISE_MS = 350;
const PIRANHA_OUT_MS = 1500;
const PIRANHA_SINK_MS = 350;
const PIRANHA_CYCLE_MS = PIRANHA_HIDDEN_MS + PIRANHA_RISE_MS + PIRANHA_OUT_MS + PIRANHA_SINK_MS;
/** Com o Pedro colado no cano, a planta espera: ninguém é mordido sem ver. */
const PIRANHA_SHY_DISTANCE = TILE_SIZE * 1.5;

/** Distância que a abelha voa para cada lado do ponto de partida. */
const BEE_PATROL = TILE_SIZE * 3;
const BEE_BOB_HEIGHT = 30;

/** O peixe nadador vai e volta mais longe que a abelha e ondula mais de leve. */
const FISH_PATROL = TILE_SIZE * 4;
const FISH_BOB_HEIGHT = 14;

/** Um salto para fora do líquido: tempo mergulhado, tempo no ar e a altura do arco. */
interface LeapProfile {
  readonly waitMs: number;
  readonly jumpMs: number;
  readonly height: number;
}

/** A bolinha de lava espera na lava e dá um salto alto. */
const LAVA_BUBBLE_LEAP: LeapProfile = { waitMs: 1100, jumpMs: 1500, height: TILE_SIZE * 4.2 };
/** O peixe saltador espera mais tempo mergulhado: dá para ver a água e se preparar. */
const JUMPING_FISH_LEAP: LeapProfile = { waitMs: 1400, jumpMs: 1300, height: TILE_SIZE * 3.6 };
/** Quão rápido o corpo persegue o ponto do salto: alto para seguir a curva de perto. */
const LEAP_STEERING = 12;

/** Distância que a bala de canhão voa antes de ser disparada de novo do ponto de partida. */
const BULLET_RANGE = TILE_SIZE * 12;

/** O thwomp despenca quando o herói passa embaixo dele, perto assim na horizontal. */
const THWOMP_REACH_X = TILE_SIZE * 1.4;
const THWOMP_FALL_SPEED = 720;
const THWOMP_RISE_SPEED = 110;
/** Tempo no chão depois da pancada: a janela para passar por ele. */
const THWOMP_REST_MS = 900;

/** `waiting` no alto, `falling` despencando, `resting` no chão e `rising` voltando para cima. */
type ThwompState = 'waiting' | 'falling' | 'resting' | 'rising';

/** Comprimento da corrente do Bolão: até onde ele alcança a partir da estaca. */
export const IRON_BALL_CHAIN_LENGTH = TILE_SIZE * 3;
/** A estaca fica um pouco atrás do Bolão, cravada no chão da mesma célula. */
const IRON_BALL_STAKE_OFFSET_X = TILE_SIZE * 0.55;
/** O Bolão só repara no herói dentro desta caixa em volta da estaca. */
const IRON_BALL_NOTICE_X = TILE_SIZE * 4.5;
const IRON_BALL_NOTICE_Y = TILE_SIZE * 2.5;
/** O aviso antes do bote: o Bolão treme e o herói tem tempo de sair dali. */
const IRON_BALL_WINDUP_MS = 450;
const IRON_BALL_LUNGE_SPEED = 520;
const IRON_BALL_RETURN_SPEED = 120;
/** Descanso depois de voltar para a estaca, antes de poder dar outro bote. */
const IRON_BALL_REST_MS = 1000;
const IRON_BALL_HOP_HEIGHT = TILE_SIZE * 0.3;
/** Perto assim do alvo, o bote terminou. */
const IRON_BALL_ARRIVAL = 6;

/** `idle` quicando na estaca, `winding` tremendo antes do bote, `lunging` no bote e `returning` voltando. */
type IronBallState = 'idle' | 'winding' | 'lunging' | 'returning';

/** Um ponto do mundo, em pixels. */
export interface WorldPoint {
  readonly x: number;
  readonly y: number;
}

/** Tempo da animação de derrota antes de o inimigo sair da partida. */
export const ENEMY_DEFEAT_MS = 280;

/**
 * Inimigo comum.
 *
 * Cada tipo tem um jeito de andar: o slime e o espinhudo vão e voltam sem cair
 * das beiradas, o robô patrulha um trecho com paradinhas, o morcego voa num
 * oito e o fantasminha segue o Pedro devagar, sumindo de tempos em tempos.
 * Invisível, o fantasminha não machuca — é a hora de passar por ele. A
 * tartaruga anda como o slime, só que mais devagar, e a planta carnívora não
 * sai do lugar: sobe e desce do cano, e escondida também não machuca. O
 * pinguim patrulha como o slime, mais ligeiro, e a bolinha de lava salta da
 * lava e mergulha de volta, sem machucar enquanto está lá dentro. A abelha
 * voa de um lado para o outro, subindo e descendo de leve.
 *
 * O goomba e o Rei Slime patrulham como o slime. A bala de canhão voa reto e,
 * ao bater numa parede ou ir longe demais, é disparada de novo do ponto de
 * partida, na direção do herói. O thwomp espera no alto, despenca quando o
 * herói passa embaixo, descansa um pouco no chão e sobe devagar.
 *
 * O Bolão é uma bola de ferro presa numa estaca pela corrente. Quica no
 * lugar e, quando o herói chega perto, treme como aviso e dá um bote na
 * direção dele — nunca além da corrente. Depois volta devagar para a estaca e
 * descansa: é a hora de passar. De ferro, não se pisa nem se queima.
 *
 * O peixe nadador vai e volta como a abelha, ondulando de leve. O peixe
 * saltador pula para fora da água como a bolinha de lava, e mergulhado também
 * não machuca; diferente dela, é pisável e o fogo e o gelo pegam nele.
 *
 * Atingido pela Flor de Gelo, qualquer um vira um bloco de gelo parado, que
 * não machuca e quebra com um pisão; depois de um tempo, derrete e volta.
 */
export class Enemy {
  readonly body: PhysicsBody;
  isDefeated = false;
  defeatedAt = 0;
  /** Fantasma sumido ou planta dentro do cano: não machuca nem é atingido. */
  isHidden = false;
  /** Quanto a planta está para fora do cano, de 0 a 1; os outros estão sempre inteiros. */
  emergence = 1;
  /** 1 olhando para a direita, -1 para a esquerda. */
  direction: 1 | -1 = -1;
  /** Preso num bloco de gelo da Flor de Gelo. */
  isFrozen = false;
  /** Até quando o inimigo recém-nascido não machuca: os slimes do Rei Slime nascem colados no herói. */
  harmlessUntil = 0;
  /** Topo da estaca que segura a corrente, para o Bolão; `null` para os outros. */
  readonly anchor: WorldPoint | null = null;

  private readonly profile: EnemyProfile;
  private frozenUntil = 0;
  private readonly homeX: number;
  private readonly homeY: number;
  private pausedUntil = 0;
  private piranhaCycleMs: number;
  private lastStepAt: number | null = null;
  private thwompState: ThwompState = 'waiting';
  private hasLanded = false;
  private ironBallState: IronBallState = 'idle';
  private lungeTarget: WorldPoint = { x: 0, y: 0 };

  constructor(
    readonly id: number,
    readonly kind: EnemyKind,
    cellX: number,
    cellY: number,
    private readonly speedMultiplier: number,
    private readonly hasGroundAt: GroundProbe,
    /** Fase da animação: dois morcegos vizinhos não batem asas em sincronia. */
    private readonly phase: number,
    /** Ajudantes do chefão são menores. */
    readonly scale = 1,
    readonly isProjectile = false,
  ) {
    const profile = PROFILES[kind];

    this.profile = profile;
    this.body = createBody(profile.bodyWidth * scale, profile.bodyHeight * scale, !profile.flies);
    this.body.x = cellX * TILE_SIZE + TILE_SIZE / 2 - this.body.width / 2;
    this.body.y = profile.flies && kind !== 'iron-ball'
      ? cellY * TILE_SIZE + (TILE_SIZE - this.body.height) / 2
      // O Bolão voa preso à corrente, mas descansa apoiado no chão da célula.
      : (cellY + 1) * TILE_SIZE - this.body.height;
    this.body.previousX = this.body.x;
    this.body.previousY = this.body.y;
    this.homeX = centerX(this.body);
    this.homeY = centerY(this.body);
    this.piranhaCycleMs = (phase / (Math.PI * 2)) * PIRANHA_CYCLE_MS;

    if (kind === 'iron-ball') {
      this.anchor = { x: this.homeX - IRON_BALL_STAKE_OFFSET_X, y: (cellY + 1) * TILE_SIZE };
    }

    if (kind === 'piranha') {
      this.emergence = piranhaEmergence(this.piranhaCycleMs);
      this.isHidden = this.emergence < 0.5;
    }

    if (kind === 'lava-bubble' || kind === 'jumping-fish') {
      this.emergence = 0;
      this.isHidden = true;
    }
  }

  get flies(): boolean {
    return this.profile.flies;
  }

  /** Pisar em cima derrota o inimigo? O espinhudo e o fantasma sumido, não. */
  get canBeStomped(): boolean {
    return this.profile.isStompable && !this.isHidden;
  }

  get isFireproof(): boolean {
    return this.profile.isFireproof;
  }

  get isHarmful(): boolean {
    return !this.isDefeated && !this.isHidden && !this.isFrozen;
  }

  /** A bolinha de lava é quente demais: o gelo derrete nela. */
  get canBeFrozen(): boolean {
    return !this.profile.isFireproof;
  }

  /** O Bolão tremendo antes do bote: a tela mostra o aviso. */
  get isWindingUp(): boolean {
    return this.ironBallState === 'winding';
  }

  step(now: number, targetX: number, targetY: number): void {
    if (this.isDefeated) {
      return;
    }

    if (this.isFrozen) {
      this.stayFrozen(now);
      return;
    }

    switch (this.kind) {
      case 'slime':
      case 'spiky':
      case 'turtle':
      case 'penguin':
      case 'goomba':
      case 'king-slime':
        this.patrolLedges();
        return;
      case 'robot':
        this.patrolRegion(now);
        return;
      case 'bat':
        this.flyFigureEight(now);
        return;
      case 'ghost':
        this.haunt(now, targetX, targetY);
        return;
      case 'piranha':
        this.lurkInPipe(now, targetX);
        return;
      case 'lava-bubble':
        this.leapOut(now, LAVA_BUBBLE_LEAP);
        return;
      case 'jumping-fish':
        this.leapOut(now, JUMPING_FISH_LEAP);
        return;
      case 'bee':
        this.hover(now, BEE_PATROL, BEE_BOB_HEIGHT);
        return;
      case 'fish':
        this.hover(now, FISH_PATROL, FISH_BOB_HEIGHT);
        return;
      case 'bullet':
        this.cruise(now, targetX);
        return;
      case 'thwomp':
        this.slam(now, targetX, targetY);
        return;
      case 'iron-ball':
        this.strainAtChain(now, targetX, targetY);
        return;
    }
  }

  /** Verdadeiro uma única vez a cada pancada do thwomp no chão, para a partida tremer a tela. */
  takeLanding(): boolean {
    const hasLanded = this.hasLanded;

    this.hasLanded = false;

    return hasLanded;
  }

  /** Longe do Pedro, o inimigo espera: poupa processamento e não foge da fase. */
  standStill(): void {
    this.body.vx = 0;

    if (this.profile.flies) {
      this.body.vy = 0;
    }
  }

  /** Atingido pelo gelo: para onde está. Um segundo acerto renova o gelo. */
  freezeInIce(now: number): void {
    this.isFrozen = true;
    this.frozenUntil = now + FROZEN_ENEMY_MS;
    this.standStill();
  }

  defeat(now: number): void {
    this.isDefeated = true;
    this.isFrozen = false;
    this.defeatedAt = now;
    this.body.vx = 0;
    this.body.vy = 0;
  }

  /** Congelado, quem anda no chão ainda cai; quem voa fica parado no ar. */
  private stayFrozen(now: number): void {
    if (now >= this.frozenUntil) {
      this.isFrozen = false;
      return;
    }

    this.standStill();
  }

  private patrolLedges(): void {
    const body = this.body;

    if (body.blockedLeft) {
      this.direction = 1;
    } else if (body.blockedRight) {
      this.direction = -1;
    } else if (body.blockedDown && !this.hasGroundAhead()) {
      this.turnAround();
    }

    body.vx = this.direction * this.profile.speed * this.speedMultiplier;
  }

  private patrolRegion(now: number): void {
    const body = this.body;

    if (now < this.pausedUntil) {
      body.vx = 0;
      return;
    }

    const x = centerX(body);
    const hitsLimit =
      (this.direction < 0 && (x <= this.homeX - ROBOT_PATROL || body.blockedLeft)) ||
      (this.direction > 0 && (x >= this.homeX + ROBOT_PATROL || body.blockedRight)) ||
      (body.blockedDown && !this.hasGroundAhead());

    if (hitsLimit) {
      this.turnAround();
      this.pausedUntil = now + ROBOT_PAUSE_MS;
      body.vx = 0;

      return;
    }

    body.vx = this.direction * this.profile.speed * this.speedMultiplier;
  }

  private flyFigureEight(now: number): void {
    const seconds = (now / 1000) * this.speedMultiplier + this.phase;
    const targetX = this.homeX + Math.sin(seconds * 0.9) * BAT_RANGE_X;
    const targetY = this.homeY + Math.sin(seconds * 1.8) * BAT_RANGE_Y;
    const x = centerX(this.body);

    this.body.vx = (targetX - x) * 6;
    this.body.vy = (targetY - centerY(this.body)) * 6;
    this.direction = targetX > x ? 1 : -1;
  }

  private haunt(now: number, targetX: number, targetY: number): void {
    const cycle = (now + this.phase * 1000) % (GHOST_VISIBLE_MS + GHOST_FADED_MS);

    this.isHidden = cycle > GHOST_VISIBLE_MS;

    const x = centerX(this.body);
    const y = centerY(this.body);
    const distance = Math.hypot(targetX - x, targetY - y);

    if (this.isHidden || distance > GHOST_NOTICE_DISTANCE) {
      // Longe ou sumido, só flutua no lugar.
      this.body.vx = 0;
      this.body.vy = Math.sin(now / 400 + this.phase) * 20;
      return;
    }

    const angle = Math.atan2(targetY - y, targetX - x);
    const speed = this.profile.speed * this.speedMultiplier;

    this.body.vx = Math.cos(angle) * speed;
    this.body.vy = Math.sin(angle) * speed;
    this.direction = targetX > x ? 1 : -1;
  }

  private lurkInPipe(now: number, targetX: number): void {
    const elapsed = this.lastStepAt === null ? 0 : now - this.lastStepAt;
    const x = centerX(this.body);
    const isWaitingForPedro = this.piranhaCycleMs < PIRANHA_HIDDEN_MS && Math.abs(targetX - x) < PIRANHA_SHY_DISTANCE;

    this.lastStepAt = now;
    this.body.vx = 0;
    this.direction = targetX > x ? 1 : -1;

    if (!isWaitingForPedro) {
      this.piranhaCycleMs = (this.piranhaCycleMs + elapsed) % PIRANHA_CYCLE_MS;
    }

    this.emergence = piranhaEmergence(this.piranhaCycleMs);
    this.isHidden = this.emergence < 0.5;
  }

  /** Vai e volta pelo ar ou pela água, até `patrol` de cada lado de casa, subindo e descendo de leve. */
  private hover(now: number, patrol: number, bobHeight: number): void {
    const body = this.body;
    const x = centerX(body);
    const isAtLimit =
      (this.direction < 0 && (x <= this.homeX - patrol || body.blockedLeft)) ||
      (this.direction > 0 && (x >= this.homeX + patrol || body.blockedRight));

    if (isAtLimit) {
      this.turnAround();
    }

    body.vx = this.direction * this.profile.speed * this.speedMultiplier;
    body.vy = Math.cos(now / 300 + this.phase) * bobHeight;
  }

  /** Espera mergulhado, sem machucar, e salta para fora num arco antes de mergulhar de novo. */
  private leapOut(now: number, leap: LeapProfile): void {
    const cycle = (now + this.phase * 1000) % (leap.waitMs + leap.jumpMs);
    const progress = Math.max(0, (cycle - leap.waitMs) / leap.jumpMs);
    // Parábola de 0 a 1 e de volta a 0: sobe rápido, para no alto e desce.
    const height = leap.height * 4 * progress * (1 - progress);

    this.body.vx = 0;
    this.body.vy = (this.homeY - height - centerY(this.body)) * LEAP_STEERING;
    this.isHidden = progress === 0;
    this.emergence = this.isHidden ? 0 : 1;
  }

  private cruise(now: number, targetX: number): void {
    const body = this.body;
    const isTooFar = Math.abs(centerX(body) - this.homeX) > BULLET_RANGE;

    if (body.blockedLeft || body.blockedRight || isTooFar) {
      if (this.isProjectile) {
        this.defeat(now);
        return;
      }
      this.relaunch(targetX);
      return;
    }

    body.vx = this.direction * this.profile.speed * this.speedMultiplier;
    body.vy = 0;
  }

  /** Volta ao ponto de partida sem deslizar até lá: a tela não desenha o caminho de volta. */
  private relaunch(targetX: number): void {
    const body = this.body;

    body.x = this.homeX - body.width / 2;
    body.previousX = body.x;
    body.vx = 0;
    this.direction = targetX >= this.homeX ? 1 : -1;
  }

  private slam(now: number, targetX: number, targetY: number): void {
    const body = this.body;

    body.vx = 0;

    switch (this.thwompState) {
      case 'waiting': {
        const isHeroBelow = Math.abs(targetX - centerX(body)) < THWOMP_REACH_X && targetY > centerY(body);

        body.vy = 0;
        this.direction = targetX > centerX(body) ? 1 : -1;

        if (isHeroBelow) {
          this.thwompState = 'falling';
        }

        return;
      }
      case 'falling':
        if (body.blockedDown) {
          this.thwompState = 'resting';
          this.pausedUntil = now + THWOMP_REST_MS;
          this.hasLanded = true;
          body.vy = 0;
          return;
        }

        body.vy = THWOMP_FALL_SPEED * this.speedMultiplier;
        return;
      case 'resting':
        body.vy = 0;

        if (now >= this.pausedUntil) {
          this.thwompState = 'rising';
        }

        return;
      case 'rising':
        if (centerY(body) <= this.homeY) {
          body.y = this.homeY - body.height / 2;
          body.vy = 0;
          this.thwompState = 'waiting';
          return;
        }

        body.vy = -THWOMP_RISE_SPEED * this.speedMultiplier;
        return;
    }
  }

  private strainAtChain(now: number, targetX: number, targetY: number): void {
    const body = this.body;

    switch (this.ironBallState) {
      case 'idle': {
        const hop = Math.abs(Math.sin((now / 1000) * 4 + this.phase)) * IRON_BALL_HOP_HEIGHT;
        const isHeroNear = Math.abs(targetX - this.homeX) < IRON_BALL_NOTICE_X && Math.abs(targetY - this.homeY) < IRON_BALL_NOTICE_Y;

        this.steerTo(this.homeX, this.homeY - hop, IRON_BALL_RETURN_SPEED * 2);
        this.direction = targetX > this.homeX ? 1 : -1;

        if (isHeroNear && now >= this.pausedUntil) {
          this.lungeTarget = withinChain({ x: this.homeX, y: this.homeY }, { x: targetX, y: targetY });
          this.ironBallState = 'winding';
          this.pausedUntil = now + IRON_BALL_WINDUP_MS;
        }

        return;
      }
      case 'winding':
        body.vx = 0;
        body.vy = 0;

        if (now >= this.pausedUntil) {
          this.ironBallState = 'lunging';
        }

        return;
      case 'lunging': {
        const hasArrived = this.steerTo(this.lungeTarget.x, this.lungeTarget.y, IRON_BALL_LUNGE_SPEED);
        const hitWall = body.blockedLeft || body.blockedRight || body.blockedUp || body.blockedDown;

        if (hasArrived || hitWall) {
          this.hasLanded = body.blockedDown;
          this.ironBallState = 'returning';
        }

        return;
      }
      case 'returning':
        if (this.steerTo(this.homeX, this.homeY, IRON_BALL_RETURN_SPEED)) {
          this.ironBallState = 'idle';
          this.pausedUntil = now + IRON_BALL_REST_MS;
        }

        return;
    }
  }

  /** Aponta a velocidade para um ponto. Verdadeiro quando já chegou nele. */
  private steerTo(x: number, y: number, speed: number): boolean {
    const body = this.body;
    const deltaX = x - centerX(body);
    const deltaY = y - centerY(body);
    const distance = Math.hypot(deltaX, deltaY);

    if (distance < IRON_BALL_ARRIVAL) {
      body.vx = 0;
      body.vy = 0;

      return true;
    }

    // Sem passar do ponto num passo só: perto do alvo, a velocidade diminui.
    const pace = Math.min(speed * this.speedMultiplier, distance * 12);

    body.vx = (deltaX / distance) * pace;
    body.vy = (deltaY / distance) * pace;

    return false;
  }

  private hasGroundAhead(): boolean {
    const aheadX = centerX(this.body) + this.direction * (this.body.width / 2 + 6);

    return this.hasGroundAt(aheadX, bottom(this.body) + 6);
  }

  private turnAround(): void {
    this.direction = this.direction === 1 ? -1 : 1;
  }
}

/** O ponto mais perto do alvo que a corrente deixa alcançar a partir de casa. */
export function withinChain(home: WorldPoint, target: WorldPoint): WorldPoint {
  const deltaX = target.x - home.x;
  const deltaY = target.y - home.y;
  const distance = Math.hypot(deltaX, deltaY);

  if (distance <= IRON_BALL_CHAIN_LENGTH) {
    return target;
  }

  const reach = IRON_BALL_CHAIN_LENGTH / distance;

  return { x: home.x + deltaX * reach, y: home.y + deltaY * reach };
}

function piranhaEmergence(cycleMs: number): number {
  const rising = cycleMs - PIRANHA_HIDDEN_MS;
  const sinking = rising - PIRANHA_RISE_MS - PIRANHA_OUT_MS;

  if (rising < 0) {
    return 0;
  }

  if (rising < PIRANHA_RISE_MS) {
    return rising / PIRANHA_RISE_MS;
  }

  return sinking < 0 ? 1 : Math.max(0, 1 - sinking / PIRANHA_SINK_MS);
}
