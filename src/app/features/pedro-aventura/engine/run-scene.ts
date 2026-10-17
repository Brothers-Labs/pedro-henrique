import {
  AdditiveBlending,
  BufferAttribute,
  BufferGeometry,
  Color,
  type Material,
  Matrix4,
  InstancedMesh,
  Mesh,
  MeshStandardMaterial,
  type Object3D,
  PlaneGeometry,
  Points,
  PointsMaterial,
  Quaternion,
  Vector3,
} from 'three';

import type { QualityTier } from '../../games/pedro-maker/engine/render/quality';
import type { Cosmetic } from '../models/economy.model';
import type { RegionTheme } from '../models/campaign.model';
import type { RunEvent, RunSimulation } from '../simulation/run-simulation';
import { LANE_WIDTH, laneX, type PickupKind, type PickupSpec } from '../simulation/track.model';
import type { AventuraStage } from './aventura-stage';
import { type CharacterPose, DogRig, PedroRig } from './characters';
import { disposeGeometries, MaterialLibrary } from './materials';
import { PropKit } from './props';
import { roadTexture } from './textures';

/** Só o que está perto da câmera fica visível: o resto nem é desenhado. */
const VISIBLE_BEHIND = 12;
const VISIBLE_AHEAD = 150;

const ROAD_WIDTH = LANE_WIDTH * 3 + 1.6;
const SCENERY_SPACING = 14;
const SCENERY_OFFSET = ROAD_WIDTH / 2 + 4;
const CHARACTER_SCALE = 0.86;

const CAMERA = { back: 6.4, height: 3.3, lookAhead: 7, smoothing: 6 } as const;

const UP = new Vector3(0, 1, 0);

const PICKUP_KINDS: readonly PickupKind[] = ['coin', 'gold-bar', 'diamond', 'heart', 'crown', 'turbo'];

/** Cor das faíscas de cada item pego. */
const PICKUP_SPARKS: Readonly<Record<PickupKind, { readonly color: string; readonly amount: number }>> = {
  coin: { color: '#ffd54a', amount: 6 },
  'gold-bar': { color: '#ffb300', amount: 18 },
  diamond: { color: '#7fe3ff', amount: 22 },
  heart: { color: '#ff2d55', amount: 16 },
  crown: { color: '#ffd54a', amount: 16 },
  turbo: { color: '#3fb8ff', amount: 26 },
};

/** Quanto a câmera abre no turbo: a sensação de velocidade vem daí. */
const TURBO_FOV_KICK = 9;

const PARTICLE_COUNT = 96;
const PARTICLE_LIFE_SECONDS = 0.6;

export interface RunLook {
  readonly outfit: Cosmetic;
  readonly dog: Cosmetic;
}

interface PickupBatch {
  readonly mesh: InstancedMesh;
  readonly specs: readonly PickupSpec[];
  readonly hidden: Set<number>;
}

/**
 * A corrida desenhada em 3D.
 *
 * Lê o estado da simulação a cada quadro e nunca o altera. Moedas, corações e
 * coroas são `InstancedMesh` (uma chamada de desenho por tipo); obstáculos e
 * enfeites são cópias que dividem geometria e material.
 */
export class RunScene {
  private readonly materials = new MaterialLibrary();
  private readonly kit: PropKit;
  private readonly pedro: PedroRig;
  private readonly dog: DogRig;
  private readonly obstacleViews = new Map<number, Object3D>();
  private readonly rampViews: Object3D[] = [];
  private readonly sceneryViews: Object3D[] = [];
  private readonly batches = new Map<PickupKind, PickupBatch>();
  private readonly ownGeometries: BufferGeometry[] = [];
  private readonly ownMaterials: Material[] = [];
  private readonly road: Mesh;
  private readonly ground: Mesh;
  private readonly particles: Points;
  private readonly particleVelocity = new Float32Array(PARTICLE_COUNT * 3);
  private readonly particleLife = new Float32Array(PARTICLE_COUNT);
  private readonly cameraTarget = new Vector3();
  private readonly matrix = new Matrix4();
  private readonly quaternion = new Quaternion();
  private readonly scale = new Vector3();
  private readonly position = new Vector3();
  private nextParticle = 0;
  private time = 0;
  private shakeSeconds = 0;
  private dogHeight = 0;

