import type { SeededRandom } from '../../pedro-maker/levels/seeded-random';
import { courseGap, LANE_WIDTH, nextGapStart, type Course } from '../course/course-geometry';
import type { Lane } from '../models/course.model';
import type { Boss } from './boss';
import type { Enemy, Hazard } from './course-objects';
import { clamp, type RunInput, type Runner } from './runner';

/** Perigos que o chefão espalha: quem pilota precisa enxergar para desviar. */
export interface Bomb {
  readonly distance: number;
  readonly lateral: number;
  readonly createdAtMs: number;
  readonly landsAtMs: number;
  readonly endsAtMs: number;
}

export interface Wave {
  distance: number;
  readonly createdAtMs: number;
  readonly endsAtMs: number;
}

/** O que o piloto automático enxerga da fase. */
export interface PilotWorld {
  readonly course: Course;
  readonly hazards: readonly Hazard[];
  readonly enemies: readonly Enemy[];
  readonly bombs: readonly Bomb[];
  readonly waves: readonly Wave[];
  readonly boss: Boss | null;
  readonly timeMs: number;
}

const LANES: readonly Lane[] = [-1, 0, 1];
/** Um perigo bloqueia a faixa quando o centro dele fica a menos disso do centro dela. */
const LANE_BLOCK_WIDTH = 2.2;
const STEER_GAIN = 0.9;
const STEER_DEADZONE = 0.15;
const DASH_CHANCE = 0.01;
/** O chefão cansado está ao alcance de um pulo a esta distância. */
const BOSS_JUMP_GAP = 7;
const HOMING_REACH = 25;

/**
 * O piloto automático dos corredores.
 *
 * Escolhe uma faixa livre de perigos à frente e pula na beira dos buracos.
 * O caçador — que pilota o Pedro nos testes — também pula nos robôs, nas
 * ondas e no chefão cansado.
 */
export class RunnerPilot {
  constructor(
    private readonly world: PilotWorld,
    private readonly preferredLane: Lane,
    private readonly random: SeededRandom,
    private readonly isHunter = false,
  ) {}

  decide(runner: Runner): RunInput {
    const lookahead = 12 + Math.max(0, runner.speed) * 0.55;
    const targetLateral = this.chooseLane(runner, lookahead) * LANE_WIDTH;
    const offset = targetLateral - runner.lateral;
    const steer = Math.abs(offset) < STEER_DEADZONE ? 0 : clamp(offset * STEER_GAIN, -1, 1);

    return {
      steer,
      jump: this.wantsToJump(runner),
      dash: runner.canDash && this.random.chance(DASH_CHANCE),
    };
  }

  private chooseLane(runner: Runner, lookahead: number): Lane {
    const boss = this.world.boss;

    if (this.isHunter && boss?.isVulnerable) {
      return 0;
    }

    const current = nearestLane(runner.lateral);
    const blocked = new Set(LANES.filter((lane) => this.isLaneBlocked(runner, lane, lookahead)));
    const wanted = blocked.has(this.preferredLane) ? current : this.preferredLane;

    if (!blocked.has(wanted)) {
      return wanted;
    }

    const free = LANES.filter((lane) => !blocked.has(lane)).sort(
      (first, second) => Math.abs(first - current) - Math.abs(second - current),
    );

    return free[0] ?? current;
  }

  private isLaneBlocked(runner: Runner, lane: Lane, lookahead: number): boolean {
    const center = lane * LANE_WIDTH;
    const ahead = (distance: number): boolean => {
      const gap = courseGap(this.world.course, runner.distance, distance);

      return gap > -1 && gap < lookahead;
    };

    const hazardInLane = this.world.hazards.some(
      (hazard) => hazard.brokenAtMs === null && ahead(hazard.distance) && Math.abs(hazard.lateral - center) < LANE_BLOCK_WIDTH,
    );

    if (hazardInLane || !this.isHunter) {
      return hazardInLane;
    }

    return this.world.bombs.some(
      (bomb) => this.world.timeMs < bomb.endsAtMs && ahead(bomb.distance) && Math.abs(bomb.lateral - center) < LANE_BLOCK_WIDTH,
    );
  }

  private wantsToJump(runner: Runner): boolean {
    if (!runner.isGrounded) {
      return this.isHunter && runner.hasAirAction && this.hasHomingTarget(runner);
    }

    const lead = Math.max(0, runner.speed) * 0.12 + 0.8;

    if (nextGapStart(this.world.course, runner.distance, lead) !== null) {
      return true;
    }

    if (this.isHazardRightAhead(runner, lead)) {
      return true;
    }

    return this.isHunter && (this.isEnemyInReach(runner) || this.isWaveComing(runner) || this.isBossInReach(runner));
  }

  private isHazardRightAhead(runner: Runner, lead: number): boolean {
    return this.world.hazards.some((hazard) => {
      const gap = courseGap(this.world.course, runner.distance, hazard.distance);

      return hazard.brokenAtMs === null && gap > 0 && gap < lead + 1.5 && Math.abs(hazard.lateral - runner.lateral) < LANE_BLOCK_WIDTH;
    });
  }

  private isEnemyInReach(runner: Runner): boolean {
    const reach = Math.max(0, runner.speed) * 0.22 + 2;

    return this.world.enemies.some((enemy) => {
      const gap = courseGap(this.world.course, runner.distance, enemy.distance);

      return !enemy.isDefeated && gap > 0 && gap < reach && Math.abs(enemy.lateral - runner.lateral) < 2.5;
    });
  }

  private isWaveComing(runner: Runner): boolean {
    const reach = (Math.max(0, runner.speed) + 10) * 0.12 + 0.8;

    return this.world.waves.some((wave) => {
      const gap = courseGap(this.world.course, runner.distance, wave.distance);

      return this.world.timeMs < wave.endsAtMs && gap > 0 && gap < reach;
    });
  }

  private isBossInReach(runner: Runner): boolean {
    const boss = this.world.boss;

    return boss !== null && boss.isVulnerable && courseGap(this.world.course, runner.distance, boss.distance) < BOSS_JUMP_GAP;
  }

  private hasHomingTarget(runner: Runner): boolean {
    const boss = this.world.boss;

    if (boss?.isVulnerable && courseGap(this.world.course, runner.distance, boss.distance) < HOMING_REACH) {
      return true;
    }

    return this.world.enemies.some((enemy) => {
      const gap = courseGap(this.world.course, runner.distance, enemy.distance);

      return !enemy.isDefeated && gap > 1 && gap < HOMING_REACH;
    });
  }
}

function nearestLane(lateral: number): Lane {
  const lane = Math.round(lateral / LANE_WIDTH);

  if (lane < 0) {
    return -1;
  }

  return lane > 0 ? 1 : 0;
}
