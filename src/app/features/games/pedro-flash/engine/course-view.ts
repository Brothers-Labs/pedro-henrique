import {
  BoxGeometry,
  type BufferGeometry,
  Color,
  ConeGeometry,
  DoubleSide,
  Group,
  IcosahedronGeometry,
  InstancedMesh,
  Matrix4,
  Mesh,
  MeshStandardMaterial,
  Object3D,
  PlaneGeometry,
  RingGeometry,
  type Texture,
} from 'three';

import { darken } from '../../pedro-maker/art/canvas';
import { disposeTree } from '../../pedro-maker/engine/render/dispose';
import { box, buildBoxesGeometry } from '../../pedro-maker/engine/render/voxel-geometry';
import { SeededRandom } from '../../pedro-maker/levels/seeded-random';
import type { FlashThemeDefinition } from '../config/theme.config';
import {
  createFrame,
  isOverGap,
  LANE_WIDTH,
  ROAD_HALF_WIDTH,
  ROAD_HEIGHT,
  sampleFrame,
  worldPoint,
  type Course,
} from '../course/course-geometry';
import type { Hazard, ItemBox, Pad, RaioPickup } from '../simulation/course-objects';
import { ITEM_BOX_HEIGHT } from '../simulation/course-objects';
import type { Bomb, Wave } from '../simulation/runner-pilot';
import { buildPatch, buildRibbon, courseMatrix, placeOnCourse, ribbonSamples } from './course-mesh';
import { paintBoost, paintCheckered, paintGround, paintItemBox, paintRoad, paintWarning } from './flash-textures';
import { sceneryParts } from './scenery-models';

const W = ROAD_HALF_WIDTH;
const SLAB_DEPTH = 0.9;
const NEON_HEIGHT = 0.4;
const ROAD_TEXTURE_LENGTH = 16;
const PILLAR_SPACING = 24;
const GROUND_MARGIN = 220;
const SCENERY_ATTEMPTS = 520;
const SCENERY_CLEARANCE = ROAD_HALF_WIDTH + 8;
/** Uma camada um tiquinho acima do asfalto, para os remendos não piscarem. */
const DECAL_HEIGHT = 0.03;
const BOMB_DROP_HEIGHT = 6.5;
const RAIO_SPIN_MS = 500;

/** O que o desenho da pista lê da partida a cada quadro. */
export interface CourseViewState {
  readonly raios: readonly RaioPickup[];
  readonly itemBoxes: readonly ItemBox[];
  readonly hazards: readonly Hazard[];
  readonly pads: readonly Pad[];
  readonly bombs: readonly Bomb[];
  readonly waves: readonly Wave[];
}

interface BombVisual {
  readonly bomb: Mesh;
  readonly marker: Mesh;
  readonly blast: Mesh<IcosahedronGeometry, MeshStandardMaterial>;
}

/**
 * Tudo o que fica na pista e em volta dela.
 *
 * A estrada é suspensa — asfalto, laterais, fundo e luzes de neon nas
 * beiradas —, apoiada em pilares sobre o chão do cenário. Os buracos são a
 * falta dela. Raios, caixas, barreiras e ataques do chefão mudam a cada
 * quadro; o resto é montado uma vez só.
 */
export class CourseView {
  readonly root = new Group();

  private readonly textures: Texture[] = [];
  private readonly frame = createFrame();
  private readonly matrix = new Matrix4();
  private readonly spin = new Matrix4();
  private readonly hidden = new Matrix4().makeScale(0, 0, 0);
  private readonly raioBases: Matrix4[] = [];
  private readonly raioMesh: InstancedMesh;
  private readonly boxMeshes: Mesh[] = [];
  private readonly barrierMeshes = new Map<Hazard, Mesh>();
  private readonly bombPool: BombVisual[] = [];
  private readonly wavePool: Mesh[] = [];

