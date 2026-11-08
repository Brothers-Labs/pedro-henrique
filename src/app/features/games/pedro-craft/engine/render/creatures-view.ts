import { type BufferAttribute, type BufferGeometry, Group, Mesh, MeshBasicMaterial, type Scene } from 'three';

import { buildBoxesGeometry } from '../../../pedro-maker/engine/render/voxel-geometry';
import { creatureBoxes } from '../../art/creature-models';
import type { Creature } from '../simulation/creatures';
import type { DaylightUniform } from './voxel-material';

/** Brilho fixo por direção da face, o mesmo jeito de dar volume dos blocos (sem luz calculada). */
const TOP_BRIGHTNESS = 1;
const SIDE_X_BRIGHTNESS = 0.8;
const SIDE_Z_BRIGHTNESS = 0.9;
const BOTTOM_BRIGHTNESS = 0.55;

/** Tamanho do filhote perto do adulto. */
const BABY_SCALE = 0.55;

/** O creeper chiando pisca em branco e incha um pouco até estourar: dá tempo de ver e correr. */
const FUSE_BLINK_MS = 150;
const FUSE_SWELL = 0.25;

/** O passinho de quem anda: o corpo sobe e desce de leve. */
const STEP_BOB_HEIGHT = 0.05;
const STEP_BOB_SPEED = 0.012;

interface CreatureMesh {
  readonly mesh: Mesh<BufferGeometry, MeshBasicMaterial>;
  modelKey: string;
}

/**
 * Os animais: um modelo de cubos por animal, entre a posição do passo
 * anterior e a do atual, como a câmera.
 *
 * As geometrias são feitas uma vez por tipo de animal (e por ovelha com ou sem
 * lã) e compartilhadas; um material só, tingido pela luz do dia, serve a todos.
 */
export class CreaturesView {
  private readonly root = new Group();
  private readonly material = new MeshBasicMaterial({ vertexColors: true });
  private readonly flashMaterial = new MeshBasicMaterial({ color: '#ffffff' });
  private readonly geometries = new Map<string, BufferGeometry>();
  private readonly meshes = new Map<number, CreatureMesh>();
  private elapsedMs = 0;
  private isSteady = false;

  constructor(
    scene: Scene,
    private readonly daylight: DaylightUniform,
  ) {
    scene.add(this.root);
  }

  /** `isSteady`: no modo calmo, o creeper chiando só incha, sem piscar. */
  update(creatures: readonly Creature[], alpha: number, frameMs: number, isSteady: boolean): void {
    const alive = new Set<number>();

    this.elapsedMs += frameMs;
    this.isSteady = isSteady;
    this.material.color.copy(this.daylight.value);

    for (const creature of creatures) {
      alive.add(creature.id);
      this.place(creature, alpha);
    }

    for (const [id, view] of this.meshes) {
      if (!alive.has(id)) {
        view.mesh.removeFromParent();
        this.meshes.delete(id);
      }
    }
  }

  dispose(): void {
    for (const geometry of this.geometries.values()) {
      geometry.dispose();
    }

    this.geometries.clear();
    this.meshes.clear();
    this.material.dispose();
    this.flashMaterial.dispose();
    this.root.removeFromParent();
  }

  private place(creature: Creature, alpha: number): void {
    const modelKey = `${creature.definition.id}:${creature.isCoolingDown}`;
    const view = this.meshes.get(creature.id) ?? this.create(creature, modelKey);

    if (view.modelKey !== modelKey) {
      view.mesh.geometry = this.geometry(creature, modelKey);
      view.modelKey = modelKey;
    }

    const body = creature.body;
    const isWalking = creature.mood !== 'idle' && body.isOnGround;
    const bob = isWalking ? Math.abs(Math.sin(this.elapsedMs * STEP_BOB_SPEED + creature.id)) * STEP_BOB_HEIGHT : 0;

    view.mesh.position.set(
      lerp(creature.previousX, body.x, alpha),
      lerp(creature.previousY, body.y, alpha) + bob,
      lerp(creature.previousZ, body.z, alpha),
    );
    view.mesh.rotation.y = creature.yaw;
    view.mesh.scale.setScalar((creature.isBaby ? BABY_SCALE : 1) * (1 + creature.fuseProgress * FUSE_SWELL));
    view.mesh.material = this.isFlashing(creature) ? this.flashMaterial : this.material;
  }

  private isFlashing(creature: Creature): boolean {
    return creature.fuseLeftMs !== null && !this.isSteady && Math.floor(this.elapsedMs / FUSE_BLINK_MS) % 2 === 0;
  }

  private create(creature: Creature, modelKey: string): CreatureMesh {
    const view: CreatureMesh = { mesh: new Mesh(this.geometry(creature, modelKey), this.material), modelKey };

    this.root.add(view.mesh);
    this.meshes.set(creature.id, view);

    return view;
  }

  private geometry(creature: Creature, modelKey: string): BufferGeometry {
    const cached = this.geometries.get(modelKey);

    if (cached) {
      return cached;
    }

    const geometry = buildBoxesGeometry(creatureBoxes(creature.definition, creature.isCoolingDown));

    shadeFaces(geometry);
    this.geometries.set(modelKey, geometry);

    return geometry;
  }
}

/** Escurece cada face pela direção dela: em cima mais claro, embaixo mais escuro. */
export function shadeFaces(geometry: BufferGeometry): void {
  const normals = geometry.getAttribute('normal') as BufferAttribute;
  const colors = geometry.getAttribute('color') as BufferAttribute;

  for (let vertex = 0; vertex < normals.count; vertex += 1) {
    const brightness = faceBrightness(normals.getX(vertex), normals.getY(vertex));

    colors.setXYZ(vertex, colors.getX(vertex) * brightness, colors.getY(vertex) * brightness, colors.getZ(vertex) * brightness);
  }
}

function faceBrightness(normalX: number, normalY: number): number {
  if (normalY > 0) {
    return TOP_BRIGHTNESS;
  }

  if (normalY < 0) {
    return BOTTOM_BRIGHTNESS;
  }

  return normalX !== 0 ? SIDE_X_BRIGHTNESS : SIDE_Z_BRIGHTNESS;
}

function lerp(from: number, to: number, t: number): number {
  return from + (to - from) * t;
}
