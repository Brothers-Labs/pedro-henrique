import { type BufferGeometry, Group, Mesh, MeshStandardMaterial } from 'three';

import { TILE_SIZE } from '../../config/physics.config';
import type { LockedDoor, LockSystem } from '../simulation/locks';
import { disposeTree } from './dispose';
import { box, buildBoxesGeometry, type VoxelBox } from './voxel-geometry';
import type { WorldSpace } from './world-space';

/** A porta destrancada afunda no chão neste tempo. */
const DOOR_OPEN_MS = 450;
/** Cada corrente solta cai e some neste tempo. */
const CHAIN_FALL_MS = 320;
/** A alavanca vira de um lado para o outro neste tempo. */
const LEVER_FLIP_MS = 180;
/** Inclinação do bastão da alavanca: para a esquerda antes, para a direita depois de puxada. */
const LEVER_TILT = 0.65;

const GOLD = '#ffc629';
const DARK_GOLD = '#c98a06';
const STEEL = '#8d96a8';
const DARK_STEEL = '#4a5163';

/** Chave dourada de cubos, deitada de lado: argola à esquerda, haste e dentes à direita. Centro em (0, 0). */
function keyParts(): readonly VoxelBox[] {
  return [
    // Argola.
    box(-0.2, 0.12, 0, 0.26, 0.06, 0.08, GOLD),
    box(-0.2, -0.12, 0, 0.26, 0.06, 0.08, GOLD),
    box(-0.32, 0, 0, 0.06, 0.3, 0.08, GOLD),
    box(-0.08, 0, 0, 0.06, 0.3, 0.08, GOLD),
    // Haste.
    box(0.12, 0, 0, 0.36, 0.07, 0.08, GOLD),
    // Dentes.
    box(0.22, -0.08, 0, 0.05, 0.1, 0.08, DARK_GOLD),
    box(0.3, -0.1, 0, 0.05, 0.14, 0.08, DARK_GOLD),
    // Brilho.
    box(-0.26, 0.12, 0.045, 0.06, 0.03, 0.01, '#fff2b3'),
  ];
}

/** Porta de madeira de dois blocos, com a moldura de pedra e o cadeado dourado na frente. Pés em y = 0. */
function lockedDoorParts(): readonly VoxelBox[] {
  const planks: VoxelBox[] = [0, 1, 2, 3].map((index) => box(-0.3 + index * 0.2, 1, 0, 0.18, 1.86, 0.4, index % 2 === 0 ? '#7a4a2a' : '#8b5a33'));

  return [
    box(-0.46, 1, 0, 0.08, 2, 0.5, '#6b6f80'),
    box(0.46, 1, 0, 0.08, 2, 0.5, '#6b6f80'),
    box(0, 1.96, 0, 1, 0.08, 0.5, '#6b6f80'),
    ...planks,
    // Travessas de ferro.
    box(0, 1.55, 0.21, 0.84, 0.08, 0.02, DARK_STEEL),
    box(0, 0.45, 0.21, 0.84, 0.08, 0.02, DARK_STEEL),
    // Cadeado: arco de aço e corpo dourado com o buraco da chave.
    box(-0.11, 1.18, 0.25, 0.05, 0.16, 0.06, STEEL),
    box(0.11, 1.18, 0.25, 0.05, 0.16, 0.06, STEEL),
    box(0, 1.27, 0.25, 0.27, 0.05, 0.06, STEEL),
    box(0, 0.98, 0.26, 0.36, 0.28, 0.08, GOLD),
    box(0, 1.01, 0.305, 0.06, 0.08, 0.01, '#3a2a00'),
    box(0, 0.94, 0.305, 0.03, 0.08, 0.01, '#3a2a00'),
  ];
}

/** Bloco de corrente: barras de aço em cima e embaixo, e três correntes de elos penduradas entre elas. Pés em y = 0. */
function chainParts(): readonly VoxelBox[] {
  const parts: VoxelBox[] = [box(0, 0.95, 0, 1, 0.1, 0.36, DARK_STEEL), box(0, 0.05, 0, 1, 0.1, 0.36, DARK_STEEL)];

  for (const column of [-0.3, 0, 0.3]) {
    for (let link = 0; link < 4; link += 1) {
      const y = 0.2 + link * 0.2;

      if (link % 2 === 0) {
        // Elo de frente: um aro achatado.
        parts.push(box(column - 0.06, y, 0, 0.04, 0.2, 0.08, STEEL));
        parts.push(box(column + 0.06, y, 0, 0.04, 0.2, 0.08, STEEL));
        parts.push(box(column, y + 0.08, 0, 0.16, 0.04, 0.08, STEEL));
        parts.push(box(column, y - 0.08, 0, 0.16, 0.04, 0.08, STEEL));
      } else {
        // Elo de lado: uma lâmina fina, como quem vê o elo de perfil.
        parts.push(box(column, y, 0, 0.04, 0.22, 0.16, '#a9b1c2'));
      }
    }
  }

  return parts;
}

function leverBaseParts(): readonly VoxelBox[] {
  return [box(0, 0.08, 0, 0.62, 0.16, 0.4, '#6b6f80'), box(0, 0.19, 0, 0.36, 0.06, 0.3, DARK_STEEL)];
}

