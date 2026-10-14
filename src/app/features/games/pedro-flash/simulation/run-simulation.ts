import { SeededRandom } from '../../pedro-maker/levels/seeded-random';
import { bossProfile, type BossAttackKind } from '../config/boss.config';
import { RIVALS, shoe } from '../config/runner.config';
import { buildCourse, courseGap, isOverGap, nextGapStart, ROAD_HEIGHT, type Course } from '../course/course-geometry';
import type { CourseDefinition, Lane } from '../models/course.model';
import type { BossId, RunMode, RunnerSetup } from '../models/runner.model';
import { Boss, BOSS_RADIUS } from './boss';
import {
  createCourseObjects,
  ENEMY_SHAPES,
  ITEM_BOX_HEIGHT,
  type Enemy,
  type EnemyKind,
  type Hazard,
  type ItemBox,
  type Pad,
  type RaioPickup,
} from './course-objects';
import type { FlashTuning } from './flash-tuning';
import { clamp, handlingFor, LATERAL_LIMIT, Runner, RUNNER_PHYSICS, type HomingTarget, type RunInput, type RunnerPower } from './runner';
import { RunnerPilot, type Bomb, type PilotWorld, type Wave } from './runner-pilot';

/** Passo fixo da física: sessenta vezes por segundo em qualquer tela. */
export const RUN_STEP_MS = 1000 / 60;
const STEP_SECONDS = RUN_STEP_MS / 1000;

export const COUNTDOWN_MS = 3000;

const PLAYER_RUNNER_ID = 'pedro';

/** Largada lado a lado, um corredor por pedaço de pista; o Pedro fica no segundo lugar da fila. */
const START_LATERALS: readonly number[] = [-3.9, -1.3, 1.3, 3.9];
const PLAYER_START_SLOT = 1;
const START_BEHIND_LINE = 1.5;
const RIVAL_LANES: readonly Lane[] = [-1, 1, 0];

const RAIO_RADIUS = 1.3;
const MAGNET_RADIUS = 7;
/** Na arena os raios voltam: a luta é longa e o Pedro precisa ter com o que se proteger. */
const RAIO_RESPAWN_MS = 9000;
const ITEM_BOX_RADIUS = 1.4;
const ITEM_BOX_RESPAWN_MS = 3000;
const BARRIER_RESPAWN_MS = 6000;
const BOX_ENERGY = 50;

const ENERGY_PER_RAIO = 4;
const ENERGY_PER_ENEMY = 12;
const ENERGY_PER_BOSS_HIT = 25;

const HOMING_RANGE = 28;
const HOMING_SIDE_RANGE = 7;

/** Abaixo disso, no buraco, já não dá para voltar à pista: o corredor despenca. */
const FALL_COMMIT_HEIGHT = -1.2;
/** Altura do chão do cenário, em relação à pista: ao chegar nela, reaparece. */
const FALL_RESPAWN_HEIGHT = -(ROAD_HEIGHT - 0.6);
const RESPAWN_BEFORE_GAP = 10;

const SPIKE = { halfLength: 1.3, halfWidth: 1.5, height: 0.8 } as const;
const BARRIER = { halfLength: 0.9, halfWidth: 1.6, height: 1.5 } as const;
const BOMB = { fallMs: 700, blastMs: 700, radius: 2.2, height: 1.6 } as const;
const WAVE = { speed: 10, lifetimeMs: 4500, halfLength: 0.9, height: 0.9 } as const;
const MAX_BOMBS = 6;
const MAX_WAVES = 4;

/** Velocidade de referência do "tempo de ouro" da fase: quem corre sem errar chega antes dele. */
const PAR_SPEED = 30;
const BOSS_PAR_SECONDS_PER_HIT = 12;
/** O chefão derrotado explode por um instante antes do resultado aparecer. */
const BOSS_FINALE_MS = 1800;

const RIVAL_TRAILING_GAP = 50;
const RIVAL_TRAILING_PACE = 1.12;
const FINISHED_PACE = 0.55;

const RUNNER_CONTACT_LENGTH = 1.2;
const RUNNER_CONTACT_WIDTH = 1.6;

export type RunPhase = 'contagem' | 'correndo' | 'terminou';