  constructor(
    private readonly course: Course,
    state: CourseViewState,
    private readonly theme: FlashThemeDefinition,
    seed: number,
    hasShadows: boolean,
    attackColor: string,
  ) {
    this.root.name = 'pista-flash';
    this.root.add(this.buildRoad(), this.buildPillars(hasShadows), this.buildGround(), this.buildScenery(seed, hasShadows));
    this.root.add(this.buildStartLine());

    if (!course.isCircuit) {
      this.root.add(this.buildGoal());
    }

    for (const object of [
      ...course.gaps.map((gap) => this.buildGapWarnings(gap.start, gap.end)),
      ...state.pads.map((pad) => this.buildPad(pad)),
      ...state.hazards.map((hazard) => this.buildHazard(hazard)),
    ]) {
      this.root.add(object);
    }
    this.addItemBoxes(state.itemBoxes);
    this.raioMesh = this.buildRaios(state.raios);
    this.root.add(this.raioMesh);
    this.buildAttackPools(attackColor);
  }

  update(state: CourseViewState, clockMs: number): void {
    this.updateRaios(state.raios, clockMs);

    state.itemBoxes.forEach((itemBox, index) => {
      const mesh = this.boxMeshes[index];

      mesh.visible = itemBox.respawnAtMs <= clockMs;
      mesh.rotation.set(0.35, clockMs / 650 + index, 0.2);
    });

    for (const [hazard, mesh] of this.barrierMeshes) {
      mesh.visible = hazard.brokenAtMs === null;
    }

    this.updateBombs(state.bombs, clockMs);
    this.updateWaves(state.waves);
  }

  dispose(): void {
    disposeTree(this.root);

    for (const texture of this.textures) {
      texture.dispose();
    }
  }

  private buildRoad(): Group {
    const group = new Group();
    const samples = ribbonSamples(this.course);
    const isShown = (start: number, end: number): boolean => !isOverGap(this.course, (start + end) / 2);
    const asphalt = new MeshStandardMaterial({ map: this.track(paintRoad(this.theme)), roughness: 0.82, metalness: 0.08 });
    const slab = new MeshStandardMaterial({ color: darken(this.theme.road, 0.35), roughness: 0.9, side: DoubleSide });
    const neon = new MeshStandardMaterial({
      color: this.theme.neon,
      emissive: new Color(this.theme.neon),
      emissiveIntensity: 0.9,
      side: DoubleSide,
    });
    const ribbon = (fromLateral: number, fromHeight: number, toLateral: number, toHeight: number): BufferGeometry =>
      buildRibbon(samples, { fromLateral, fromHeight, toLateral, toHeight }, ROAD_TEXTURE_LENGTH, isShown);
    const top = new Mesh(ribbon(-W, 0, W, 0), asphalt);

    top.receiveShadow = true;
    group.add(
      top,
      new Mesh(ribbon(W, -SLAB_DEPTH, -W, -SLAB_DEPTH), slab),
      new Mesh(ribbon(-W, -SLAB_DEPTH, -W, 0), slab),
      new Mesh(ribbon(W, 0, W, -SLAB_DEPTH), slab),
      new Mesh(ribbon(-W + 0.05, 0, -W + 0.05, NEON_HEIGHT), neon),
      new Mesh(ribbon(W - 0.05, NEON_HEIGHT, W - 0.05, 0), neon),
    );

    return group;
  }

