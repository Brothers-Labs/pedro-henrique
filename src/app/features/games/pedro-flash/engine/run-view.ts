import { Group, MathUtils, Vector3 } from 'three';

import type { CharacterPalette } from '../../pedro-maker/config/character.config';
import type { QualitySettings } from '../../pedro-maker/engine/render/quality';
import { SeededRandom } from '../../pedro-maker/levels/seeded-random';
import { RIVALS, shoe, trailColor } from '../config/runner.config';
import type { FlashThemeDefinition } from '../config/theme.config';
import { createFrame, sampleFrame, worldPoint } from '../course/course-geometry';
import type { RunnerSetup } from '../models/runner.model';
import type { Runner } from '../simulation/runner';
import { COUNTDOWN_MS, RUN_STEP_MS, type RunEvent, type RunSimulation } from '../simulation/run-simulation';
import { CourseView } from './course-view';
import { placeOnCourse } from './course-mesh';
import { BossModel, EnemyModel } from './enemy-models';
import type { FlashStage } from './flash-stage';
import { RunCamera } from './run-camera';
import { RunnerModel, type RunnerLook } from './runner-model';
import { Sparks } from './sparks';

/** Acima desta fração da velocidade máxima o rastro de luz aparece. */
const TRAIL_SPEED_RATIO = 0.72;
const HIP_HEIGHT = 0.9;

export interface RunViewOptions {
  readonly look: CharacterPalette;
  readonly setup: RunnerSetup;
  readonly seed: number;
}

interface RunnerVisual {
  readonly holder: Group;
  readonly model: RunnerModel;
}

interface EnemyVisual {
  readonly holder: Group;
  readonly model: EnemyModel;
}

/**
 * O desenho da partida: lê a simulação e posiciona tudo na cena.
 *
 * Nunca muda a simulação. Entre dois passos da física, mistura a posição
 * anterior com a atual, e o Pedro corre liso mesmo numa tela de 120 Hz.
 */
export class RunView {
  private readonly course: CourseView;
  private readonly runners = new Map<string, RunnerVisual>();
  private readonly enemies: EnemyVisual[] = [];
  private readonly boss: { readonly holder: Group; readonly model: BossModel } | null;
  private readonly camera: RunCamera;
  private readonly sparks: Sparks;
  private readonly frame = createFrame();
  private readonly point = { x: 0, y: 0, z: 0 };
  private readonly position = new Vector3();
  private readonly side = new Vector3();
  private readonly trailColor: string;

  constructor(
    private readonly stage: FlashStage,
    private readonly run: RunSimulation,
    theme: FlashThemeDefinition,
    quality: QualitySettings,
    options: RunViewOptions,
  ) {
    const bossProfile = run.boss?.profile ?? null;

    this.course = new CourseView(run.course, run, theme, options.seed, quality.shadows, bossProfile?.accent ?? theme.neon);
    stage.scene.add(this.course.root);

    this.trailColor = trailColor(options.setup.trail).hex;

    for (const runner of run.runners) {
      const model = new RunnerModel(this.lookOf(runner, options));
      const holder = new Group();

      holder.add(model.root);
      stage.scene.add(holder, model.trail.mesh);
      this.runners.set(runner.id, { holder, model });
    }

    for (const enemy of run.enemies) {
      const holder = new Group();
      const model = new EnemyModel(enemy.kind);

      holder.add(model.root);
      // Os robôs olham para o Pedro, que vem de trás.
      model.root.rotation.y = Math.PI;
      stage.scene.add(holder);
      this.enemies.push({ holder, model });
    }

    if (bossProfile) {
      const holder = new Group();
      const model = new BossModel(bossProfile);

      holder.add(model.root);
      model.root.rotation.y = Math.PI;
      stage.scene.add(holder);
      this.boss = { holder, model };
    } else {
      this.boss = null;
    }

    this.sparks = new Sparks(quality.maxParticles, new SeededRandom(options.seed));
    stage.scene.add(this.sparks.points);
    this.camera = new RunCamera(stage.camera, run.course);
  }

  render(alpha: number, frameMs: number, now: number): void {
    const deltaSeconds = frameMs / 1000;
    const clockMs = this.run.timeMs + alpha * RUN_STEP_MS;

    for (const runner of this.run.runners) {
      this.placeRunner(runner, alpha, deltaSeconds, now);
    }

    this.placeEnemies(clockMs, now);
    this.placeBoss(alpha, now);
    this.course.update(this.run, clockMs);
    this.sparks.update(deltaSeconds);

    const player = this.run.player;
    const distance = MathUtils.lerp(player.previousDistance, player.distance, alpha);
    const lateral = MathUtils.lerp(player.previousLateral, player.lateral, alpha);
    const height = MathUtils.lerp(player.previousHeight, player.height, alpha);

    this.camera.update(
      {
        distance,
        lateral,
        height,
        speedRatio: Math.max(0, player.speed) / player.handling.maxSpeed,
        isDashing: player.isDashing,
      },
      Math.min(1, this.run.timeMs / COUNTDOWN_MS),
      this.stage.baseFov,
      deltaSeconds,
    );

    worldPoint(sampleFrame(this.run.course, distance, this.frame), lateral, 0, this.point);
    this.stage.follow(this.point.x, this.point.y, this.point.z);
    this.stage.render(now);
  }