export interface RunSetup {
  readonly course: CourseDefinition;
  readonly mode: RunMode;
  readonly playerSetup: RunnerSetup;
  readonly playerName: string;
  readonly tuning: FlashTuning;
  /** O chefão da arena; obrigatório na batalha. */
  readonly boss?: BossId;
  readonly seed?: number;
}

export interface RunResult {
  readonly mode: RunMode;
  readonly placement: number;
  readonly racers: number;
  readonly timeMs: number;
  readonly raios: number;
  readonly totalRaios: number;
  readonly enemiesDefeated: number;
  readonly hitsTaken: number;
  /** O "tempo de ouro": chegar antes dele vale uma estrela. */
  readonly parTimeMs: number;
  readonly bossDefeated: boolean;
}

export type RunEvent =
  | { readonly type: 'contagem'; readonly value: number }
  | { readonly type: 'largada' }
  | { readonly type: 'pulo' }
  | { readonly type: 'ataque' }
  | { readonly type: 'impulso' }
  | { readonly type: 'raio'; readonly total: number }
  | { readonly type: 'caixa'; readonly power: RunnerPower }
  | { readonly type: 'mola' }
  | { readonly type: 'turbo' }
  | { readonly type: 'rampa' }
  | { readonly type: 'relampago' }
  | { readonly type: 'escudo-quebrou' }
  | { readonly type: 'dano'; readonly lost: number }
  | { readonly type: 'tropecou' }
  | { readonly type: 'batida' }
  | { readonly type: 'caiu' }
  | { readonly type: 'inimigo-derrotado'; readonly kind: EnemyKind }
  | { readonly type: 'chefe-chegou'; readonly name: string }
  | { readonly type: 'chefe-cansado' }
  | { readonly type: 'chefe-ataque'; readonly attack: BossAttackKind }
  | { readonly type: 'chefe-atingido'; readonly hitsLeft: number }
  | { readonly type: 'chefe-derrotado' }
  | { readonly type: 'chegada'; readonly result: RunResult };

export interface BossHud {
  readonly name: string;
  readonly hitsLeft: number;
  readonly hitsNeeded: number;
  readonly isTired: boolean;
}

/** O que o painel da partida mostra. */
export interface RunHud {
  readonly phase: RunPhase;
  readonly mode: RunMode;
  readonly raios: number;
  /** Energia do raio, de 0 a 100. */
  readonly energy: number;
  readonly canDash: boolean;
  readonly hasShield: boolean;
  readonly hasMagnet: boolean;
  readonly isDashing: boolean;
  /** Bem acima da velocidade normal: turbo, raio ou impulso. É quando a tela ganha riscos de velocidade. */
  readonly isFast: boolean;
  readonly speedKmh: number;
  readonly elapsedMs: number;
  /** De 0 a 1 até a chegada; `null` na arena, que não tem chegada. */
  readonly progress: number | null;
  readonly rivalProgress: readonly number[];
  readonly position: number;
  readonly racers: number;
  readonly boss: BossHud | null;
}

/** Alvo do ataque teleguiado: um robô ou o chefão cansado. */
type Prey = { readonly kind: 'robo'; readonly enemy: Enemy } | { readonly kind: 'chefao'; readonly boss: Boss };

/**
 * A partida inteira, sem desenho nenhum.
 *
 * Recebe os comandos do Pedro a cada passo e cuida do resto: adversários,
 * raios, caixas, perigos, robôs e chefão. Por não saber nada de tela, dá
 * para testar uma fase inteira em milissegundos.
 */
export class RunSimulation implements PilotWorld {
  readonly course: Course;
  readonly runners: readonly Runner[];
  readonly player: Runner;
  readonly raios: readonly RaioPickup[];
  readonly itemBoxes: readonly ItemBox[];
  readonly hazards: readonly Hazard[];
  readonly pads: readonly Pad[];
  readonly enemies: readonly Enemy[];
  readonly boss: Boss | null;
  readonly bombs: Bomb[] = [];
  readonly waves: Wave[] = [];

