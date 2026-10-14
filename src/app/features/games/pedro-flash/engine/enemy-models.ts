import { Color, Group, Mesh, MeshStandardMaterial } from 'three';

import { darken, lighten } from '../../pedro-maker/art/canvas';
import { disposeTree } from '../../pedro-maker/engine/render/dispose';
import { box, buildBoxesGeometry, type VoxelBox } from '../../pedro-maker/engine/render/voxel-geometry';
import type { BossProfile } from '../config/boss.config';
import type { BossPhase } from '../simulation/boss';
import type { EnemyKind } from '../simulation/course-objects';

const STEEL = '#8b96b8';
const DARK_STEEL = '#3a4058';
const EYE = '#ff3d1f';

/** Quanto tempo o robô derrotado leva para sumir, voando e encolhendo. */
const DEFEAT_MS = 450;

/**
 * Um robô do Doutor Apagão, de cubos de metal com olhos vermelhos acesos.
 *
 * O besouro anda nas perninhas, a abelha bate as asas e o tatu rola. Quando
 * derrotado, voa para o alto girando e some.
 */
export class EnemyModel {
  readonly root = new Group();

  private readonly body: Mesh;
  private readonly moving: readonly Mesh[];
  private readonly material = new MeshStandardMaterial({ vertexColors: true, roughness: 0.35, metalness: 0.75 });

  constructor(readonly kind: EnemyKind) {
    this.body = this.mesh(bodyParts(kind));
    this.moving = movingParts(kind).map((parts) => this.mesh(parts));
    this.root.add(this.body, ...this.moving);
  }

  /** `defeatedMsAgo` é `null` enquanto o robô está inteiro. */
  update(now: number, phase: number, defeatedMsAgo: number | null): void {
    if (defeatedMsAgo !== null) {
      const progress = Math.min(1, defeatedMsAgo / DEFEAT_MS);

      this.root.visible = progress < 1;
      this.body.position.y = progress * 3;
      this.body.rotation.set(progress * 8, progress * 5, 0);
      this.root.scale.setScalar(1 - progress * 0.8);

      for (const part of this.moving) {
        part.visible = false;
      }

      return;
    }

    const time = now / 1000 + phase;

    switch (this.kind) {
      case 'besouro':
        this.moving.forEach((leg, index) => {
          leg.position.y = Math.max(0, Math.sin(time * 16 + index * Math.PI)) * 0.12;
        });
        return;
      case 'abelha':
        this.moving.forEach((wing, index) => {
          wing.rotation.z = (index === 0 ? 1 : -1) * Math.sin(time * 40) * 0.6;
        });
        return;
      case 'tatu':
        this.body.rotation.x = -time * 9;
        return;
    }
  }

  dispose(): void {
    disposeTree(this.root);
    this.material.dispose();
  }

  private mesh(parts: readonly VoxelBox[]): Mesh {
    const mesh = new Mesh(buildBoxesGeometry(parts), this.material);

    mesh.castShadow = true;

    return mesh;
  }
}

/**
 * O chefão: uma nave-robô gigante com hélices, canhão e um painel de luz.
 *
 * Cansado, ele pisca devagar e solta faíscas; atingido, chacoalha; derrotado,
 * cai rodando até virar sucata.
 */
export class BossModel {
  readonly root = new Group();

  private readonly hull: Mesh;
  private readonly rotors: Mesh;
  private readonly material = new MeshStandardMaterial({ vertexColors: true, roughness: 0.3, metalness: 0.8 });
  private readonly accent: Color;

  constructor(profile: BossProfile) {
    this.accent = new Color(profile.accent);
    this.hull = new Mesh(buildBoxesGeometry(bossParts(profile)), this.material);
    this.rotors = new Mesh(
      buildBoxesGeometry([box(0, 0, 0, 5.2, 0.12, 0.5, DARK_STEEL), box(0, 0, 0, 0.5, 0.12, 5.2, DARK_STEEL)]),
      this.material,
    );
    this.hull.castShadow = true;
    this.rotors.position.y = 2.1;
    this.root.add(this.hull, this.rotors);
  }

  update(phase: BossPhase, now: number): void {
    this.rotors.rotation.y = now / 40;
    this.hull.rotation.set(0, 0, 0);
    this.hull.position.set(0, 0, 0);
    this.material.emissive.copy(this.accent);

    switch (phase) {
      case 'cansado':
        this.material.emissiveIntensity = 0.25 + 0.25 * Math.sin(now / 120);
        this.hull.rotation.z = Math.sin(now / 200) * 0.12;
        return;
      case 'atingido':
        this.material.emissive.set('#ffffff');
        this.material.emissiveIntensity = 0.8;
        this.hull.position.x = Math.sin(now / 15) * 0.25;
        return;
      case 'derrotado':
        this.material.emissive.set('#ff7a1a');
        this.material.emissiveIntensity = 0.6 + 0.4 * Math.sin(now / 40);
        this.hull.rotation.set(Math.sin(now / 90) * 0.4, now / 120, Math.cos(now / 110) * 0.4);
        return;
      case 'chegando':
      case 'voando':
        this.material.emissiveIntensity = 0.12;
        this.hull.rotation.x = Math.sin(now / 500) * 0.05;
        return;
    }
  }

