import {
  CanvasTexture,
  CircleGeometry,
  DoubleSide,
  Group,
  Mesh,
  MeshBasicMaterial,
  MeshStandardMaterial,
  SRGBColorSpace,
} from 'three';

import { context2d, createCanvas, darken, lighten } from '../../art/canvas';
import type { ThemePalette } from '../../art/palettes';
import { SLIDE_PHYSICS, TILE_SIZE } from '../../config/physics.config';
import type { LevelObject, LevelTheme } from '../../models/level.model';
import { CHEST_DROP_MS, type Checkpoint, type DoorKind, type TriggerSystem } from '../simulation/triggers';
import { disposeTree } from './dispose';
import { backOut, bounceOut } from './easing';
import { box, buildBoxesGeometry, type VoxelBox } from './voxel-geometry';
import { TERRAIN_DEPTH } from './voxel-mesher';
import type { WorldSpace } from './world-space';

/** Enfeites ficam atrás do plano do Pedro: nunca escondem a ação. */
const DECOR_Z = -0.95;
/** Escada e pés do escorregador ficam logo atrás do Pedro, que sobe e desce na frente deles. */
const SLIDE_FRAME_Z = -0.4;
const DOOR_Z = -0.55;
const SIGN_Z = -0.6;

const DOOR_PARTS: Readonly<Record<DoorKind, () => readonly VoxelBox[]>> = {
  wooden: woodenDoor,
  golden: goldenDoor,
  secret: secretDoor,
};

const PORTAL_SWIRL_Y = 1.33;
const PORTAL_OPEN_MS = 600;
const CHEST_DROP_HEIGHT = 8.3;
const LID_OPEN_MS = 300;

interface CheckpointModel {
  readonly checkpoint: Checkpoint;
  readonly flag: Mesh;
}

/**
 * Os objetos parados da fase — árvores, placas, portas, espinhos — e os que reagem
 * sem física: bandeira do checkpoint, portal e o baú do chefão.
 *
 * Tudo o que não se mexe vira uma malha só; o resto tem peça própria.
 */
export class PropView {
  readonly root = new Group();

  private readonly checkpoints: CheckpointModel[] = [];
  private readonly flagMaterialIdle = new MeshStandardMaterial({ color: '#b8b8c8', roughness: 0.8 });
  private readonly flagMaterialActive = new MeshStandardMaterial({ color: '#4cc94a', emissive: '#2f9e3f', emissiveIntensity: 0.6, roughness: 0.6 });
  private readonly voxelMaterial = new MeshStandardMaterial({ vertexColors: true, roughness: 0.85 });
  private readonly swirlTexture: CanvasTexture;
  private readonly portal: Group | null = null;
  private readonly swirl: Mesh | null = null;
  private chest: { readonly root: Group; readonly lid: Group } | null = null;

  constructor(
    objects: readonly LevelObject[],
    private readonly triggers: TriggerSystem,
    private readonly space: WorldSpace,
    private readonly palette: ThemePalette,
    private readonly theme: LevelTheme,
  ) {
    this.root.name = 'objetos';
    this.swirlTexture = paintSwirl();
    this.buildStatic(objects);
    this.buildCheckpoints();

    const portal = triggers.portal;

    if (portal) {
      this.portal = new Group();
      this.portal.position.set(space.x(portal.x), space.y(portal.y), -0.3);
      this.portal.add(this.voxelMesh(portalFrame()));

      this.swirl = new Mesh(
        new CircleGeometry(0.82, 36),
        new MeshBasicMaterial({ map: this.swirlTexture, transparent: true, side: DoubleSide, depthWrite: false }),
      );
      this.swirl.position.y = PORTAL_SWIRL_Y;
      this.portal.add(this.swirl);
      this.root.add(this.portal);
    }
  }

  update(now: number): void {
    this.updateCheckpoints(now);
    this.updatePortal(now);
    this.updateChest(now);
  }

  dispose(): void {
    disposeTree(this.root);
    this.flagMaterialIdle.dispose();
    this.flagMaterialActive.dispose();
    this.swirlTexture.dispose();
  }