  private readonly random: SeededRandom;
  private readonly pilots: ReadonlyMap<string, RunnerPilot>;
  private readonly autopilot: RunnerPilot;
  private readonly events: RunEvent[] = [];
  private readonly finishOrder: string[] = [];
  private phaseState: RunPhase = 'contagem';
  private clockMs = 0;
  private lastCountdownValue = 0;
  private prey: Prey | null = null;
  private wasBossTired = false;
  private finaleAtMs: number | null = null;

  constructor(private readonly setup: RunSetup) {
    assertModeFitsCourse(setup);

    this.course = buildCourse(setup.course);
    this.random = new SeededRandom(setup.seed ?? Date.now());

    const objects = createCourseObjects(this.course);

    this.raios = objects.raios;
    this.itemBoxes = objects.itemBoxes;
    this.hazards = objects.hazards;
    this.pads = objects.pads;
    this.enemies = objects.enemies;

    this.player = new Runner(PLAYER_RUNNER_ID, setup.playerName, handlingFor(shoe(setup.playerSetup.shoe).stats), true);

    const rivals =
      setup.mode === 'corrida'
        ? RIVALS.map((rival) => new Runner(rival.id, rival.name, handlingFor(shoe(rival.setup.shoe).stats), false))
        : [];
    const runners = [...rivals];

    runners.splice(Math.min(PLAYER_START_SLOT, runners.length), 0, this.player);
    this.runners = runners;
    this.pilots = new Map(
      rivals.map((runner, index) => [runner.id, new RunnerPilot(this, RIVAL_LANES[index % RIVAL_LANES.length], this.random)]),
    );
    this.autopilot = new RunnerPilot(this, 0, this.random, true);
    this.boss = setup.boss && setup.mode === 'batalha' ? this.createBoss(setup.boss) : null;
    this.placeOnStartLine();
  }

  get phase(): RunPhase {
    return this.phaseState;
  }

  /** Relógio da simulação desde o primeiro passo, contagem incluída. */
  get timeMs(): number {
    return this.clockMs;
  }

  /** Tempo de partida desde a largada; zero durante a contagem. */
  get elapsedMs(): number {
    return Math.max(0, this.clockMs - COUNTDOWN_MS);
  }

  get totalRaios(): number {
    return this.raios.length;
  }

  hud(): RunHud {
    const { player, boss } = this;
    const isOpen = !this.course.isCircuit;

    return {
      phase: this.phaseState,
      mode: this.setup.mode,
      raios: player.raios,
      energy: player.energy,
      canDash: player.canDash,
      hasShield: player.hasShield,
      hasMagnet: player.magnetSeconds > 0,
      isDashing: player.isDashing,
      isFast: player.speed > player.handling.maxSpeed * 1.08,
      speedKmh: Math.round(Math.max(0, player.speed) * 3.6),
      elapsedMs: player.finishTimeMs ?? this.elapsedMs,
      progress: isOpen ? this.progressOf(player) : null,
      rivalProgress: isOpen ? this.runners.filter((runner) => !runner.isPlayer).map((runner) => this.progressOf(runner)) : [],
      position: this.positionOf(player),
      racers: this.runners.length,
      boss: boss
        ? { name: boss.profile.name, hitsLeft: boss.hitsLeft, hitsNeeded: boss.hitsNeeded, isTired: boss.isVulnerable }
        : null,
    };
  }

  /** Corredores na ordem da classificação: quem chegou primeiro e, depois, quem está na frente. */
  standings(): readonly Runner[] {
    return [...this.runners].sort((first, second) => {
      const firstFinish = this.finishOrder.indexOf(first.id);
      const secondFinish = this.finishOrder.indexOf(second.id);

      if (firstFinish !== -1 || secondFinish !== -1) {
        return (firstFinish === -1 ? Infinity : firstFinish) - (secondFinish === -1 ? Infinity : secondFinish);
      }

      return second.distance - first.distance;
    });
  }

  positionOf(runner: Runner): number {
    return this.standings().indexOf(runner) + 1;
  }

  /** Entrega e esvazia a fila de acontecimentos desde a última leitura. */
  drainEvents(): readonly RunEvent[] {
    return this.events.splice(0, this.events.length);
  }

