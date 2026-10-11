import { THEME_PALETTES } from '../../art/palettes';
import type { CharacterPalette } from '../../config/character.config';
import { seedFromText } from '../../levels/seeded-random';
import type { Boss } from '../simulation/boss';
import type { Enemy } from '../simulation/enemy';
import { STEP_MS, type GameSimulation } from '../simulation/game-simulation';
import { bottom, centerX, type PhysicsBody } from '../simulation/physics-body';
import type { VisualEvent } from '../simulation/visual-events';
import { BlockView } from './block-view';
import { CameraRig } from './camera-rig';
import { CollectibleView } from './collectible-view';
import { FireballView } from './fireball-view';
import { LabelLayer, type WorldLabel } from './label-layer';
import { BossModel } from './models/boss-model';
import { EnemyMaterials, EnemyModel } from './models/enemy-model';
import { PedroModel } from './models/pedro-model';
import { ParticleSystem } from './particle-system';
import { PropView } from './prop-view';
import type { QualitySettings } from './quality';
import { SceneryView } from './scenery-view';
import type { Stage } from './stage';
import { TerrainView } from './terrain-view';
import { VoxelAtlasTexture } from './voxel-atlas-texture';
import { WorldSpace } from './world-space';

export interface LevelViewOptions {
  readonly character: CharacterPalette;
  readonly petEmoji: string | null;
  readonly effectsEnabled: boolean;
  readonly isTouch: boolean;
}

/** Tempo de montagem por fatia antes de devolver a vez à página. */
const BUILD_BUDGET_MS = 12;

const CELEBRATION_MS = 900;
const HINT_FADE_RATE = 7;
const BOSS_ZOOM = 1.14;
const FLASH_MS = 240;

/**
 * A fase desenhada em 3D, sincronizada com a simulação a cada quadro.
 *
 * A simulação anda em passos fixos de 1/60 s; a tela pode desenhar mais vezes
 * que isso (celulares de 120 Hz). Entre dois passos, tudo o que se move é
 * desenhado no ponto intermediário (`alpha`), e o movimento fica liso.
 */
export class LevelView {
  private readonly space: WorldSpace;
  private readonly atlas: VoxelAtlasTexture;
  private readonly terrain: TerrainView;
  private readonly camera: CameraRig;
  private readonly labels: LabelLayer;
  private readonly flash: HTMLDivElement;
  private readonly enemyMaterials = new EnemyMaterials();
  private readonly enemyModels = new Map<number, EnemyModel>();
  private readonly seenEnemies = new Set<number>();
  private readonly hintLabels = new Map<number, WorldLabel>();
  private readonly signLabels = new Map<number, WorldLabel>();

  private scenery: SceneryView | null = null;
  private blocks: BlockView | null = null;
  private collectibles: CollectibleView | null = null;
  private fireballs: FireballView | null = null;
  private props: PropView | null = null;
  private pedro: PedroModel | null = null;
  private particles: ParticleSystem | null = null;
  private bossModel: BossModel | null = null;
  private promptLabel: WorldLabel | null = null;
  private petLabel: WorldLabel | null = null;
  private hasFramed = false;

  constructor(
    private readonly stage: Stage,
    private readonly simulation: GameSimulation,
    private readonly options: LevelViewOptions,
    overlayParent: HTMLElement,
  ) {
    const { grid } = simulation;

    this.space = new WorldSpace(grid.heightPx);
    this.atlas = new VoxelAtlasTexture(THEME_PALETTES[simulation.blueprint.theme]);
    this.terrain = new TerrainView(grid, this.atlas, stage.qualitySettings.terrainShadows);
    this.camera = new CameraRig(stage.camera, grid.width, options.isTouch);
    this.labels = new LabelLayer(overlayParent);
    this.flash = document.createElement('div');
    this.flash.style.cssText = 'position:absolute;inset:0;background:#ffffff;opacity:0;pointer-events:none;';
    overlayParent.appendChild(this.flash);
  }