  /** A "árvore" de cada tema: cacto no deserto, coqueiro na praia. */
  private treeModel(): readonly VoxelBox[] {
    switch (this.theme) {
      case 'deserto':
        return cactus(this.palette);
      case 'praia':
        return palm(this.palette);
      default:
        return tree(this.palette);
    }
  }

  /** Enfeites, placas e portas: nada disso se mexe, então vira uma malha só. */
  private buildStatic(objects: readonly LevelObject[]): void {
    const parts: VoxelBox[] = [];
    const at = (x: number, y: number, z: number, model: readonly VoxelBox[]): void => {
      for (const part of model) {
        parts.push({ ...part, x: part.x + x, y: part.y + y, z: part.z + z });
      }
    };

    for (const object of objects) {
      const x = object.x + 0.5;
      const y = this.space.y((object.y + 1) * TILE_SIZE);

      switch (object.type) {
        case 'cannon':
          at(x, y, 0, cannonParts());
          break;
        case 'tree':
          at(x, y, DECOR_Z, this.treeModel());
          break;
        case 'bush':
          at(x, y, DECOR_Z, bush(this.palette));
          break;
        case 'flower':
          at(x, y, DECOR_Z + 0.3, flower(this.palette));
          break;
        case 'rock':
          at(x, y, DECOR_Z, rock(this.palette));
          break;
        case 'fence':
          at(x, y, DECOR_Z, fence());
          break;
        case 'snowman':
          at(x, y, DECOR_Z, snowman());
          break;
        case 'toadstool':
          at(x, y, DECOR_Z + 0.3, toadstool());
          break;
        case 'barrel':
          at(x, y, DECOR_Z, barrel());
          break;
        case 'lamp':
          at(x, y, DECOR_Z, lamp());
          break;
        case 'grass':
          at(x, y, DECOR_Z + 0.3, grass(this.palette));
          break;
        case 'arrow':
          at(x, y, SIGN_Z, arrowSign());
          break;
        case 'crate':
          at(x, y, DECOR_Z, crate());
          break;
        case 'spikes':
          // Bloco do terreno: ocupa a célula inteira, no plano do Pedro.
          at(x, y, 0, spikes());
          break;
        case 'slide':
          at(x, y, 0, slideFrame());
          this.root.add(this.slideRamp(object.x, y));
          break;
        default:
          break;
      }
    }

    for (const sign of this.triggers.signs) {
      at(this.space.x(sign.x), this.space.y(sign.y), SIGN_Z, signPost());
    }

    for (const door of this.triggers.doors) {
      at(this.space.x(door.x), this.space.y(door.y), DOOR_Z, DOOR_PARTS[door.kind]());
    }

    if (parts.length > 0) {
      const mesh = this.voxelMesh(parts);

      mesh.receiveShadow = true;
      mesh.matrixAutoUpdate = false;
      this.root.add(mesh);
    }
  }

  private buildCheckpoints(): void {
    for (const checkpoint of this.triggers.checkpoints) {
      const group = new Group();
      const flag = new Mesh(buildBoxesGeometry([box(0.32, 0, 0, 0.62, 0.42, 0.04, '#ffffff')]), this.flagMaterialIdle);

      group.position.set(this.space.x(checkpoint.x), this.space.y(checkpoint.y), -0.35);
      group.add(this.voxelMesh(flagPole()));
      flag.position.set(0.05, 1.72, 0);
      flag.castShadow = true;
      group.add(flag);
      this.root.add(group);
      this.checkpoints.push({ checkpoint, flag });
    }
  }

  private updateCheckpoints(now: number): void {
    for (const { checkpoint, flag } of this.checkpoints) {
      flag.material = checkpoint.isActive ? this.flagMaterialActive : this.flagMaterialIdle;
      flag.rotation.y = Math.sin(now / 260 + checkpoint.x) * (checkpoint.isActive ? 0.35 : 0.12);
    }
  }