  step(input: RunInput): void {
    this.clockMs += RUN_STEP_MS;

    if (this.phaseState === 'contagem') {
      this.tickCountdown();
      return;
    }

    this.updateEnemies();
    this.updateBoss();

    for (const runner of this.runners) {
      this.moveRunner(runner, this.inputFor(runner, input));
    }

    this.resolveRunnerContacts();

    if (this.finaleAtMs !== null && this.clockMs >= this.finaleAtMs && !this.player.hasFinished) {
      this.finish(this.player);
    }
  }

  private tickCountdown(): void {
    const remaining = COUNTDOWN_MS - this.clockMs;
    const value = Math.ceil(remaining / 1000);

    if (remaining <= 0) {
      this.phaseState = 'correndo';
      this.events.push({ type: 'largada' });

      if (this.boss) {
        this.events.push({ type: 'chefe-chegou', name: this.boss.profile.name });
      }

      return;
    }

    if (value !== this.lastCountdownValue) {
      this.lastCountdownValue = value;
      this.events.push({ type: 'contagem', value });
    }
  }

  private inputFor(runner: Runner, playerInput: RunInput): RunInput {
    if (runner.isPlayer && !runner.hasFinished) {
      return this.withAutoJump(runner, playerInput);
    }

    const pilot = runner.isPlayer ? this.autopilot : this.pilots.get(runner.id);

    return pilot ? pilot.decide(runner) : playerInput;
  }

  /** No fácil, o Pedro pula sozinho na beira do buraco; o pulo dele continua valendo. */
  private withAutoJump(runner: Runner, input: RunInput): RunInput {
    if (!this.setup.tuning.autoJumpGaps || input.jump || !runner.isGrounded) {
      return input;
    }

    const lead = Math.max(0, runner.speed) * 0.12 + 0.8;

    return nextGapStart(this.course, runner.distance, lead) === null ? input : { ...input, jump: true };
  }

  private moveRunner(runner: Runner, input: RunInput): void {
    if (!runner.isPlayer) {
      runner.addEnergy(this.setup.tuning.rivalEnergyPerSecond * STEP_SECONDS);
    }

    this.handleActions(runner, input);
    runner.run(input, STEP_SECONDS, this.paceFor(runner));

    if (runner.isHoming) {
      this.followPrey(runner);
    }

    this.resolveGround(runner);

    if (!this.course.isCircuit && !runner.hasFinished && runner.distance >= this.course.goalDistance) {
      this.finish(runner);
    }

    this.touchPads(runner);
    this.touchHazards(runner);

    if (runner.isPlayer) {
      this.collectRaios(runner);
      this.touchItemBoxes(runner);
      this.touchEnemies(runner);
      this.touchBoss(runner);
      this.touchBossAttacks(runner);
    }
  }

  /**
   * Pulo, ataque e raio.
   *
   * No chão, o botão de pulo pula. No ar, ele vira o ataque teleguiado
   * quando há um alvo à frente e, sem alvo, um impulso para a frente.
   */
  private handleActions(runner: Runner, input: RunInput): void {
    if (input.jump) {
      if (runner.isGrounded) {
        if (runner.jump()) {
          this.announce(runner, { type: 'pulo' });
        }
      } else if (runner.hasAirAction) {
        const prey = runner.isPlayer ? this.findPrey(runner) : null;

        if (prey) {
          this.prey = prey;
          runner.startHoming(preyPosition(prey));
          this.announce(runner, { type: 'ataque' });
        } else if (runner.airDash()) {
          this.announce(runner, { type: 'impulso' });
        }
      }
    }

    if (input.dash && runner.startDash()) {
      this.announce(runner, { type: 'relampago' });
    }
  }

  private followPrey(runner: Runner): void {
    const prey = this.prey;
    const isStillThere = prey !== null && (prey.kind === 'robo' ? !prey.enemy.isDefeated : prey.boss.isVulnerable);

    if (!prey || !isStillThere) {
      runner.homingTarget = null;
      this.prey = null;
      return;
    }

    runner.homingTarget = preyPosition(prey);
    runner.home(runner.homingTarget, STEP_SECONDS);
  }