  constructor(
    private readonly stage: AventuraStage,
    private readonly run: RunSimulation,
    theme: RegionTheme,
    look: RunLook,
    private readonly tier: QualityTier,
    private readonly isMotionAllowed: boolean,
  ) {
    this.kit = new PropKit(this.materials, theme);
    stage.setSky({ top: theme.skyTop, bottom: theme.skyBottom, fogNear: 60, fogFar: 230, isNight: theme.isNight });

    const length = run.layout.length;
    const roadMap = roadTexture(theme.road, theme.roadLine);

    roadMap.repeat.set(1, (length + 80) / 8);
    this.ownMaterials.push(new MeshStandardMaterial({ map: roadMap, roughness: 0.85 }));
    this.road = this.addPlane(ROAD_WIDTH, length + 80, this.ownMaterials[0], length / 2 + 20, 0.01);
    this.ground = this.addPlane(400, length + 400, this.materials.standard(theme.ground, { roughness: 1 }), length / 2, 0);

    this.pedro = new PedroRig(this.materials, look.outfit.palette);
    this.dog = new DogRig(this.materials, look.dog.palette, look.dog.id !== 'rex' && look.dog.id !== 'rex-azul');
    this.pedro.root.scale.setScalar(CHARACTER_SCALE);
    this.pedro.root.rotation.y = 0;
    stage.scene.add(this.pedro.root, this.dog.root);

    this.buildTrack();
    this.particles = this.buildParticles();
    stage.camera.position.set(0, CAMERA.height, -CAMERA.back);
  }

  /** Efeitos de um evento da simulação: esconder a moeda pega, faíscas, tremida na batida. */
  handle(event: RunEvent): void {
    switch (event.type) {
      case 'coin':
      case 'gold-bar':
      case 'diamond':
      case 'heart':
      case 'crown':
      case 'turbo':
        this.hidePickup(event.type, event.pickupId);
        this.burst(PICKUP_SPARKS[event.type].color, PICKUP_SPARKS[event.type].amount);
        return;
      case 'slip':
        this.obstacleViews.get(event.obstacleId)?.removeFromParent();
        this.burst('#ffd23f', 10);
        return;
      case 'break':
        this.obstacleViews.get(event.obstacleId)?.removeFromParent();
        this.burst('#c58a4a', 18);
        return;
      case 'hit':
        this.shakeSeconds = this.isMotionAllowed ? 0.35 : 0;
        return;
      case 'ramp':
        this.burst('#3fb8ff', 14);
        return;
      default:
        return;
    }
  }

  render(frameSeconds: number): void {
    this.time += frameSeconds;

    const { player } = this.run;

    this.updateCharacters(frameSeconds);
    this.updateObstacles();
    this.updateVisibility(player.z);
    this.spinPickups(player.z);
    this.updateParticles(frameSeconds);
    this.updateCamera(frameSeconds);
    this.stage.follow(player.x, 0, player.z);
    this.stage.render();
  }

  dispose(): void {
    this.pedro.dispose();
    this.dog.dispose();

    for (const batch of this.batches.values()) {
      batch.mesh.dispose();
      batch.mesh.removeFromParent();
    }

    for (const view of [...this.obstacleViews.values(), ...this.rampViews, ...this.sceneryViews]) {
      view.removeFromParent();
    }

    disposeGeometries(this.road);
    disposeGeometries(this.ground);
    this.particles.removeFromParent();

    for (const geometry of this.ownGeometries) {
      geometry.dispose();
    }

    for (const material of this.ownMaterials) {
      if (material instanceof MeshStandardMaterial) {
        material.map?.dispose();
      }

      material.dispose();
    }

    this.kit.dispose();
    this.materials.dispose();
  }

  /* Montagem ---------------------------------------------------------------------------- */

  private addPlane(width: number, length: number, material: Material, centerZ: number, y: number): Mesh {
    const plane = new Mesh(new PlaneGeometry(width, length), material);

    plane.rotation.x = -Math.PI / 2;
    plane.position.set(0, y, centerZ);
    plane.receiveShadow = true;
    this.stage.scene.add(plane);

    return plane;
  }

  private buildTrack(): void {
    const { layout } = this.run;
    const scene = this.stage.scene;

    for (const obstacle of layout.obstacles) {
      const view = this.kit.obstacle(obstacle.kind, obstacle.id);

      view.position.set(laneX(obstacle.lane), 0, obstacle.z);
      this.obstacleViews.set(obstacle.id, view);
      scene.add(view);
    }

    for (const ramp of layout.ramps) {
      const view = this.kit.ramp();

      view.position.set(laneX(ramp.lane), 0, ramp.z);
      this.rampViews.push(view);
      scene.add(view);
    }

    for (const checkpoint of layout.checkpoints) {
      const arch = this.kit.arch(false);

      arch.position.z = checkpoint;
      this.rampViews.push(arch);
      scene.add(arch);
    }

    const finish = this.kit.arch(true);

    finish.position.z = layout.length;
    this.rampViews.push(finish);
    scene.add(finish);

    for (let z = -20, index = 0; z < layout.length + 120; z += SCENERY_SPACING, index += 1) {
      for (const side of [-1, 1]) {
        const view = this.kit.scenery(index + (side > 0 ? 1 : 0));

        view.position.set(side * (SCENERY_OFFSET + (index % 3) * 2.5), 0, z + (side > 0 ? SCENERY_SPACING / 2 : 0));
        view.rotation.y = index * 1.7;
        this.sceneryViews.push(view);
        scene.add(view);
      }
    }

    for (const kind of PICKUP_KINDS) {
      this.buildBatch(kind);
    }
  }