  private updatePortal(now: number): void {
    const portal = this.triggers.portal;

    if (!portal || !this.portal || !this.swirl) {
      return;
    }

    this.portal.visible = !portal.isLocked;
    this.swirl.rotation.z = -now / 250;

    const opening = portal.openedAt === null ? 1 : Math.min(1, (now - portal.openedAt) / PORTAL_OPEN_MS);
    this.portal.scale.setScalar(backOut(opening));
  }

  private updateChest(now: number): void {
    const chest = this.triggers.chest;

    if (!chest) {
      return;
    }

    if (!this.chest) {
      this.chest = this.buildChest();
    }

    const drop = Math.min(1, (now - chest.droppedAt) / CHEST_DROP_MS);
    const opened = chest.openedAt === null ? 0 : Math.min(1, (now - chest.openedAt) / LID_OPEN_MS);

    this.chest.root.position.set(this.space.x(chest.x), this.space.y(chest.groundY) + (1 - bounceOut(drop)) * CHEST_DROP_HEIGHT, 0);
    this.chest.lid.rotation.x = -opened * 1.9;
  }

  private buildChest(): { readonly root: Group; readonly lid: Group } {
    const root = new Group();
    const lid = new Group();
    const wood = '#a8662f';
    const gold = '#ffc629';

    root.add(
      this.voxelMesh([
        box(0, 0.26, 0, 0.9, 0.52, 0.6, wood),
        box(0, 0.26, 0.305, 0.94, 0.08, 0.02, gold),
        box(0, 0.4, 0.31, 0.14, 0.18, 0.03, gold),
      ]),
    );
    lid.position.set(0, 0.52, -0.3);
    lid.add(this.voxelMesh([box(0, 0.12, 0.3, 0.92, 0.24, 0.62, darken(wood, 0.1)), box(0, 0.12, 0.615, 0.94, 0.06, 0.02, gold)]));
    root.add(lid);
    this.root.add(root);

    return { root, lid };
  }

  /**
   * A rampa inclinada, numa peça própria: as caixas são sempre retas, então
   * a rampa é montada deitada e girada. O piso fica rente à rampa da física.
   */
  private slideRamp(cellX: number, groundY: number): Mesh {
    const { length, height } = SLIDE_PHYSICS;
    const span = Math.hypot(length, height);
    const geometry = buildBoxesGeometry([
      box(0, -0.05, 0, span, 0.1, 0.9, '#ff5a5a'),
      box(0, 0.12, -0.44, span, 0.34, 0.06, '#ffd23f'),
      box(0, 0.06, 0.44, span, 0.16, 0.06, '#ffd23f'),
    ]).rotateZ(-Math.atan2(height, length));
    const mesh = new Mesh(geometry, this.voxelMaterial);

    mesh.position.set(cellX + 1 + length / 2, groundY + height / 2, 0);
    mesh.castShadow = true;
    mesh.receiveShadow = true;

    return mesh;
  }

  private voxelMesh(parts: readonly VoxelBox[]): Mesh {
    const mesh = new Mesh(buildBoxesGeometry(parts), this.voxelMaterial);

    mesh.castShadow = true;

    return mesh;
  }
}

function tree(palette: ThemePalette): readonly VoxelBox[] {
  return [
    box(0, 0.8, 0, 0.34, 1.6, 0.34, palette.trunk),
    box(0, 2.0, 0, 1.7, 1.1, 1.4, palette.foliage),
    box(0, 2.8, 0, 1.1, 0.6, 1.0, lighten(palette.foliage, 0.1)),
    box(0.55, 1.6, 0.45, 0.5, 0.4, 0.5, darken(palette.foliage, 0.12)),
  ];
}