  private findPrey(runner: Runner): Prey | null {
    let best: Prey | null = null;
    let bestGap = Number.POSITIVE_INFINITY;

    for (const enemy of this.enemies) {
      const gap = courseGap(this.course, runner.distance, enemy.distance);

      if (!enemy.isDefeated && gap > 1 && gap < HOMING_RANGE && gap < bestGap && Math.abs(enemy.lateral - runner.lateral) < HOMING_SIDE_RANGE) {
        best = { kind: 'robo', enemy };
        bestGap = gap;
      }
    }

    const boss = this.boss;

    if (boss?.isVulnerable) {
      const gap = courseGap(this.course, runner.distance, boss.distance);

      if (gap > -2 && gap < HOMING_RANGE && gap < bestGap) {
        best = { kind: 'chefao', boss };
      }
    }

    return best;
  }

  /**
   * Chão, buraco e queda.
   *
   * Quem pisa na beira do buraco começa a cair, mas ainda volta para a pista
   * se a queda for rasa; passou do ponto, despenca e reaparece antes do
   * buraco, pronto para tentar de novo.
   */
  private resolveGround(runner: Runner): void {
    if (runner.isFalling) {
      if (runner.height <= FALL_RESPAWN_HEIGHT) {
        runner.respawnAt(this.respawnDistance(runner.distance));
        this.announce(runner, { type: 'caiu' });
      }

      return;
    }

    if (runner.isGrounded) {
      if (isOverGap(this.course, runner.distance)) {
        runner.leaveGround();
      }

      return;
    }

    if (runner.isHoming || runner.height > 0 || runner.verticalVelocity > 0) {
      return;
    }

    if (!isOverGap(this.course, runner.distance)) {
      runner.land();
    } else if (runner.height < FALL_COMMIT_HEIGHT) {
      runner.startFalling();
    }
  }

  private respawnDistance(distance: number): number {
    const gap = this.course.gaps.find((candidate) => distance >= candidate.start - 2 && distance <= candidate.end + 2);

    return Math.max(this.course.startDistance, (gap ? gap.start : distance) - RESPAWN_BEFORE_GAP);
  }

  private finish(runner: Runner): void {
    runner.finishTimeMs = this.elapsedMs;
    this.finishOrder.push(runner.id);

    if (!runner.isPlayer) {
      return;
    }

    this.phaseState = 'terminou';
    this.events.push({ type: 'chegada', result: this.resultFor(runner) });
  }

  private resultFor(runner: Runner): RunResult {
    const boss = this.boss;
    const parTimeMs = boss
      ? boss.hitsNeeded * BOSS_PAR_SECONDS_PER_HIT * 1000
      : ((this.course.goalDistance - this.course.startDistance) / PAR_SPEED) * 1000;

    return {
      mode: this.setup.mode,
      placement: this.finishOrder.length,
      racers: this.runners.length,
      timeMs: runner.finishTimeMs ?? this.elapsedMs,
      raios: runner.raios,
      totalRaios: this.totalRaios,
      enemiesDefeated: runner.enemiesDefeated,
      hitsTaken: runner.hitsTaken,
      parTimeMs: Math.round(parTimeMs),
      bossDefeated: boss?.isDefeated ?? false,
    };
  }

  private touchPads(runner: Runner): void {
    if (!runner.isGrounded) {
      return;
    }

    for (const pad of this.pads) {
      if (!this.crossed(runner, pad.distance)) {
        continue;
      }

      switch (pad.kind) {
        case 'mola':
          runner.launch(RUNNER_PHYSICS.springSpeed, 'mola');
          this.announce(runner, { type: 'mola' });
          break;
        case 'turbo':
          runner.startBoost();
          this.announce(runner, { type: 'turbo' });
          break;
        case 'rampa':
          runner.launch(RUNNER_PHYSICS.rampSpeed, 'rampa');
          runner.speed += 4;
          this.announce(runner, { type: 'rampa' });
          break;
      }

      return;
    }
  }