  /** Pilares nas retas e curvas planas; nunca no looping nem na beira de um buraco. */
  private buildPillars(hasShadows: boolean): InstancedMesh {
    const height = ROAD_HEIGHT - SLAB_DEPTH;
    const matrices: Matrix4[] = [];
    const point = { x: 0, y: 0, z: 0 };

    for (let distance = PILLAR_SPACING / 2; distance < this.course.length; distance += PILLAR_SPACING) {
      const frame = sampleFrame(this.course, distance, this.frame);
      const isFlat = frame.upY > 0.999 && Math.abs(frame.y - ROAD_HEIGHT) < 0.05;
      const isNearGap = this.course.gaps.some((gap) => distance > gap.start - 3 && distance < gap.end + 3);

      if (!isFlat || isNearGap) {
        continue;
      }

      for (const lateral of [-W + 1.2, W - 1.2]) {
        worldPoint(frame, lateral, 0, point);
        matrices.push(new Matrix4().makeTranslation(point.x, height / 2, point.z));
      }
    }

    const pillars = new InstancedMesh(
      new BoxGeometry(1.1, height, 1.1),
      new MeshStandardMaterial({ color: darken(this.theme.road, 0.15), roughness: 0.7, metalness: 0.3 }),
      Math.max(1, matrices.length),
    );

    pillars.count = matrices.length;
    matrices.forEach((matrix, index) => pillars.setMatrixAt(index, matrix));
    pillars.castShadow = hasShadows;
    pillars.receiveShadow = hasShadows;

    return pillars;
  }

  private buildGround(): Mesh {
    const { minX, maxX, minZ, maxZ } = this.course.bounds;
    const width = maxX - minX + GROUND_MARGIN * 2;
    const depth = maxZ - minZ + GROUND_MARGIN * 2;
    const texture = this.track(paintGround(this.theme));

    texture.repeat.set(width / 24, depth / 24);

    const ground = new Mesh(
      new PlaneGeometry(width, depth),
      new MeshStandardMaterial({
        map: texture,
        roughness: 1,
        emissive: new Color(this.theme.groundGlow > 0 ? this.theme.ground : '#000000'),
        emissiveMap: this.theme.groundGlow > 0 ? texture : null,
        emissiveIntensity: this.theme.groundGlow,
      }),
    );

    ground.rotation.x = -Math.PI / 2;
    ground.position.set((minX + maxX) / 2, 0, (minZ + maxZ) / 2);
    ground.receiveShadow = true;

    return ground;
  }

  /** Espalha os enfeites do tema longe da pista, sempre nos mesmos lugares para a mesma fase. */
  private buildScenery(seed: number, hasShadows: boolean): Group {
    const group = new Group();
    const random = new SeededRandom(seed);
    const placements = new Map<number, Matrix4[]>();
    const dummy = new Object3D();
    const kinds = this.theme.scenery;
    const { minX, maxX, minZ, maxZ } = this.course.bounds;

    for (let attempt = 0; attempt < SCENERY_ATTEMPTS; attempt += 1) {
      const x = minX - 70 + random.next() * (maxX - minX + 140);
      const z = minZ - 70 + random.next() * (maxZ - minZ + 140);

      if (this.isNearRoad(x, z)) {
        continue;
      }

      // O primeiro enfeite do tema sai mais vezes que os outros.
      const kindIndex = random.chance(0.6) ? 0 : random.integer(0, kinds.length - 1);

      dummy.position.set(x, 0, z);
      dummy.rotation.set(0, random.next() * Math.PI * 2, 0);
      dummy.scale.setScalar(0.8 + random.next() * 0.7);
      dummy.updateMatrix();

      const list = placements.get(kindIndex) ?? [];
      list.push(dummy.matrix.clone());
      placements.set(kindIndex, list);
    }

    const material = new MeshStandardMaterial({ vertexColors: true, roughness: 0.8 });

    for (const [kindIndex, matrices] of placements) {
      const instanced = new InstancedMesh(buildBoxesGeometry(sceneryParts(kinds[kindIndex])), material, matrices.length);

      matrices.forEach((matrix, index) => instanced.setMatrixAt(index, matrix));
      instanced.castShadow = hasShadows;
      instanced.receiveShadow = hasShadows;
      group.add(instanced);
    }

    return group;
  }

  private isNearRoad(x: number, z: number): boolean {
    const limit = SCENERY_CLEARANCE * SCENERY_CLEARANCE;
    const { samples } = this.course;

    for (let index = 0; index < samples.length; index += 3) {
      const sample = samples[index];

      if ((sample.x - x) ** 2 + (sample.z - z) ** 2 < limit) {
        return true;
      }
    }

    return false;
  }