/** Coqueiro da praia: tronco inclinado em degraus e folhas abertas em cruz. */
function palm(palette: ThemePalette): readonly VoxelBox[] {
  const leaf = palette.foliage;

  return [
    box(0, 0.6, 0, 0.3, 1.2, 0.3, palette.trunk),
    box(0.12, 1.6, 0, 0.28, 0.9, 0.28, darken(palette.trunk, 0.1)),
    box(0.24, 2.4, 0, 0.26, 0.8, 0.26, palette.trunk),
    box(0.24, 2.9, 0, 2.2, 0.16, 0.5, leaf),
    box(0.24, 2.9, 0, 0.5, 0.16, 1.6, darken(leaf, 0.1)),
    box(0.24, 3.05, 0, 0.8, 0.2, 0.8, lighten(leaf, 0.12)),
    box(0.4, 2.7, 0.2, 0.22, 0.22, 0.22, '#7a4b2a'),
  ];
}

function cactus(palette: ThemePalette): readonly VoxelBox[] {
  const green = palette.foliage;

  return [
    box(0, 1.0, 0, 0.44, 2.0, 0.44, green),
    box(-0.42, 1.0, 0, 0.4, 0.24, 0.3, green),
    box(-0.54, 1.35, 0, 0.2, 0.5, 0.3, green),
    box(0.4, 1.3, 0, 0.36, 0.22, 0.3, green),
    box(0.5, 1.6, 0, 0.2, 0.4, 0.3, green),
    box(0, 2.06, 0, 0.16, 0.12, 0.16, palette.flower),
  ];
}

function bush(palette: ThemePalette): readonly VoxelBox[] {
  return [
    box(-0.25, 0.3, 0, 0.6, 0.6, 0.6, palette.foliage),
    box(0.25, 0.25, 0.05, 0.55, 0.5, 0.55, darken(palette.foliage, 0.1)),
    box(0, 0.55, 0, 0.5, 0.35, 0.5, lighten(palette.foliage, 0.1)),
  ];
}

function flower(palette: ThemePalette): readonly VoxelBox[] {
  return [
    box(0, 0.2, 0, 0.05, 0.4, 0.05, palette.foliageDark),
    box(0.08, 0.16, 0, 0.12, 0.05, 0.05, palette.foliageDark),
    box(0, 0.45, 0, 0.24, 0.14, 0.24, palette.flower),
    box(0, 0.46, 0, 0.1, 0.16, 0.1, '#ffe066'),
  ];
}

function rock(palette: ThemePalette): readonly VoxelBox[] {
  return [
    box(0, 0.2, 0, 0.7, 0.4, 0.6, palette.stone),
    box(0.15, 0.45, 0, 0.36, 0.2, 0.4, lighten(palette.stone, 0.12)),
  ];
}

function fence(): readonly VoxelBox[] {
  const wood = '#d9a066';
  const rail = darken(wood, 0.12);

  return [
    box(-0.32, 0.36, 0, 0.16, 0.72, 0.12, wood),
    box(0.32, 0.36, 0, 0.16, 0.72, 0.12, wood),
    box(-0.32, 0.76, 0, 0.1, 0.08, 0.1, lighten(wood, 0.1)),
    box(0.32, 0.76, 0, 0.1, 0.08, 0.1, lighten(wood, 0.1)),
    box(0, 0.5, 0.08, 1.0, 0.1, 0.06, rail),
    box(0, 0.26, 0.08, 1.0, 0.1, 0.06, rail),
  ];
}

function snowman(): readonly VoxelBox[] {
  const snow = '#f7fbff';

  return [
    box(0, 0.32, 0, 0.66, 0.64, 0.6, snow),
    box(0, 0.88, 0, 0.46, 0.46, 0.42, snow),
    box(0, 0.68, 0, 0.5, 0.08, 0.46, '#e8505b'),
    box(0.12, 0.62, 0.24, 0.12, 0.2, 0.04, '#e8505b'),
    box(-0.1, 0.96, 0.215, 0.06, 0.06, 0.02, '#2a2350'),
    box(0.1, 0.96, 0.215, 0.06, 0.06, 0.02, '#2a2350'),
    box(0, 0.86, 0.3, 0.08, 0.08, 0.18, '#ff8a3d'),
    box(0, 0.42, 0.305, 0.07, 0.07, 0.02, '#2a2350'),
    box(0, 0.22, 0.305, 0.07, 0.07, 0.02, '#2a2350'),
    box(0, 1.13, 0, 0.5, 0.05, 0.46, '#2a2350'),
    box(0, 1.28, 0, 0.3, 0.26, 0.28, '#2a2350'),
  ];
}