  private touchHazards(runner: Runner): void {
    for (const hazard of this.hazards) {
      if (hazard.brokenAtMs !== null && this.course.isCircuit && this.clockMs - hazard.brokenAtMs > BARRIER_RESPAWN_MS) {
        hazard.brokenAtMs = null;
      }

      const gap = Math.abs(courseGap(this.course, runner.distance, hazard.distance));
      const side = Math.abs(hazard.lateral - runner.lateral);

      if (hazard.kind === 'espinhos') {
        if (gap < SPIKE.halfLength && side < SPIKE.halfWidth && runner.height < SPIKE.height) {
          this.hurt(runner);
        }

        continue;
      }

      if (hazard.brokenAtMs === null && gap < BARRIER.halfLength && side < BARRIER.halfWidth && runner.height < BARRIER.height) {
        hazard.brokenAtMs = this.clockMs;

        if (!runner.isDashing) {
          runner.bump();
        }

        this.announce(runner, { type: 'batida' });
      }
    }
  }

  private collectRaios(player: Runner): void {
    const radius = player.magnetSeconds > 0 ? MAGNET_RADIUS : RAIO_RADIUS;
    const center = player.height + RUNNER_PHYSICS.centerHeight;

    for (const raio of this.raios) {
      if (raio.collectedAtMs !== null) {
        if (!this.course.isCircuit || this.clockMs - raio.collectedAtMs < RAIO_RESPAWN_MS) {
          continue;
        }

        raio.collectedAtMs = null;
      }

      const gap = courseGap(this.course, player.distance, raio.distance);

      if (Math.abs(gap) > radius || Math.hypot(gap, raio.lateral - player.lateral, raio.height - center) > radius) {
        continue;
      }

      raio.collectedAtMs = this.clockMs;
      player.raios += 1;
      player.addEnergy(ENERGY_PER_RAIO);
      this.events.push({ type: 'raio', total: player.raios });
    }
  }

  private touchItemBoxes(player: Runner): void {
    const center = player.height + RUNNER_PHYSICS.centerHeight;

    for (const box of this.itemBoxes) {
      if (box.respawnAtMs > this.clockMs) {
        continue;
      }

      const gap = courseGap(this.course, player.distance, box.distance);

      if (Math.hypot(gap, box.lateral - player.lateral, ITEM_BOX_HEIGHT - center) > ITEM_BOX_RADIUS + RUNNER_PHYSICS.radius) {
        continue;
      }

      box.respawnAtMs = this.clockMs + ITEM_BOX_RESPAWN_MS;

      const power = this.random.weighted<RunnerPower>([
        ['escudo', 4],
        ['ima', 3],
        ['energia', 3],
      ]);

      applyPower(player, power);
      this.events.push({ type: 'caixa', power });
    }
  }

  private touchEnemies(player: Runner): void {
    const center = player.height + RUNNER_PHYSICS.centerHeight;

    for (const enemy of this.enemies) {
      if (enemy.isDefeated) {
        continue;
      }

      const shape = ENEMY_SHAPES[enemy.kind];
      const gap = courseGap(this.course, player.distance, enemy.distance);

      if (Math.hypot(gap, enemy.lateral - player.lateral, enemy.height - center) > shape.radius + RUNNER_PHYSICS.radius) {
        continue;
      }

      if (!player.isAttacking) {
        this.hurt(player);
        continue;
      }

      enemy.defeatedAtMs = this.clockMs;
      player.enemiesDefeated += 1;
      player.addEnergy(ENERGY_PER_ENEMY);
      this.events.push({ type: 'inimigo-derrotado', kind: enemy.kind });

      if (!player.isGrounded) {
        player.bounce();
      }
    }
  }

  private touchBoss(player: Runner): void {
    const boss = this.boss;

    if (!boss?.isVulnerable || !player.isAttacking) {
      return;
    }

    const gap = courseGap(this.course, player.distance, boss.distance);
    const reach = Math.hypot(gap, boss.lateral - player.lateral, boss.height - (player.height + RUNNER_PHYSICS.centerHeight));

    if (reach > BOSS_RADIUS + RUNNER_PHYSICS.radius) {
      return;
    }

    const wasLastHit = boss.takeHit();

    player.bounce();
    player.addEnergy(ENERGY_PER_BOSS_HIT);
    this.prey = null;
    this.events.push({ type: 'chefe-atingido', hitsLeft: boss.hitsLeft });

    if (wasLastHit) {
      this.events.push({ type: 'chefe-derrotado' });
      this.finaleAtMs = this.clockMs + BOSS_FINALE_MS;
      this.bombs.length = 0;
      this.waves.length = 0;
    }
  }