  private buildStartLine(): Mesh {
    const start = this.course.startDistance;

    return this.decal(start - 1.2, start + 1.2, paintCheckered(), 0);
  }

  /** O portal de chegada: dois postes, uma faixa de luz no alto e o xadrez no chão. */
  private buildGoal(): Group {
    const goal = this.course.goalDistance;
    const gate = new Group();
    const frame = sampleFrame(this.course, goal, this.frame);
    const posts = new Mesh(
      buildBoxesGeometry([
        box(W + 0.5, 3.2, 0, 0.7, 6.4, 0.7, '#e9edf5'),
        box(-W - 0.5, 3.2, 0, 0.7, 6.4, 0.7, '#e9edf5'),
        box(0, 6.6, 0, W * 2 + 1.8, 0.9, 0.5, '#1e1e28'),
      ]),
      new MeshStandardMaterial({ vertexColors: true, roughness: 0.5, metalness: 0.2 }),
    );
    const banner = new Mesh(
      new BoxGeometry(W * 2 + 1.2, 0.5, 0.56),
      new MeshStandardMaterial({ color: this.theme.neon, emissive: new Color(this.theme.neon), emissiveIntensity: 1.6 }),
    );

    banner.position.y = 6.6;
    posts.castShadow = true;
    gate.add(posts, banner);
    placeOnCourse(gate, frame, 0, 0);

    const group = new Group();

    group.add(gate, this.decal(goal - 1.2, goal + 1.2, paintCheckered(), 0));

    return group;
  }

  private buildGapWarnings(start: number, end: number): Group {
    const group = new Group();

    group.add(this.decal(start - 2.4, start - 0.2, paintWarning(), 0.2), this.decal(end + 0.2, end + 2.4, paintWarning(), 0.2));

    return group;
  }

  private buildPad(pad: Pad): Object3D {
    switch (pad.kind) {
      case 'turbo':
        return this.decal(pad.distance - 3, pad.distance + 3, paintBoost(), 0.9, W - 0.6);
      case 'rampa':
        return this.buildRamp(pad.distance);
      case 'mola':
        return this.buildSprings(pad.distance);
    }
  }

  /** A rampa sobe nos cinco metros antes do ponto de lançamento. */
  private buildRamp(distance: number): Mesh {
    const texture = this.track(paintWarning());
    const geometry = buildPatch(this.course, distance - 5, distance, -W + 0.4, W - 0.4, (progress) => DECAL_HEIGHT + progress * 1.3);
    const mesh = new Mesh(geometry, new MeshStandardMaterial({ map: texture, roughness: 0.6, side: DoubleSide }));

    mesh.castShadow = true;
    mesh.receiveShadow = true;

    return mesh;
  }

  /** Três molas lado a lado, uma em cada faixa: qualquer caminho passa por uma. */
  private buildSprings(distance: number): Mesh {
    const parts = ([-1, 0, 1] as const).flatMap((lane) => {
      // O x local da peça é a esquerda de quem corre.
      const x = -lane * LANE_WIDTH;

      return [
        box(x, 0.15, 0, 1.7, 0.3, 1.7, '#e03131'),
        box(x, 0.48, 0, 0.7, 0.4, 0.7, '#c9ced8'),
        box(x, 0.78, 0, 1.55, 0.22, 1.55, '#ffd23f'),
      ];
    });
    const mesh = new Mesh(buildBoxesGeometry(parts), new MeshStandardMaterial({ vertexColors: true, roughness: 0.4, metalness: 0.3 }));

    mesh.castShadow = true;
    placeOnCourse(mesh, sampleFrame(this.course, distance, this.frame), 0, 0);

    return mesh;
  }