function toadstool(): readonly VoxelBox[] {
  return [
    box(0, 0.16, 0, 0.16, 0.32, 0.16, '#fff3d6'),
    box(0, 0.38, 0, 0.5, 0.16, 0.5, '#e8505b'),
    box(0, 0.5, 0, 0.3, 0.1, 0.3, '#f06a73'),
    box(-0.12, 0.47, 0.18, 0.1, 0.04, 0.1, '#ffffff'),
    box(0.14, 0.44, -0.1, 0.08, 0.04, 0.08, '#ffffff'),
  ];
}

function barrel(): readonly VoxelBox[] {
  const wood = '#a8662f';
  const band = '#5a3d2a';

  return [
    box(0, 0.4, 0, 0.56, 0.8, 0.56, wood),
    box(0, 0.4, 0, 0.64, 0.5, 0.64, lighten(wood, 0.06)),
    box(0, 0.18, 0, 0.66, 0.06, 0.66, band),
    box(0, 0.62, 0, 0.66, 0.06, 0.66, band),
    box(0, 0.81, 0, 0.46, 0.02, 0.46, darken(wood, 0.2)),
  ];
}

/** Poste de rua com a lanterna acesa no alto. */
function lamp(): readonly VoxelBox[] {
  const iron = '#3d4254';

  return [
    box(0, 0.08, 0, 0.36, 0.16, 0.36, iron),
    box(0, 1.1, 0, 0.1, 2.0, 0.1, iron),
    box(0, 2.18, 0, 0.36, 0.06, 0.36, iron),
    box(0, 2.34, 0, 0.28, 0.26, 0.28, '#ffe066'),
    box(0, 2.5, 0, 0.36, 0.06, 0.36, iron),
    box(0, 2.58, 0, 0.12, 0.1, 0.12, iron),
  ];
}

/** Tufinhos de grama de alturas diferentes, na cor das folhas do tema. */
function grass(palette: ThemePalette): readonly VoxelBox[] {
  return [
    box(-0.22, 0.12, 0, 0.08, 0.24, 0.08, palette.foliage),
    box(-0.1, 0.18, 0.06, 0.08, 0.36, 0.08, lighten(palette.foliage, 0.1)),
    box(0.04, 0.14, -0.04, 0.08, 0.28, 0.08, palette.foliageDark),
    box(0.16, 0.2, 0.04, 0.08, 0.4, 0.08, palette.foliage),
    box(0.27, 0.1, 0, 0.08, 0.2, 0.08, lighten(palette.foliage, 0.1)),
  ];
}

/** Placa com a seta apontando para a direita, o caminho do portal. */
function arrowSign(): readonly VoxelBox[] {
  const board = '#d9a066';
  const arrow = '#e8505b';

  return [
    box(0, 0.45, 0, 0.12, 0.9, 0.12, '#8a5a33'),
    box(0, 0.95, 0, 0.9, 0.5, 0.1, board),
    box(-0.1, 0.95, 0.055, 0.4, 0.12, 0.01, arrow),
    box(0.16, 0.95, 0.055, 0.12, 0.3, 0.01, arrow),
    box(0.24, 0.95, 0.055, 0.08, 0.18, 0.01, arrow),
    box(0.3, 0.95, 0.055, 0.04, 0.08, 0.01, arrow),
  ];
}

function crate(): readonly VoxelBox[] {
  const wood = '#c98a4b';
  const edge = darken(wood, 0.25);

  return [
    box(0, 0.36, 0, 0.72, 0.72, 0.72, wood),
    box(0, 0.36, 0.365, 0.72, 0.08, 0.02, edge),
    box(0, 0.04, 0.365, 0.72, 0.08, 0.02, edge),
    box(0, 0.68, 0.365, 0.72, 0.08, 0.02, edge),
    box(-0.32, 0.36, 0.365, 0.08, 0.72, 0.02, edge),
    box(0.32, 0.36, 0.365, 0.08, 0.72, 0.02, edge),
  ];
}