  private touchBossAttacks(player: Runner): void {
    for (const bomb of this.bombs) {
      const isExploding = this.clockMs >= bomb.landsAtMs && this.clockMs <= bomb.endsAtMs;
      const gap = Math.abs(courseGap(this.course, player.distance, bomb.distance));

      if (isExploding && gap < BOMB.radius && Math.abs(bomb.lateral - player.lateral) < BOMB.radius && player.height < BOMB.height) {
        this.hurt(player);
      }
    }

    for (const wave of this.waves) {
      const gap = Math.abs(courseGap(this.course, player.distance, wave.distance));

      if (gap < WAVE.halfLength && player.height < WAVE.height) {
        this.hurt(player);
      }
    }
  }

  /**
   * Machucado.
   *
   * O escudo segura o golpe; sem escudo o Pedro perde parte dos raios e,
   * sem raios, tropeça. Nunca existe "fim de jogo": a fase sempre continua.
   * Os adversários só tropeçam.
   */
  private hurt(runner: Runner): void {
    if (runner.isInvulnerable) {
      return;
    }

    runner.hitsTaken += 1;

    if (!runner.isPlayer) {
      runner.stumble();
      return;
    }

    if (runner.hasShield) {
      runner.hasShield = false;
      runner.protect();
      this.events.push({ type: 'escudo-quebrou' });
      return;
    }

    if (runner.raios > 0) {
      const lost = Math.min(runner.raios, Math.max(1, Math.ceil(runner.raios * this.setup.tuning.raioLossFraction)));

      runner.raios -= lost;
      runner.speed *= 0.7;
      runner.protect();
      this.events.push({ type: 'dano', lost });
      return;
    }

    runner.stumble();
    this.events.push({ type: 'tropecou' });
  }

  private updateEnemies(): void {
    const clockSeconds = this.clockMs / 1000;

    for (const enemy of this.enemies) {
      const gap = courseGap(this.course, this.player.distance, enemy.distance);

      enemy.update(clockSeconds, STEP_SECONDS, gap, this.setup.tuning.enemySpeed);
    }
  }

  private updateBoss(): void {
    const boss = this.boss;

    for (const wave of this.waves) {
      wave.distance -= WAVE.speed * STEP_SECONDS;
    }

    removeWhere(this.bombs, (bomb) => this.clockMs > bomb.endsAtMs);
    removeWhere(this.waves, (wave) => this.clockMs > wave.endsAtMs);

    if (!boss) {
      return;
    }

    const attack = boss.update(STEP_SECONDS, this.player.distance);

    if (boss.isVulnerable && !this.wasBossTired) {
      this.events.push({ type: 'chefe-cansado' });
    }

    this.wasBossTired = boss.isVulnerable;

    if (!attack || this.player.hasFinished) {
      return;
    }

    if (attack.kind === 'bomba') {
      if (this.bombs.length >= MAX_BOMBS) {
        this.bombs.shift();
      }

      const landsAtMs = this.clockMs + BOMB.fallMs;

      this.bombs.push({
        distance: boss.distance,
        lateral: attack.lateral,
        createdAtMs: this.clockMs,
        landsAtMs,
        endsAtMs: landsAtMs + BOMB.blastMs,
      });
    } else {
      if (this.waves.length >= MAX_WAVES) {
        this.waves.shift();
      }

      this.waves.push({ distance: boss.distance, createdAtMs: this.clockMs, endsAtMs: this.clockMs + WAVE.lifetimeMs });
    }

    this.events.push({ type: 'chefe-ataque', attack: attack.kind });
  }

  private paceFor(runner: Runner): number {
    if (runner.hasFinished) {
      return FINISHED_PACE;
    }

    if (runner.isPlayer) {
      return this.setup.tuning.playerPace;
    }

    return this.setup.tuning.rivalPace * rubberBand(runner.distance - this.player.distance, this.setup.tuning);
  }