  /** Monta a fase em fatias, contando o progresso de 0 a 1. */
  async build(onProgress: (progress: number) => void): Promise<void> {
    const simulation = this.simulation;
    const blueprint = simulation.blueprint;
    const palette = THEME_PALETTES[blueprint.theme];
    const scene = this.stage.scene;
    const steps: (() => void)[] = [];

    for (let chunk = 0; chunk < this.terrain.chunkCount; chunk += 1) {
      steps.push(() => this.terrain.buildChunk(chunk));
    }

    steps.push(
      () => {
        this.terrain.buildPlanks();
        scene.add(this.terrain.root);
      },
      () => {
        this.scenery = new SceneryView(simulation.grid, palette, seedFromText(blueprint.id));
        scene.add(this.scenery.root);
      },
      () => {
        this.blocks = new BlockView(simulation.blocks, this.atlas, this.space);
        this.collectibles = new CollectibleView(simulation.collectibles, this.space);
        this.fireballs = new FireballView(simulation.fireballs, this.space);
        scene.add(this.blocks.root, this.collectibles.root, this.fireballs.root);
      },
      () => {
        this.props = new PropView(blueprint.objects, simulation.triggers, this.space, palette, blueprint.theme);
        scene.add(this.props.root);
      },
      () => {
        this.pedro = new PedroModel(this.options.character);
        this.particles = new ParticleSystem(this.stage.qualitySettings.maxParticles);
        scene.add(this.pedro.root, this.particles.mesh);
        this.createLabels();
      },
    );

    let next = 0;

    while (next < steps.length) {
      const startedAt = performance.now();

      while (next < steps.length && performance.now() - startedAt < BUILD_BUDGET_MS) {
        steps[next]();
        next += 1;
      }

      onProgress(next / steps.length);

      if (next < steps.length) {
        await yieldToBrowser();
      }
    }
  }

  applyQuality(settings: QualitySettings): void {
    this.particles?.limit(settings.maxParticles);
  }

  /** Desenha um quadro. `alpha` é quanto já se passou do próximo passo da física (0 a 1). */
  render(alpha: number, frameMs: number): void {
    const pedro = this.pedro;

    if (!pedro) {
      return;
    }

    const simulation = this.simulation;
    const now = simulation.clockMs + alpha * STEP_MS;
    const deltaSeconds = Math.min(0.05, frameMs / 1000);

    this.playEffects(simulation.effects.drain(), now);

    const player = simulation.player;
    const body = player.body;
    const playerX = this.space.x(lerp(body.previousX, body.x, alpha) + body.width / 2);
    const playerY = this.space.y(lerp(body.previousY, body.y, alpha) + body.height);

    pedro.update(
      {
        mode: player.mode,
        facing: player.facing,
        speedX: body.vx,
        isGrounded: body.blockedDown,
        isBlinking: player.isActive && player.isInvincible(now) && Math.floor(now / 90) % 2 === 0,
        hasShield: player.hasShield,
        hasWings: player.hasPowerUp('wings'),
        isBig: player.isBig,
        hasStar: player.hasPowerUp('star'),
        hasFireFlower: player.hasPowerUp('fire-flower'),
      },
      deltaSeconds,
      now,
    );

    const celebration = player.celebration;

    if (celebration) {
      const progress = Math.min(1, (now - celebration.startedAt) / CELEBRATION_MS);
      const eased = progress * progress * progress;

      pedro.root.position.set(
        lerp(this.space.x(celebration.fromX), this.space.x(celebration.toX), eased),
        lerp(this.space.y(celebration.fromY), this.space.y(celebration.toY), eased),
        0,
      );
      pedro.celebrate(progress);
    } else {
      pedro.root.position.set(playerX, playerY, 0);
    }

    this.stage.playerLight?.position.set(playerX, playerY + 1.6, 2.2);

    this.syncEnemies(alpha, deltaSeconds, now);
    this.syncBoss(alpha, deltaSeconds, now);
    this.blocks?.update(now, alpha);
    this.collectibles?.update(now);
    this.fireballs?.update(now, alpha);
    this.props?.update(now);
    this.scenery?.update(deltaSeconds);
    this.particles?.update(deltaSeconds);
    this.updateLabels(playerX, playerY, player.facing, deltaSeconds, now);

    const boss = simulation.boss;
    this.camera.setZoom(boss?.isAwake ? BOSS_ZOOM : 1);

    if (this.hasFramed) {
      this.camera.update(deltaSeconds, now, playerX, playerY + 0.7, player.facing);
    } else {
      this.camera.snapTo(playerX, playerY + 0.7, player.facing);
      this.hasFramed = true;
    }

    this.stage.follow(this.camera.x, this.camera.y);
    this.labels.update(this.stage.camera, now);
    this.stage.render();
  }