/**
 * Escada, patamar e o pé do meio do escorregador, a partir do pé da escada.
 * A rampa inclinada é desenhada à parte (`PropView.slideRamp`).
 */
function slideFrame(): readonly VoxelBox[] {
  const { length, height } = SLIDE_PHYSICS;
  const metal = '#3fa3f5';
  const rung = '#c9cfdd';
  const parts: VoxelBox[] = [
    box(-0.36, height / 2, SLIDE_FRAME_Z, 0.1, height, 0.1, metal),
    box(0.36, height / 2, SLIDE_FRAME_Z, 0.1, height, 0.1, metal),
    box(0, height - 0.06, 0, 1, 0.12, 0.9, '#ff5a5a'),
    box(0, height + 0.25, -0.44, 1, 0.5, 0.06, '#ffd23f'),
  ];

  for (let step = 0.5; step < height; step += 0.5) {
    parts.push(box(0, step, SLIDE_FRAME_Z, 0.72, 0.07, 0.07, rung));
  }

  // O pé do meio segura a rampa onde ela ainda está alta.
  const middleX = 0.5 + length / 3;
  const middleHeight = height * (1 - (middleX - 0.5) / length);

  parts.push(box(middleX, middleHeight / 2, SLIDE_FRAME_Z, 0.1, middleHeight, 0.1, metal));

  return parts;
}

/** Espinhos prateados em três fileiras, cobrindo a faixa toda do terreno. */
function spikes(): readonly VoxelBox[] {
  const steel = '#c9cfdd';
  const rowSpacing = TERRAIN_DEPTH / 3;
  const parts: VoxelBox[] = [box(0, 0.15, 0, 1, 0.3, TERRAIN_DEPTH, '#4b4470')];

  for (let row = -1; row <= 1; row += 1) {
    for (const x of [-0.32, 0, 0.32]) {
      const z = row * rowSpacing;

      parts.push(
        box(x, 0.42, z, 0.26, 0.24, 0.26, steel),
        box(x, 0.62, z, 0.16, 0.18, 0.16, lighten(steel, 0.1)),
        box(x, 0.78, z, 0.07, 0.16, 0.07, '#ffffff'),
      );
    }
  }

  return parts;
}

function signPost(): readonly VoxelBox[] {
  return [
    box(0, 0.45, 0, 0.12, 0.9, 0.12, '#8a5a33'),
    box(0, 0.95, 0, 0.9, 0.5, 0.1, '#d9a066'),
    box(0, 0.95, 0.055, 0.6, 0.06, 0.01, '#8a5a33'),
    box(0, 0.85, 0.055, 0.5, 0.06, 0.01, '#8a5a33'),
  ];
}

function woodenDoor(): readonly VoxelBox[] {
  return [
    box(0, 1.0, 0, 1.0, 2.0, 0.24, '#6d4127'),
    box(0, 0.92, 0.07, 0.78, 1.8, 0.14, '#b9824e'),
    box(0, 1.35, 0.15, 0.6, 0.05, 0.02, '#8f5c38'),
    box(0, 0.6, 0.15, 0.6, 0.05, 0.02, '#8f5c38'),
    box(0.26, 0.95, 0.16, 0.08, 0.08, 0.04, '#ffc629'),
  ];
}

function goldenDoor(): readonly VoxelBox[] {
  return [
    box(0, 1.0, 0, 1.0, 2.0, 0.24, '#b8860b'),
    box(0, 0.92, 0.07, 0.78, 1.8, 0.14, '#ffcf3f'),
    box(-0.13, 0.92, 0.145, 0.03, 1.8, 0.01, '#e0a800'),
    box(0.13, 0.92, 0.145, 0.03, 1.8, 0.01, '#e0a800'),
    box(0, 1.55, 0.16, 0.2, 0.2, 0.04, '#6fe3ff'),
    box(0.26, 0.95, 0.16, 0.08, 0.08, 0.04, '#ffffff'),
  ];
}

