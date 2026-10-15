import {
  CylinderGeometry,
  Group,
  Mesh,
  type MeshStandardMaterial,
  type Object3D,
  PlaneGeometry,
  Raycaster,
  TorusGeometry,
  Vector2,
  Vector3,
} from 'three';

import { REGIONS } from '../config/regions.config';
import type { RegionId, RegionStatus } from '../models/campaign.model';
import type { AventuraStage } from './aventura-stage';
import { disposeGeometries, MaterialLibrary } from './materials';
import { PropKit } from './props';

/** Onde cada região fica no oceano, inspirado no mock do mapa. */
const ISLAND_POSITIONS: Readonly<Record<RegionId, { readonly x: number; readonly z: number }>> = {
  'ilha-inicial': { x: -17, z: 3 },
  'zona-urbana': { x: -4, z: 8 },
  'montanha-radical': { x: -8, z: -7 },
  'cidade-do-luxo': { x: 8, z: -8 },
  'deserto-xtreme': { x: 18, z: 0 },
  'eventos-especiais': { x: 9, z: 9 },
};

const ISLAND_RADIUS = 5.2;
const ISLAND_HEIGHT = 1.4;
const CAMERA_POSITION = new Vector3(0, 25, 23);
const CAMERA_TARGET = new Vector3(0, 0, 1);
/** Um toque que andou mais que isso foi arrasto, não escolha. */
const TAP_TOLERANCE_PX = 10;

interface Island {
  readonly regionId: RegionId;
  readonly root: Group;
  readonly base: Mesh;
  readonly ring: Mesh;
  readonly openMaterial: MeshStandardMaterial;
}

/**
 * O mapa da aventura em 3D.
 *
 * As ilhas são escolhidas pelo toque (raio da câmera até a ilha). Os rótulos
 * são elementos da página que a cena reposiciona a cada quadro direto no
 * estilo, fora do Angular: mover seis etiquetas não pode custar uma detecção
 * de mudanças por quadro.
 */
export class MapScene {
  private readonly materials = new MaterialLibrary();
  private readonly kits: PropKit[] = [];
  private readonly islands: Island[] = [];
  private readonly world = new Group();
  private readonly raycaster = new Raycaster();
  private readonly pointer = new Vector2();
  private readonly projected = new Vector3();
  private readonly lockedMaterial: MeshStandardMaterial;
  private pressedAt: { x: number; y: number } | null = null;
  private time = 0;

  constructor(
    private readonly stage: AventuraStage,
    private readonly labels: ReadonlyMap<RegionId, HTMLElement>,
    private readonly onSelect: (regionId: RegionId) => void,
    private readonly isMotionAllowed: boolean,
  ) {
    this.lockedMaterial = this.materials.standard('#8a90a0', { roughness: 0.95 });
    stage.setSky({ top: '#1d3b78', bottom: '#f3a65a', fogNear: 60, fogFar: 140, isNight: false });
    stage.camera.fov = stage.isPortrait ? 70 : 48;
    stage.camera.position.copy(CAMERA_POSITION);
    stage.camera.lookAt(CAMERA_TARGET);
    stage.camera.updateProjectionMatrix();

    const ocean = new Mesh(new PlaneGeometry(220, 220), this.materials.standard('#0b5fa5', { metalness: 0.2, roughness: 0.55, emissive: '#06325c', emissiveIntensity: 0.45 }));

    ocean.rotation.x = -Math.PI / 2;
    ocean.receiveShadow = true;
    this.world.add(ocean);

    for (const region of REGIONS) {
      this.islands.push(this.buildIsland(region.id));
    }

    stage.scene.add(this.world);

    const canvas = stage.renderer.domElement;

    canvas.addEventListener('pointerdown', this.handlePointerDown);
    canvas.addEventListener('pointerup', this.handlePointerUp);
  }

  setStatuses(statuses: ReadonlyMap<RegionId, RegionStatus>, selected: RegionId | null): void {
    for (const island of this.islands) {
      const isOpen = statuses.get(island.regionId) === 'unlocked';

      island.base.material = isOpen ? island.openMaterial : this.lockedMaterial;
      island.ring.visible = island.regionId === selected;
    }
  }