  private buildHazard(hazard: Hazard): Object3D {
    const frame = sampleFrame(this.course, hazard.distance, this.frame);

    if (hazard.kind === 'barreira') {
      const barrier = new Mesh(
        new BoxGeometry(3, 1.5, 0.6),
        new MeshStandardMaterial({ map: this.track(paintWarning()), roughness: 0.5, metalness: 0.1 }),
      );

      barrier.castShadow = true;
      placeOnCourse(barrier, frame, hazard.lateral, 0.75);
      this.barrierMeshes.set(hazard, barrier);

      return barrier;
    }

    const spikes = new Group();
    const cone = new ConeGeometry(0.3, 0.9, 8);
    const steel = new MeshStandardMaterial({ color: '#c9ced8', roughness: 0.25, metalness: 0.85 });
    const base = new Mesh(new BoxGeometry(3, 0.12, 2.4), new MeshStandardMaterial({ color: '#2a2a35', roughness: 0.8 }));

    base.position.y = 0.06;
    spikes.add(base);

    for (const x of [-1, 0, 1]) {
      for (const z of [-0.6, 0.6]) {
        const spike = new Mesh(cone, steel);

        spike.position.set(x, 0.55, z);
        spike.castShadow = true;
        spikes.add(spike);
      }
    }

    placeOnCourse(spikes, frame, hazard.lateral, 0);

    return spikes;
  }

  private addItemBoxes(boxes: readonly ItemBox[]): void {
    const texture = this.track(paintItemBox());
    const geometry = new BoxGeometry(1.3, 1.3, 1.3);
    const material = new MeshStandardMaterial({
      map: texture,
      emissive: new Color('#ffffff'),
      emissiveMap: texture,
      emissiveIntensity: 0.5,
      transparent: true,
      opacity: 0.94,
    });

    for (const itemBox of boxes) {
      const holder = new Group();
      const mesh = new Mesh(geometry, material);

      holder.add(mesh);
      placeOnCourse(holder, sampleFrame(this.course, itemBox.distance, this.frame), itemBox.lateral, ITEM_BOX_HEIGHT);
      this.boxMeshes.push(mesh);
      this.root.add(holder);
    }
  }

  /** Todos os raios numa malha só: centenas deles custam uma chamada à placa de vídeo. */
  private buildRaios(raios: readonly RaioPickup[]): InstancedMesh {
    const bolt = buildBoxesGeometry([
      box(0.14, 0.34, 0, 0.32, 0.5, 0.16, '#ffd23f'),
      box(0, 0, 0, 0.56, 0.2, 0.16, '#ffe680'),
      box(-0.14, -0.34, 0, 0.32, 0.5, 0.16, '#ffd23f'),
    ]);
    const material = new MeshStandardMaterial({
      vertexColors: true,
      emissive: new Color('#ffb000'),
      emissiveIntensity: 1.3,
      roughness: 0.3,
      metalness: 0.4,
    });
    const mesh = new InstancedMesh(bolt, material, Math.max(1, raios.length));

    mesh.count = raios.length;

    for (const raio of raios) {
      const frame = sampleFrame(this.course, raio.distance, this.frame);

      this.raioBases.push(courseMatrix(frame, raio.lateral, raio.height, new Matrix4()));
    }

    return mesh;
  }

  private updateRaios(raios: readonly RaioPickup[], clockMs: number): void {
    this.spin.makeRotationY(clockMs / RAIO_SPIN_MS);

    raios.forEach((raio, index) => {
      const isShown = raio.collectedAtMs === null;

      this.raioMesh.setMatrixAt(index, isShown ? this.matrix.multiplyMatrices(this.raioBases[index], this.spin) : this.hidden);
    });

    this.raioMesh.instanceMatrix.needsUpdate = true;
  }