function secretDoor(): readonly VoxelBox[] {
  return [
    box(0, 1.0, 0, 1.0, 2.0, 0.24, '#5d5487'),
    box(0, 0.92, 0.07, 0.78, 1.8, 0.14, '#8e84c2'),
    box(0, 1.25, 0.15, 0.3, 0.3, 0.02, '#ffe066'),
    box(0, 1.25, 0.16, 0.12, 0.44, 0.01, '#ffe066'),
    box(0, 1.25, 0.16, 0.44, 0.12, 0.01, '#ffe066'),
  ];
}

function flagPole(): readonly VoxelBox[] {
  return [
    box(0, 0.1, 0, 0.5, 0.2, 0.5, '#9aa3b5'),
    box(0, 1.05, 0, 0.08, 1.9, 0.08, '#e6e8f0'),
    box(0, 2.04, 0, 0.16, 0.16, 0.16, '#ffc629'),
  ];
}

/** Arco de pedra do portal, alto o bastante para o Pedro passar por dentro. */
function portalFrame(): readonly VoxelBox[] {
  const stone = '#8f7bd6';
  const light = '#b9a8f5';

  return [
    box(-1.05, 1.15, 0, 0.42, 2.3, 0.6, stone),
    box(1.05, 1.15, 0, 0.42, 2.3, 0.6, stone),
    box(0, 2.45, 0, 2.52, 0.42, 0.6, stone),
    box(0, 2.72, 0, 1.4, 0.16, 0.5, light),
    box(-1.05, 0.08, 0, 0.6, 0.16, 0.7, darken(stone, 0.2)),
    box(1.05, 0.08, 0, 0.6, 0.16, 0.7, darken(stone, 0.2)),
    box(0, 2.45, 0.31, 0.3, 0.2, 0.02, '#ffe066'),
  ];
}

/** Redemoinho do portal: espiral colorida num disco, girando no jogo. */
function paintSwirl(): CanvasTexture {
  const size = 128;
  const canvas = createCanvas(size, size);
  const context = context2d(canvas);
  const center = size / 2;
  const gradient = context.createRadialGradient(center, center, 4, center, center, center);

  gradient.addColorStop(0, '#ffffff');
  gradient.addColorStop(0.35, '#b39cff');
  gradient.addColorStop(0.8, '#4fd8ff');
  gradient.addColorStop(1, 'rgba(79, 216, 255, 0)');
  context.fillStyle = gradient;
  context.beginPath();
  context.arc(center, center, center, 0, Math.PI * 2);
  context.fill();

  context.strokeStyle = 'rgba(255, 255, 255, 0.75)';
  context.lineWidth = 5;

  for (let arm = 0; arm < 3; arm += 1) {
    context.beginPath();

    for (let step = 0; step <= 40; step += 1) {
      const angle = (arm * Math.PI * 2) / 3 + step * 0.16;
      const radius = step * 1.4;
      const x = center + Math.cos(angle) * radius;
      const y = center + Math.sin(angle) * radius;

      if (step === 0) {
        context.moveTo(x, y);
      } else {
        context.lineTo(x, y);
      }
    }

    context.stroke();
  }

  const texture = new CanvasTexture(canvas);
  texture.colorSpace = SRGBColorSpace;

  return texture;
}


/** Corpo de ferro com boca escura dos dois lados e base sólida. */
function cannonParts(): readonly VoxelBox[] {
  return [
    box(0, 0.14, 0, 0.96, 0.28, 0.9, '#414956'),
    box(0, 0.62, 0, 0.94, 0.72, 0.68, '#626d7c'),
    box(0, 0.64, 0.35, 0.7, 0.46, 0.04, '#2c3440'),
    box(-0.48, 0.64, 0, 0.04, 0.48, 0.48, '#141b24'),
    box(0.48, 0.64, 0, 0.04, 0.48, 0.48, '#141b24'),
    box(0, 0.93, 0, 0.98, 0.1, 0.74, '#8b99ab'),
  ];
}