  render(frameSeconds: number): void {
    this.time += frameSeconds;

    for (const [index, island] of this.islands.entries()) {
      island.root.position.y = this.isMotionAllowed ? Math.sin(this.time * 0.8 + index) * 0.12 : 0;
      island.ring.rotation.z = this.time * 0.6;
    }

    this.placeLabels();
    this.stage.follow(0, 0, 0);
    this.stage.render();
  }

  dispose(): void {
    const canvas = this.stage.renderer.domElement;

    canvas.removeEventListener('pointerdown', this.handlePointerDown);
    canvas.removeEventListener('pointerup', this.handlePointerUp);
    disposeGeometries(this.world);

    for (const kit of this.kits) {
      kit.dispose();
    }

    this.materials.dispose();
  }

  private buildIsland(regionId: RegionId): Island {
    const region = REGIONS.find((candidate) => candidate.id === regionId);
    const theme = region?.theme ?? REGIONS[0].theme;
    const kit = new PropKit(this.materials, theme);
    const position = ISLAND_POSITIONS[regionId];
    const root = new Group();
    const openMaterial = this.materials.standard(theme.ground, { roughness: 0.9 });
    const base = new Mesh(new CylinderGeometry(ISLAND_RADIUS, ISLAND_RADIUS + 1.2, ISLAND_HEIGHT, 9), openMaterial);

    this.kits.push(kit);
    base.position.y = ISLAND_HEIGHT / 2 - 0.3;
    base.castShadow = true;
    base.receiveShadow = true;
    base.userData = { regionId };
    root.add(base);

    // Três marcos do tema em cima da ilha, menores que na pista.
    for (let index = 0; index < 3; index += 1) {
      const landmark = kit.scenery(index);
      const angle = (index / 3) * Math.PI * 2 + 0.6;

      landmark.scale.setScalar(regionId === 'cidade-do-luxo' || regionId === 'zona-urbana' ? 0.32 : 0.55);
      landmark.position.set(Math.cos(angle) * 2.4, ISLAND_HEIGHT - 0.3, Math.sin(angle) * 2.4);
      root.add(landmark);
    }

    const ring = new Mesh(new TorusGeometry(ISLAND_RADIUS + 2, 0.18, 8, 56), this.materials.neon('#f5c542', 2.4));

    ring.rotation.x = Math.PI / 2;
    ring.position.y = 0.12;
    ring.visible = false;
    root.add(ring);

    root.position.set(position.x, 0, position.z);
    this.world.add(root);

    return { regionId, root, base, ring, openMaterial };
  }

  private placeLabels(): void {
    const canvas = this.stage.renderer.domElement;
    const width = canvas.clientWidth;
    const height = canvas.clientHeight;

    for (const island of this.islands) {
      const label = this.labels.get(island.regionId);

      if (!label) {
        continue;
      }

      this.projected.set(island.root.position.x, ISLAND_HEIGHT + 3, island.root.position.z).project(this.stage.camera);

      const x = ((this.projected.x + 1) / 2) * width;
      const y = ((1 - this.projected.y) / 2) * height;

      label.style.transform = `translate(-50%, -100%) translate(${x.toFixed(1)}px, ${y.toFixed(1)}px)`;
    }
  }

  private readonly handlePointerDown = (event: PointerEvent): void => {
    this.pressedAt = { x: event.clientX, y: event.clientY };
  };

  private readonly handlePointerUp = (event: PointerEvent): void => {
    const pressed = this.pressedAt;

    this.pressedAt = null;

    if (!pressed || Math.hypot(event.clientX - pressed.x, event.clientY - pressed.y) > TAP_TOLERANCE_PX) {
      return;
    }

    const rect = this.stage.renderer.domElement.getBoundingClientRect();

    this.pointer.set(((event.clientX - rect.left) / rect.width) * 2 - 1, -((event.clientY - rect.top) / rect.height) * 2 + 1);
    this.raycaster.setFromCamera(this.pointer, this.stage.camera);

    const [hit] = this.raycaster.intersectObjects(this.islands.map((island) => island.root), true);
    const island = hit ? this.islands.find((candidate) => isInside(hit.object, candidate.root)) : undefined;

    if (island) {
      this.onSelect(island.regionId);
    }
  };
}

function isInside(object: Object3D, root: Object3D): boolean {
  for (let current: Object3D | null = object; current; current = current.parent) {
    if (current === root) {
      return true;
    }
  }

  return false;
}