  private buildBatch(kind: PickupKind): void {
    const specs = this.run.layout.pickups.filter((pickup) => pickup.kind === kind);

    if (specs.length === 0) {
      return;
    }

    const geometry = this.kit.pickupGeometry(kind);
    const batch = new InstancedMesh(geometry, this.kit.pickupMaterial(kind), specs.length);

    this.ownGeometries.push(geometry);
    batch.castShadow = this.tier !== 'baixa';
    batch.frustumCulled = false;
    specs.forEach((spec, index) => {
      this.matrix.makeTranslation(laneX(spec.lane), spec.y, spec.z);
      batch.setMatrixAt(index, this.matrix);
    });
    this.batches.set(kind, { mesh: batch, specs, hidden: new Set() });
    this.stage.scene.add(batch);
  }

  private buildParticles(): Points {
    const geometry = new BufferGeometry();
    const positions = new Float32Array(PARTICLE_COUNT * 3).fill(-1000);
    const colors = new Float32Array(PARTICLE_COUNT * 3);

    geometry.setAttribute('position', new BufferAttribute(positions, 3));
    geometry.setAttribute('color', new BufferAttribute(colors, 3));

    const material = new PointsMaterial({ size: 0.22, vertexColors: true, transparent: true, blending: AdditiveBlending, depthWrite: false });
    const points = new Points(geometry, material);

    points.frustumCulled = false;
    this.ownGeometries.push(geometry);
    this.ownMaterials.push(material);
    this.stage.scene.add(points);

    return points;
  }

  /* Quadro a quadro ----------------------------------------------------------------------- */

  private updateCharacters(frameSeconds: number): void {
    const { player } = this.run;
    const phase = this.run.phase;
    const cadence = player.speed * 0.95;
    const motion = this.isMotionAllowed ? 1 : 0;

    this.pedro.root.position.set(player.x, player.y, player.z);
    this.pedro.pose(this.poseOf(), this.time, cadence, motion);
    // Escorregão na banana: o Pedro rodopia (um giro só, mesmo com movimento reduzido, porque é informação).
    this.pedro.root.rotation.y = player.slipSeconds > 0 ? (1 - player.slipSeconds / 0.8) * Math.PI * 2 : 0;

    // Rastro azul enquanto o turbo dura.
    if (player.turboSeconds > 0 && Math.floor(this.time * 30) % 3 === 0) {
      this.burst('#3fb8ff', 2);
    }

    // Pisca enquanto está invencível; sem piscar quando o movimento é reduzido.
    const isBlinking = player.invulnerableSeconds > 0 && this.isMotionAllowed && Math.floor(this.time * 10) % 2 === 0;

    this.pedro.root.visible = !isBlinking;

    // O Rex corre à esquerda, um passo atrás, e pula junto com um atraso de cachorro.
    this.dogHeight += (player.y * 0.8 - this.dogHeight) * Math.min(1, frameSeconds * 10);
    this.dog.root.position.set(player.x + 0.95, this.dogHeight, player.z - 1.1);
    this.dog.pose(phase === 'victory' ? 'victory' : phase === 'playing' ? 'run' : 'idle', this.time, cadence, motion);
  }

  private poseOf(): CharacterPose {
    const { player } = this.run;

    switch (this.run.phase) {
      case 'victory':
        return 'victory';
      case 'defeat':
        return 'defeat';
      case 'ready':
      case 'paused':
        return this.run.phase === 'ready' ? 'idle' : 'run';
      case 'playing':
        if (this.run.isSliding) {
          return 'slide';
        }

        if (!player.isGrounded) {
          return 'jump';
        }

        return player.attackSeconds > 0 ? 'attack' : 'run';
    }
  }

  private updateObstacles(): void {
    for (const obstacle of this.run.obstacles) {
      const view = this.obstacleViews.get(obstacle.spec.id);

      if (view && (obstacle.spec.kind === 'traffic-car' || obstacle.spec.kind === 'sweeper' || obstacle.spec.kind === 'animal')) {
        view.position.set(obstacle.x, 0, obstacle.z);
      }
    }
  }

  private updateVisibility(playerZ: number): void {
    const isNear = (z: number) => z > playerZ - VISIBLE_BEHIND && z < playerZ + VISIBLE_AHEAD;

    for (const views of [this.obstacleViews.values(), this.rampViews, this.sceneryViews]) {
      for (const view of views) {
        view.visible = isNear(view.position.z);
      }
    }
  }