  dispose(): void {
    this.terrain.dispose();
    this.scenery?.dispose();
    this.blocks?.dispose();
    this.collectibles?.dispose();
    this.fireballs?.dispose();
    this.props?.dispose();
    this.pedro?.dispose();
    this.particles?.dispose();
    this.bossModel?.dispose();

    for (const model of this.enemyModels.values()) {
      model.dispose();
    }

    this.enemyModels.clear();
    this.enemyMaterials.dispose();
    this.atlas.dispose();
    this.labels.dispose();
    this.flash.remove();
  }

  private playEffects(events: readonly VisualEvent[], now: number): void {
    for (const event of events) {
      switch (event.type) {
        case 'burst':
          if (this.options.effectsEnabled) {
            this.particles?.burst(event.kind, this.space.x(event.x), this.space.y(event.y), event.count);
          }
          break;
        case 'floating-text':
          this.labels.float(this.space.x(event.x), this.space.y(event.y), event.text, event.color, now);
          break;
        case 'shake':
          if (this.options.effectsEnabled) {
            this.camera.shake(event.intensity, now);
          }
          break;
        case 'flash':
          this.flash.animate([{ opacity: 0.8 }, { opacity: 0 }], { duration: FLASH_MS, easing: 'ease-out' });
          // Depois de uma porta ou de voltar ao checkpoint, a câmera pula junto em vez de viajar.
          this.hasFramed = false;
          break;
        case 'coin-fountain':
          this.collectibles?.addFountain(event.x, event.y, event.count, now);
          break;
      }
    }
  }

  private syncEnemies(alpha: number, deltaSeconds: number, now: number): void {
    const seen = this.seenEnemies;

    seen.clear();

    for (const enemy of this.simulation.enemies) {
      let model = this.enemyModels.get(enemy.id);

      if (!model) {
        model = new EnemyModel(enemy.kind, this.enemyMaterials, enemy.scale);
        this.enemyModels.set(enemy.id, model);
        this.stage.scene.add(model.root);
      }

      seen.add(enemy.id);
      this.placeEnemy(enemy, model, alpha);
      model.update(
        {
          kind: enemy.kind,
          direction: enemy.direction,
          isDefeated: enemy.isDefeated,
          defeatedAt: enemy.defeatedAt,
          isHidden: enemy.isHidden,
          emergence: enemy.emergence,
          isMoving: Math.abs(enemy.body.vx) > 1,
        },
        deltaSeconds,
        now,
      );
    }

    for (const [id, model] of this.enemyModels) {
      if (!seen.has(id)) {
        model.dispose();
        this.enemyModels.delete(id);
      }
    }
  }

  private placeEnemy(enemy: Enemy, model: EnemyModel, alpha: number): void {
    const body = enemy.body;
    const x = this.space.x(interpolatedCenterX(body, alpha));
    // O morcego é desenhado a partir do centro; os outros, a partir dos pés.
    const pixelY = enemy.kind === 'bat' ? interpolatedCenterY(body, alpha) : lerp(body.previousY, body.y, alpha) + body.height;

    model.root.position.set(x, this.space.y(pixelY), 0);
  }