  /** Faíscas para os acontecimentos que merecem comemoração na tela. */
  react(event: RunEvent): void {
    switch (event.type) {
      case 'raio':
        this.burstAtPlayer('#ffd23f', 6, 4);
        return;
      case 'caixa':
        this.burstAtPlayer('#a678ff', 20, 6);
        return;
      case 'relampago':
        this.burstAtPlayer(this.trailColor, 30, 9);
        return;
      case 'dano':
      case 'escudo-quebrou':
        this.burstAtPlayer('#ff4d4d', 18, 6);
        return;
      case 'inimigo-derrotado':
        this.burstAtPlayer('#ff9d2e', 26, 8);
        return;
      case 'chefe-atingido':
        this.burstAtBoss('#ffffff', 40, 10);
        return;
      case 'chefe-derrotado':
        this.burstAtBoss('#ff7a1a', 140, 16);
        return;
      default:
        return;
    }
  }

  dispose(): void {
    this.course.dispose();
    this.sparks.dispose();

    for (const { holder, model } of this.runners.values()) {
      model.dispose();
      holder.removeFromParent();
    }

    for (const { holder, model } of this.enemies) {
      model.dispose();
      holder.removeFromParent();
    }

    this.boss?.model.dispose();
    this.boss?.holder.removeFromParent();
    this.runners.clear();
  }

  private placeRunner(runner: Runner, alpha: number, deltaSeconds: number, now: number): void {
    const visual = this.runners.get(runner.id);

    if (!visual) {
      return;
    }

    const distance = MathUtils.lerp(runner.previousDistance, runner.distance, alpha);
    const lateral = MathUtils.lerp(runner.previousLateral, runner.lateral, alpha);
    const height = MathUtils.lerp(runner.previousHeight, runner.height, alpha);
    const frame = sampleFrame(this.run.course, distance, this.frame);
    const isBlinking = runner.invulnerableSeconds > 0 && !runner.isDashing && Math.floor(now / 80) % 2 === 0;
    const isTrailShown = runner.isDashing || runner.boostSeconds > 0 || runner.speed > runner.handling.maxSpeed * TRAIL_SPEED_RATIO;

    placeOnCourse(visual.holder, frame, lateral, height);
    visual.model.update(
      {
        speed: runner.speed,
        maxSpeed: runner.handling.maxSpeed,
        steer: runner.steer,
        lateralVelocity: runner.lateralVelocity,
        isGrounded: runner.isGrounded,
        isFalling: runner.isFalling,
        airStyle: runner.airStyle,
        isHoming: runner.isHoming,
        isDashing: runner.isDashing,
        isBoosting: runner.boostSeconds > 0,
        isStumbling: runner.isStumbling,
        isBlinking,
        hasShield: runner.hasShield,
        hasMagnet: runner.magnetSeconds > 0,
      },
      deltaSeconds,
      now,
    );

    worldPoint(frame, lateral, height + HIP_HEIGHT, this.point);
    this.position.set(this.point.x, this.point.y, this.point.z);
    this.side.set(frame.rightX, frame.rightY, frame.rightZ);
    visual.model.trail.push(this.position, this.side, isTrailShown && !runner.isFalling);
  }

  private placeEnemies(clockMs: number, now: number): void {
    this.run.enemies.forEach((enemy, index) => {
      const visual = this.enemies[index];

      placeOnCourse(visual.holder, sampleFrame(this.run.course, enemy.distance, this.frame), enemy.lateral, enemy.height);
      visual.model.update(now, enemy.phase, enemy.defeatedAtMs === null ? null : clockMs - enemy.defeatedAtMs);
    });
  }

  private placeBoss(alpha: number, now: number): void {
    const boss = this.run.boss;

    if (!boss || !this.boss) {
      return;
    }

    const frame = sampleFrame(this.run.course, MathUtils.lerp(boss.previousDistance, boss.distance, alpha), this.frame);

    placeOnCourse(
      this.boss.holder,
      frame,
      MathUtils.lerp(boss.previousLateral, boss.lateral, alpha),
      MathUtils.lerp(boss.previousHeight, boss.height, alpha),
    );
    this.boss.model.update(boss.phase, now);
  }

  private burstAtPlayer(color: string, count: number, speed: number): void {
    const player = this.run.player;

    worldPoint(sampleFrame(this.run.course, player.distance, this.frame), player.lateral, player.height + HIP_HEIGHT, this.point);
    this.position.set(this.point.x, this.point.y, this.point.z);
    this.sparks.burst(this.position, color, count, speed);
  }

  private burstAtBoss(color: string, count: number, speed: number): void {
    const boss = this.run.boss;

    if (!boss) {
      return;
    }

    worldPoint(sampleFrame(this.run.course, boss.distance, this.frame), boss.lateral, boss.height, this.point);
    this.position.set(this.point.x, this.point.y, this.point.z);
    this.sparks.burst(this.position, color, count, speed);
  }

  private lookOf(runner: Runner, options: RunViewOptions): RunnerLook {
    if (runner.isPlayer) {
      return { palette: options.look, shoeColor: shoe(options.setup.shoe).color, trailColor: this.trailColor };
    }

    const rival = RIVALS.find((candidate) => candidate.id === runner.id);

    if (!rival) {
      throw new Error(`Corredor "${runner.id}" não existe na lista de adversários.`);
    }

    return { palette: rival.look, shoeColor: shoe(rival.setup.shoe).color, trailColor: trailColor(rival.setup.trail).hex };
  }
}