  /** Bombas e ondas são poucas e reaproveitadas: nada é criado no meio da luta. */
  private buildAttackPools(attackColor: string): void {
    const bombGeometry = new IcosahedronGeometry(0.7, 1);
    const bombMaterial = new MeshStandardMaterial({ color: '#2a2a35', emissive: new Color('#ff3d1f'), emissiveIntensity: 0.6, metalness: 0.6, roughness: 0.3 });
    const markerGeometry = new RingGeometry(1.4, 2.2, 32);
    const markerMaterial = new MeshStandardMaterial({ color: '#ff3d1f', emissive: new Color('#ff3d1f'), emissiveIntensity: 1.4, transparent: true, opacity: 0.75, side: DoubleSide });
    const blastGeometry = new IcosahedronGeometry(1, 2);

    for (let index = 0; index < 6; index += 1) {
      const blast = new Mesh(
        blastGeometry,
        new MeshStandardMaterial({ color: '#ffb000', emissive: new Color('#ff7a1a'), emissiveIntensity: 2, transparent: true, depthWrite: false }),
      );
      const visual: BombVisual = { bomb: new Mesh(bombGeometry, bombMaterial), marker: new Mesh(markerGeometry, markerMaterial), blast };


      for (const mesh of [visual.bomb, visual.marker, visual.blast]) {
        mesh.visible = false;
        this.root.add(mesh);
      }

      this.bombPool.push(visual);
    }

    const waveGeometry = new BoxGeometry(W * 2, 0.9, 0.35);
    const waveMaterial = new MeshStandardMaterial({
      color: attackColor,
      emissive: new Color(attackColor),
      emissiveIntensity: 1.8,
      transparent: true,
      opacity: 0.85,
    });

    for (let index = 0; index < 4; index += 1) {
      const wave = new Mesh(waveGeometry, waveMaterial);

      wave.visible = false;
      this.wavePool.push(wave);
      this.root.add(wave);
    }
  }

  private updateBombs(bombs: readonly Bomb[], clockMs: number): void {
    this.bombPool.forEach((visual, index) => {
      const bomb = bombs[index];
      const isFalling = bomb !== undefined && clockMs < bomb.landsAtMs;
      const isExploding = bomb !== undefined && !isFalling;

      visual.bomb.visible = isFalling;
      visual.marker.visible = isFalling;
      visual.blast.visible = isExploding;

      if (!bomb) {
        return;
      }

      const frame = sampleFrame(this.course, bomb.distance, this.frame);

      if (isFalling) {
        const progress = (clockMs - bomb.createdAtMs) / (bomb.landsAtMs - bomb.createdAtMs);

        placeOnCourse(visual.bomb, frame, bomb.lateral, BOMB_DROP_HEIGHT * (1 - progress) + 0.7);
        placeOnCourse(visual.marker, frame, bomb.lateral, DECAL_HEIGHT * 2);
        visual.marker.rotateX(-Math.PI / 2);
        visual.marker.scale.setScalar(0.7 + 0.3 * Math.sin(clockMs / 60));
        return;
      }

      const progress = (clockMs - bomb.landsAtMs) / (bomb.endsAtMs - bomb.landsAtMs);

      placeOnCourse(visual.blast, frame, bomb.lateral, 0.8);
      visual.blast.scale.setScalar(0.6 + progress * 1.9);
      visual.blast.material.opacity = Math.max(0, 0.9 - progress * 0.8);
    });
  }

  private updateWaves(waves: readonly Wave[]): void {
    this.wavePool.forEach((mesh, index) => {
      const wave = waves[index];

      mesh.visible = wave !== undefined;

      if (wave) {
        placeOnCourse(mesh, sampleFrame(this.course, wave.distance, this.frame), 0, 0.45);
      }
    });
  }

  /** Remendo deitado no asfalto, de lado a lado, entre duas distâncias. */
  private decal(from: number, to: number, texture: Texture, glow: number, halfWidth = W): Mesh {
    this.track(texture);

    const mesh = new Mesh(
      buildPatch(this.course, from, to, -halfWidth, halfWidth, () => DECAL_HEIGHT),
      new MeshStandardMaterial({ map: texture, emissive: new Color('#ffffff'), emissiveMap: texture, emissiveIntensity: glow, roughness: 0.7 }),
    );

    mesh.receiveShadow = true;

    return mesh;
  }

  private track<TTexture extends Texture>(texture: TTexture): TTexture {
    if (!this.textures.includes(texture)) {
      this.textures.push(texture);
    }

    return texture;
  }
}