  private syncBoss(alpha: number, deltaSeconds: number, now: number): void {
    const boss: Boss | null = this.simulation.boss;

    if (!boss) {
      this.bossModel?.dispose();
      this.bossModel = null;
      return;
    }

    if (!this.bossModel) {
      this.bossModel = new BossModel(boss.definition);
      this.stage.scene.add(this.bossModel.root);
    }

    const body = boss.body;

    this.bossModel.root.position.set(
      this.space.x(interpolatedCenterX(body, alpha)),
      this.space.y(lerp(body.previousY, body.y, alpha) + body.height),
      0,
    );
    this.bossModel.update(
      { mode: boss.mode, modeStartedAt: boss.modeStartedAt, direction: boss.direction, isGrounded: body.blockedDown },
      deltaSeconds,
      now,
    );
  }

  private createLabels(): void {
    const { triggers } = this.simulation;

    for (const hint of triggers.hints) {
      const label = this.labels.create('hint', hint.text);

      label.position.set(this.space.x(hint.x), this.space.y(hint.y), 1);
      label.opacity = 0;
      this.hintLabels.set(hint.id, label);
    }

    for (const sign of triggers.signs) {
      const label = this.labels.create('bubble', sign.text, true);

      label.position.set(this.space.x(sign.x), this.space.y(sign.y) + 1.4, -0.6);
      this.signLabels.set(sign.id, label);
    }

    this.promptLabel = this.labels.create('prompt', this.options.isTouch ? 'AÇÃO' : 'E', true);

    if (this.options.petEmoji) {
      const pet = this.labels.create('pet', this.options.petEmoji);
      const body = this.simulation.player.body;

      pet.visible = true;
      pet.position.set(this.space.x(centerX(body)) - 1, this.space.y(bottom(body)) + 1.6, 0.4);
      this.petLabel = pet;
    }
  }

  private updateLabels(playerX: number, playerY: number, facing: number, deltaSeconds: number, now: number): void {
    const { triggers } = this.simulation;
    const fade = 1 - Math.exp(-HINT_FADE_RATE * deltaSeconds);

    for (const hint of triggers.hints) {
      const label = this.hintLabels.get(hint.id);

      if (label) {
        label.opacity = lerp(label.opacity, hint.isNear && !hint.isDone ? 1 : 0, fade);
        label.visible = label.opacity > 0.01;
      }
    }

    for (const sign of triggers.signs) {
      const label = this.signLabels.get(sign.id);

      if (label) {
        label.visible = sign.isNear;
      }
    }

    const prompt = this.promptLabel;
    const door = triggers.nearDoor;

    if (prompt) {
      prompt.visible = door !== null && !this.simulation.isFinished;

      if (door) {
        prompt.position.set(this.space.x(door.x), this.space.y(door.y) + 2.5, 0);
      }
    }

    const pet = this.petLabel;

    if (pet) {
      const follow = 1 - Math.exp(-6 * deltaSeconds);
      const bob = Math.sin(now / 260) * 0.12;

      pet.position.x = lerp(pet.position.x, playerX - facing * 0.95, follow);
      pet.position.y = lerp(pet.position.y, playerY + 1.6 + bob, follow);
    }
  }
}

function lerp(from: number, to: number, amount: number): number {
  return from + (to - from) * amount;
}

function interpolatedCenterX(body: PhysicsBody, alpha: number): number {
  return lerp(body.previousX, body.x, alpha) + body.width / 2;
}

function interpolatedCenterY(body: PhysicsBody, alpha: number): number {
  return lerp(body.previousY, body.y, alpha) + body.height / 2;
}

/** Devolve a vez à página por um instante: a barra de carregamento pode andar. */
function yieldToBrowser(): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, 0));
}