  /** Moedas e coroas giram; só as que estão à vista são atualizadas. */
  private spinPickups(playerZ: number): void {
    const angle = this.isMotionAllowed ? this.time * 3 : 0;

    for (const [kind, batch] of this.batches) {
      if ((kind === 'heart' || kind === 'gold-bar') && !this.isMotionAllowed) {
        continue;
      }

      batch.specs.forEach((spec, index) => {
        if (batch.hidden.has(spec.id) || spec.z < playerZ - VISIBLE_BEHIND || spec.z > playerZ + VISIBLE_AHEAD) {
          return;
        }

        const bob = kind === 'heart' ? Math.sin(this.time * 4 + spec.z) * 0.12 : 0;

        this.position.set(laneX(spec.lane), spec.y + bob, spec.z);
        this.quaternion.setFromAxisAngle(UP, kind === 'heart' || kind === 'gold-bar' ? 0 : angle + spec.z);
        this.scale.setScalar(1);
        this.matrix.compose(this.position, this.quaternion, this.scale);
        batch.mesh.setMatrixAt(index, this.matrix);
      });

      batch.mesh.instanceMatrix.needsUpdate = true;
    }
  }

  private hidePickup(kind: PickupKind, pickupId: number): void {
    const batch = this.batches.get(kind);

    if (!batch) {
      return;
    }

    const index = batch.specs.findIndex((spec) => spec.id === pickupId);

    if (index < 0) {
      return;
    }

    batch.hidden.add(pickupId);
    this.matrix.makeScale(0, 0, 0);
    batch.mesh.setMatrixAt(index, this.matrix);
    batch.mesh.instanceMatrix.needsUpdate = true;
  }

  private burst(color: string, amount: number): void {
    if (!this.isMotionAllowed || this.tier === 'baixa') {
      return;
    }

    const positions = this.particles.geometry.getAttribute('position') as BufferAttribute;
    const colors = this.particles.geometry.getAttribute('color') as BufferAttribute;
    const tint = new Color(color);
    const { player } = this.run;

    for (let count = 0; count < amount; count += 1) {
      const index = this.nextParticle;

      this.nextParticle = (this.nextParticle + 1) % PARTICLE_COUNT;
      positions.setXYZ(index, player.x, player.y + 1, player.z + 0.6);
      colors.setXYZ(index, tint.r, tint.g, tint.b);
      this.particleVelocity.set([(Math.random() - 0.5) * 5, Math.random() * 5 + 1.5, (Math.random() - 0.2) * 5 + player.speed], index * 3);
      this.particleLife[index] = PARTICLE_LIFE_SECONDS;
    }

    positions.needsUpdate = true;
    colors.needsUpdate = true;
  }

  private updateParticles(frameSeconds: number): void {
    const positions = this.particles.geometry.getAttribute('position') as BufferAttribute;
    let isDirty = false;

    for (let index = 0; index < PARTICLE_COUNT; index += 1) {
      if (this.particleLife[index] <= 0) {
        continue;
      }

      this.particleLife[index] -= frameSeconds;
      this.particleVelocity[index * 3 + 1] -= 14 * frameSeconds;
      positions.setXYZ(
        index,
        positions.getX(index) + this.particleVelocity[index * 3] * frameSeconds,
        positions.getY(index) + this.particleVelocity[index * 3 + 1] * frameSeconds,
        positions.getZ(index) + this.particleVelocity[index * 3 + 2] * frameSeconds,
      );

      if (this.particleLife[index] <= 0) {
        positions.setXYZ(index, 0, -1000, 0);
      }

      isDirty = true;
    }

    if (isDirty) {
      positions.needsUpdate = true;
    }
  }

  private updateCamera(frameSeconds: number): void {
    const { player } = this.run;
    const camera = this.stage.camera;
    const isPortrait = this.stage.isPortrait;
    const back = isPortrait ? CAMERA.back + 1.6 : CAMERA.back;
    const follow = Math.min(1, frameSeconds * CAMERA.smoothing);

    const turboKick = player.turboSeconds > 0 && this.isMotionAllowed ? TURBO_FOV_KICK : 0;

    camera.fov = (isPortrait ? 74 : 62) + turboKick;
    camera.updateProjectionMatrix();

    const targetX = player.x * 0.55;
    const targetY = CAMERA.height + player.y * 0.45;

    camera.position.x += (targetX - camera.position.x) * follow;
    camera.position.y += (targetY - camera.position.y) * follow;
    camera.position.z = player.z - back;

    if (this.shakeSeconds > 0) {
      this.shakeSeconds -= frameSeconds;
      camera.position.x += (Math.random() - 0.5) * 0.25;
      camera.position.y += (Math.random() - 0.5) * 0.18;
    }

    this.cameraTarget.set(player.x * 0.75, 1.2 + player.y * 0.5, player.z + CAMERA.lookAhead);
    camera.lookAt(this.cameraTarget);
  }
}