  dispose(): void {
    disposeTree(this.root);
    this.material.dispose();
  }
}

function eyes(y: number, z: number, spread: number, size: number): readonly VoxelBox[] {
  return [box(-spread, y, z, size, size, 0.06, EYE), box(spread, y, z, size, size, 0.06, EYE)];
}

function bodyParts(kind: EnemyKind): readonly VoxelBox[] {
  switch (kind) {
    case 'besouro':
      return [
        box(0, 0.6, 0, 1.6, 0.7, 1.9, '#2f9a5a'),
        box(0, 0.95, 0, 1.3, 0.25, 1.6, lighten('#2f9a5a', 0.25)),
        box(0, 0.65, 1.05, 1.0, 0.5, 0.35, DARK_STEEL),
        box(-0.35, 1.1, 1.1, 0.08, 0.5, 0.08, STEEL),
        box(0.35, 1.1, 1.1, 0.08, 0.5, 0.08, STEEL),
        ...eyes(0.72, 1.23, 0.25, 0.18),
      ];
    case 'abelha':
      return [
        box(0, 0, 0, 1.2, 1.0, 1.5, '#ffd23f'),
        box(0, 0, -0.1, 1.24, 0.3, 1.0, '#1e1e28'),
        box(0, 0, -0.95, 0.4, 0.4, 0.5, DARK_STEEL),
        box(0, 0.05, 0.85, 0.9, 0.8, 0.3, STEEL),
        ...eyes(0.15, 1.01, 0.22, 0.2),
      ];
    case 'tatu':
      return [
        box(0, 0, 0, 1.6, 1.4, 1.4, '#7a5d48'),
        box(0, 0, 0, 1.4, 1.6, 1.2, lighten('#7a5d48', 0.15)),
        box(0, 0, 0, 1.2, 1.2, 1.6, darken('#7a5d48', 0.2)),
        ...eyes(0.2, 0.81, 0.3, 0.16),
      ];
  }
}

/** Peças que se mexem separadas do corpo: as patas do besouro e as asas da abelha. */
function movingParts(kind: EnemyKind): readonly (readonly VoxelBox[])[] {
  switch (kind) {
    case 'besouro':
      return [
        [box(-0.9, 0.2, 0.5, 0.2, 0.4, 0.2, DARK_STEEL), box(0.9, 0.2, -0.5, 0.2, 0.4, 0.2, DARK_STEEL)],
        [box(0.9, 0.2, 0.5, 0.2, 0.4, 0.2, DARK_STEEL), box(-0.9, 0.2, -0.5, 0.2, 0.4, 0.2, DARK_STEEL)],
      ];
    case 'abelha':
      return [[box(-0.9, 0.6, 0, 1.0, 0.06, 0.7, '#dff3ff')], [box(0.9, 0.6, 0, 1.0, 0.06, 0.7, '#dff3ff')]];
    case 'tatu':
      return [];
  }
}

function bossParts(profile: BossProfile): readonly VoxelBox[] {
  const { color, accent } = profile;

  return [
    box(0, 0, 0, 4.2, 2.6, 4.6, color),
    box(0, 1.5, 0, 3.0, 0.5, 3.4, lighten(color, 0.2)),
    box(0, 1.9, 0, 0.5, 0.5, 0.5, DARK_STEEL),
    box(0, -1.5, 0, 3.4, 0.4, 3.8, darken(color, 0.3)),
    // A cabine, de vidro escuro, e o painel de luz na cor do chefão.
    box(0, 0.3, 2.35, 3.0, 1.2, 0.2, '#1e1e28'),
    box(0, -0.6, 2.36, 2.4, 0.3, 0.2, accent),
    ...eyes(0.4, 2.48, 0.8, 0.45),
    // Canhões dos lados e o propulsor atrás.
    box(-2.5, -0.3, 0.6, 0.8, 0.8, 2.4, DARK_STEEL),
    box(2.5, -0.3, 0.6, 0.8, 0.8, 2.4, DARK_STEEL),
    box(-2.5, -0.3, 1.85, 0.5, 0.5, 0.1, accent),
    box(2.5, -0.3, 1.85, 0.5, 0.5, 0.1, accent),
    box(0, 0, -2.6, 1.6, 1.6, 0.6, DARK_STEEL),
    box(0, 0, -2.95, 1.1, 1.1, 0.1, '#ff7a1a'),
  ];
}