/** O bastão sai do pivô (em y = 0) para cima, com a bola vermelha na ponta. */
function leverStickParts(): readonly VoxelBox[] {
  return [box(0, 0.3, 0, 0.07, 0.6, 0.07, '#c9a26b'), box(0, 0.64, 0, 0.18, 0.18, 0.18, '#e5484d'), box(-0.04, 0.68, 0.09, 0.05, 0.05, 0.01, '#ffb3b5')];
}

/** Altura da porta em escala: dois blocos, ou um só quando o de cima é terreno. */
function doorHeight(door: LockedDoor): number {
  return door.ownsTop ? 1 : 0.5;
}

/**
 * Chaves, portas com cadeado, correntes e alavancas em 3D.
 *
 * São poucas por fase, então cada uma ganha a própria peça, todas dividindo
 * a mesma geometria do seu tipo. A chave gira no ar; a porta destrancada
 * afunda no chão; as correntes soltas caem uma atrás da outra; a alavanca
 * tomba para o outro lado quando é puxada.
 */
export class LockView {
  readonly root = new Group();

  private readonly material = new MeshStandardMaterial({ vertexColors: true, roughness: 0.55 });
  private readonly metal = new MeshStandardMaterial({ vertexColors: true, roughness: 0.3, metalness: 0.6, emissive: '#5a3a00', emissiveIntensity: 0.25 });
  private readonly keyModels = new Map<number, Group>();
  private readonly doorModels = new Map<number, Group>();
  private readonly chainModels = new Map<number, Group>();
  private readonly leverSticks = new Map<number, Group>();

  constructor(
    private readonly system: LockSystem,
    private readonly space: WorldSpace,
  ) {
    this.root.name = 'cadeados';

    if (system.keys.length > 0) {
      const geometry = buildBoxesGeometry(keyParts());

      for (const key of system.keys) {
        this.keyModels.set(key.id, this.place(geometry, this.metal, key.x, key.y));
      }
    }

    if (system.doors.length > 0) {
      const geometry = buildBoxesGeometry(lockedDoorParts());

      for (const door of system.doors) {
        const model = this.placeOnCell(geometry, door.cellX, door.cellY);

        // Com terreno colado em cima, a porta encolhe para caber num bloco só.
        model.scale.y = doorHeight(door);
        this.doorModels.set(door.id, model);
      }
    }

    if (system.chains.length > 0) {
      const geometry = buildBoxesGeometry(chainParts());

      for (const chain of system.chains) {
        this.chainModels.set(chain.id, this.placeOnCell(geometry, chain.cellX, chain.cellY));
      }
    }

    if (system.levers.length > 0) {
      const base = buildBoxesGeometry(leverBaseParts());
      const stick = buildBoxesGeometry(leverStickParts());

      for (const lever of system.levers) {
        const group = this.placeOnCell(base, lever.cellX, lever.cellY);
        const pivot = new Group();
        const mesh = new Mesh(stick, this.material);

        mesh.castShadow = true;
        pivot.position.y = 0.2;
        pivot.rotation.z = LEVER_TILT;
        pivot.add(mesh);
        group.add(pivot);
        this.leverSticks.set(lever.id, pivot);
      }
    }
  }

  update(now: number): void {
    const spin = now / 400;
    const bob = Math.sin(now / 320) * 0.06;

    for (const key of this.system.keys) {
      const model = this.keyModels.get(key.id);

      if (model) {
        model.visible = !key.isTaken;
        model.rotation.y = spin;
        model.position.y = this.space.y(key.y) + bob;
      }
    }

    for (const door of this.system.doors) {
      const model = this.doorModels.get(door.id);

      if (model && door.isOpen) {
        const progress = Math.min(1, (now - door.openedAt) / DOOR_OPEN_MS);

        model.scale.y = Math.max(0.001, (1 - progress) * doorHeight(door));
        model.visible = progress < 1;
      }
    }

    for (const chain of this.system.chains) {
      const model = this.chainModels.get(chain.id);

      if (model && chain.isOpen) {
        const progress = Math.min(1, Math.max(0, (now - chain.openedAt) / CHAIN_FALL_MS));

        model.position.y = this.space.y((chain.cellY + 1) * TILE_SIZE) - progress * progress * 0.9;
        model.scale.setScalar(Math.max(0.001, 1 - progress));
        model.visible = progress < 1;
      }
    }

    for (const lever of this.system.levers) {
      const pivot = this.leverSticks.get(lever.id);

      if (pivot && lever.isPulled) {
        const progress = Math.min(1, (now - lever.pulledAt) / LEVER_FLIP_MS);

        pivot.rotation.z = LEVER_TILT - progress * LEVER_TILT * 2;
      }
    }
  }

  dispose(): void {
    disposeTree(this.root);
    this.material.dispose();
    this.metal.dispose();
  }

  /** Peça com os pés no chão da célula, no meio dela. */
  private placeOnCell(geometry: BufferGeometry, cellX: number, cellY: number): Group {
    return this.place(geometry, this.material, (cellX + 0.5) * TILE_SIZE, (cellY + 1) * TILE_SIZE);
  }

  private place(geometry: BufferGeometry, material: MeshStandardMaterial, x: number, y: number): Group {
    const group = new Group();
    const mesh = new Mesh(geometry, material);

    mesh.castShadow = true;
    mesh.receiveShadow = true;
    group.add(mesh);
    group.position.set(this.space.x(x), this.space.y(y), 0);
    this.root.add(group);

    return group;
  }
}