  /** Corredores que se encostam se afastam para os lados; ninguém derruba ninguém. */
  private resolveRunnerContacts(): void {
    for (let first = 0; first < this.runners.length; first += 1) {
      for (let second = first + 1; second < this.runners.length; second += 1) {
        const a = this.runners[first];
        const b = this.runners[second];
        const gap = Math.abs(courseGap(this.course, a.distance, b.distance));
        const side = b.lateral - a.lateral;

        if (gap >= RUNNER_CONTACT_LENGTH || Math.abs(side) >= RUNNER_CONTACT_WIDTH || Math.abs(a.height - b.height) > 1) {
          continue;
        }

        const push = (RUNNER_CONTACT_WIDTH - Math.abs(side)) / 2;
        const direction = side === 0 ? 1 : Math.sign(side);

        a.lateral = clamp(a.lateral - direction * push, -LATERAL_LIMIT, LATERAL_LIMIT);
        b.lateral = clamp(b.lateral + direction * push, -LATERAL_LIMIT, LATERAL_LIMIT);
      }
    }
  }

  /** Passou por cima do ponto neste passo, vindo de trás. */
  private crossed(runner: Runner, distance: number): boolean {
    return (
      courseGap(this.course, runner.previousDistance, distance) > 0 && courseGap(this.course, runner.distance, distance) <= 0
    );
  }

  private announce(runner: Runner, event: RunEvent): void {
    if (runner.isPlayer && !runner.hasFinished) {
      this.events.push(event);
    }
  }

  private progressOf(runner: Runner): number {
    const span = this.course.goalDistance - this.course.startDistance;

    return clamp((runner.distance - this.course.startDistance) / span, 0, 1);
  }

  private createBoss(id: BossId): Boss {
    const profile = bossProfile(id);
    const hitsNeeded = Math.max(2, Math.round(profile.hits * this.setup.tuning.bossHitsFactor));

    return new Boss(profile, hitsNeeded, this.setup.tuning, this.random, this.course.startDistance);
  }

  private placeOnStartLine(): void {
    const isAlone = this.runners.length === 1;

    this.runners.forEach((runner, slot) => {
      runner.placeAt(this.course.startDistance - START_BEHIND_LINE, isAlone ? 0 : START_LATERALS[slot]);
    });
  }
}

/** Fase aberta para aventura e corrida; arena fechada, com chefão, para a batalha. */
function assertModeFitsCourse(setup: RunSetup): void {
  const needsArena = setup.mode === 'batalha';

  if (needsArena !== setup.course.isCircuit) {
    throw new Error(`O modo "${setup.mode}" não combina com a fase "${setup.course.id}".`);
  }

  if (needsArena && !setup.boss) {
    throw new Error(`A batalha na arena "${setup.course.id}" precisa de um chefão.`);
  }
}

function applyPower(runner: Runner, power: RunnerPower): void {
  switch (power) {
    case 'escudo':
      runner.hasShield = true;
      return;
    case 'ima':
      runner.magnetSeconds = RUNNER_PHYSICS.magnetSeconds;
      return;
    case 'energia':
      runner.addEnergy(BOX_ENERGY);
      return;
  }
}

function preyPosition(prey: Prey): HomingTarget {
  if (prey.kind === 'robo') {
    return { distance: prey.enemy.distance, lateral: prey.enemy.lateral, height: prey.enemy.height };
  }

  return { distance: prey.boss.distance, lateral: prey.boss.lateral, height: prey.boss.height };
}

function removeWhere<TItem>(items: TItem[], shouldRemove: (item: TItem) => boolean): void {
  for (let index = items.length - 1; index >= 0; index -= 1) {
    if (shouldRemove(items[index])) {
      items.splice(index, 1);
    }
  }
}

/**
 * Elástico de corrida, o mesmo do Pedro Kart.
 *
 * Quem dispara na frente tira o pé, e quem fica muito para trás ganha um
 * fôlego: o Pedro quase sempre tem alguém por perto para ultrapassar.
 */
export function rubberBand(gapToPlayer: number, tuning: Pick<FlashTuning, 'rivalLeadLimit' | 'rivalLeadPace'>): number {
  if (gapToPlayer > tuning.rivalLeadLimit) {
    return tuning.rivalLeadPace;
  }

  if (gapToPlayer < -RIVAL_TRAILING_GAP) {
    return RIVAL_TRAILING_PACE;
  }

  return 1;
}
