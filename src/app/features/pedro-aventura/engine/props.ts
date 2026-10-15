import {
  BoxGeometry,
  type BufferGeometry,
  CanvasTexture,
  ConeGeometry,
  CylinderGeometry,
  DodecahedronGeometry,
  Group,
  Mesh,
  type Material,
  Object3D,
  OctahedronGeometry,
  Shape,
  ExtrudeGeometry,
  SphereGeometry,
  TorusGeometry,
} from 'three';
import { RoundedBoxGeometry } from 'three/examples/jsm/geometries/RoundedBoxGeometry.js';

import type { ObstacleKind, RegionTheme } from '../models/campaign.model';
import { type PickupKind, RAMP_SIZE } from '../simulation/track.model';
import { buildVehicle } from './characters';
import { disposeGeometries, type MaterialLibrary } from './materials';
import { buildPalm } from './nature';
import { checkerTexture, chevronTexture, crateTexture, stripeTexture } from './textures';

/** Cores dos carros da pista, sorteadas pelo id do obstáculo. */
const TRAFFIC_PALETTES = [
  { primary: '#d32f2f', secondary: '#1a1a1f', accent: '#ffe7a8' },
  { primary: '#1e88e5', secondary: '#15151c', accent: '#e3f2ff' },
  { primary: '#f5f5f5', secondary: '#2a2a33', accent: '#ffe7a8' },
  { primary: '#ffb300', secondary: '#1a1a1f', accent: '#ffffff' },
] as const;

type AnimalVariant = 'pato' | 'gato' | 'porquinho';

const ANIMALS: readonly AnimalVariant[] = ['pato', 'gato', 'porquinho'];

/** Raio do turbo: um zigue-zague extrudado, que brilha sozinho. */
function lightningGeometry(): BufferGeometry {
  const shape = new Shape();

  shape.moveTo(0.05, 0.42);
  shape.lineTo(-0.2, 0.0);
  shape.lineTo(-0.02, 0.0);
  shape.lineTo(-0.1, -0.42);
  shape.lineTo(0.2, 0.06);
  shape.lineTo(0.02, 0.06);
  shape.closePath();

  return new ExtrudeGeometry(shape, { depth: 0.08, bevelEnabled: true, bevelSize: 0.02, bevelThickness: 0.02, bevelSegments: 1 }).translate(0, 0, -0.04);
}

function mesh(geometry: BufferGeometry, material: Material, x = 0, y = 0, z = 0): Mesh {
  const result = new Mesh(geometry, material);
  result.position.set(x, y, z);
  result.castShadow = true;
  result.receiveShadow = true;

  return result;
}

/**
 * Fábrica das peças da pista.
 *
 * Cada tipo é montado uma vez como molde; a pista usa cópias (`clone`), que
 * dividem geometria e material com o molde. Cem barreiras custam a memória de
 * uma. Ao fim da fase, a fábrica libera os moldes e as texturas.
 */
export class PropKit {
  private readonly templates = new Map<string, Object3D>();
  private readonly textures: CanvasTexture[] = [];

  constructor(
    private readonly materials: MaterialLibrary,
    private readonly theme: RegionTheme,
  ) {}

  obstacle(kind: ObstacleKind, id: number): Object3D {
    if (kind === 'animal') {
      const variant = ANIMALS[id % ANIMALS.length];

      return this.template(`animal-${variant}`, () => this.buildAnimal(variant)).clone();
    }

    if (kind === 'parked-car' || kind === 'traffic-car') {
      const palette = TRAFFIC_PALETTES[id % TRAFFIC_PALETTES.length];
      const car = this.template(`car-${id % TRAFFIC_PALETTES.length}`, () => buildVehicle(this.materials, id % 3 === 0 ? 'suv' : 'sport', palette));
      const copy = car.clone();

      // O carro da contramão vem de frente para o Pedro.
      copy.rotation.y = kind === 'traffic-car' ? Math.PI : 0;

      return copy;
    }

    return this.template(kind, () => this.buildObstacle(kind)).clone();
  }

  ramp(): Object3D {
    return this.template('ramp', () => {
      const chevrons = this.texture(chevronTexture());
      const group = new Group();
      const slope = Math.atan2(RAMP_SIZE.height, RAMP_SIZE.length);
      const surfaceLength = Math.hypot(RAMP_SIZE.length, RAMP_SIZE.height);
      const surface = mesh(new BoxGeometry(RAMP_SIZE.width, 0.12, surfaceLength), this.materials.standard('#ffffff', { map: chevrons, roughness: 0.6 }));

      surface.position.set(0, RAMP_SIZE.height / 2, RAMP_SIZE.length / 2);
      surface.rotation.x = -slope;
      group.add(surface, mesh(new BoxGeometry(RAMP_SIZE.width, RAMP_SIZE.height, 0.15), this.materials.standard('#2b2b33'), 0, RAMP_SIZE.height / 2, RAMP_SIZE.length));

      return group;
    }).clone();
  }

  /** Arco de checkpoint (azul neon) ou de chegada (xadrez). */
  arch(isFinish: boolean): Object3D {
    return this.template(isFinish ? 'finish' : 'checkpoint', () => {
      const group = new Group();
      const post = isFinish ? this.materials.standard('#1a1a1f', { metalness: 0.6 }) : this.materials.neon('#3fb8ff', 1.2);
      const banner = isFinish
        ? this.materials.standard('#ffffff', { map: this.texture(checkerTexture()) })
        : this.materials.neon(this.theme.accent, 0.9);

      group.add(
        mesh(new BoxGeometry(0.3, 4.2, 0.3), post, -4.4, 2.1, 0),
        mesh(new BoxGeometry(0.3, 4.2, 0.3), post, 4.4, 2.1, 0),
        mesh(new BoxGeometry(9.1, 0.7, 0.2), banner, 0, 4.2, 0),
      );

      return group;
    }).clone();
  }

  /** Geometrias das peças que viram `InstancedMesh` (uma chamada de desenho por tipo). */
  pickupGeometry(kind: PickupKind): BufferGeometry {
    switch (kind) {
      case 'coin':
        return new CylinderGeometry(0.42, 0.42, 0.09, 18).rotateX(Math.PI / 2);
      case 'gold-bar':
        // Lingote: mais largo embaixo, de cantos suaves.
        return new RoundedBoxGeometry(0.75, 0.28, 0.4, 2, 0.06);
      case 'diamond':
        return new OctahedronGeometry(0.34, 0).scale(1, 1.35, 1);
      case 'heart':
        return new SphereGeometry(0.34, 12, 10).scale(1, 0.9, 0.55);
      case 'crown':
        return new TorusGeometry(0.34, 0.1, 6, 12).rotateX(Math.PI / 2);
      case 'turbo':
        return lightningGeometry();
    }
  }

  pickupMaterial(kind: PickupKind): Material {
    switch (kind) {
      case 'coin':
        return this.materials.gold();
      case 'gold-bar':
        return this.materials.standard('#f2b51c', { metalness: 0.9, roughness: 0.18, emissive: '#c98a00', emissiveIntensity: 0.6 });
      case 'diamond':
        return this.materials.standard('#7fe3ff', { metalness: 0.3, roughness: 0.05, emissive: '#2fb8ff', emissiveIntensity: 1.1, transparent: true, opacity: 0.9 });
      case 'heart':
        return this.materials.standard('#ff2d55', { emissive: '#ff2d55', emissiveIntensity: 0.6, roughness: 0.3 });
      case 'crown':
        return this.materials.standard('#ffd54a', { emissive: '#ffb300', emissiveIntensity: 0.9, metalness: 0.8, roughness: 0.25 });
      case 'turbo':
        return this.materials.neon('#3fb8ff', 2.4);
    }
  }

  /** Enfeites da beira da pista, conforme o tema da região. */
  scenery(variant: number): Object3D {
    const key = `scenery-${this.theme.scenery}-${variant % 3}`;

    return this.template(key, () => this.buildScenery(variant % 3)).clone();
  }

  dispose(): void {
    for (const template of this.templates.values()) {
      disposeGeometries(template);
    }

    for (const texture of this.textures) {
      texture.dispose();
    }

    this.templates.clear();
  }

  private template(key: string, build: () => Object3D): Object3D {
    let template = this.templates.get(key);

    if (!template) {
      template = build();
      this.templates.set(key, template);
    }

    return template;
  }

  private texture(texture: CanvasTexture): CanvasTexture {
    this.textures.push(texture);

    return texture;
  }

  private buildObstacle(kind: Exclude<ObstacleKind, 'parked-car' | 'traffic-car'>): Object3D {
    const group = new Group();
    const materials = this.materials;

    switch (kind) {
      case 'barrier': {
        const stripes = materials.standard('#ffffff', { map: this.texture(stripeTexture('#e53935', '#ffffff')) });

        group.add(mesh(new BoxGeometry(2.0, 0.55, 0.3), stripes, 0, 0.62, 0), mesh(new BoxGeometry(0.12, 0.9, 0.5), materials.standard('#2b2b33'), -0.85, 0.45, 0), mesh(new BoxGeometry(0.12, 0.9, 0.5), materials.standard('#2b2b33'), 0.85, 0.45, 0));
        break;
      }
      case 'high-bar': {
        const post = materials.standard('#2b2b33', { metalness: 0.5 });

        group.add(mesh(new BoxGeometry(0.14, 1.65, 0.14), post, -1.1, 0.82, 0), mesh(new BoxGeometry(0.14, 1.65, 0.14), post, 1.1, 0.82, 0), mesh(new BoxGeometry(2.3, 0.4, 0.3), materials.standard('#ffffff', { map: this.texture(stripeTexture('#ffb300', '#1a1a1f')) }), 0, 1.4, 0));
        break;
      }
      case 'crate':
        group.add(mesh(new BoxGeometry(1.3, 1.3, 1.3), materials.standard('#ffffff', { map: this.texture(crateTexture()) }), 0, 0.65, 0));
        break;
      case 'cone':
        group.add(mesh(new ConeGeometry(0.33, 0.8, 10), materials.standard('#ff6d00', { roughness: 0.5 }), 0, 0.4, 0), mesh(new CylinderGeometry(0.22, 0.25, 0.12, 10), materials.standard('#ffffff'), 0, 0.42, 0));
        break;
      case 'banana':
        group.add(...this.buildBanana());
        break;
      case 'animal':
        // O bicho é sorteado pelo id na hora de montar a pista (ver `obstacle`).
        break;
      case 'sweeper':
        group.add(mesh(new BoxGeometry(1.8, 0.7, 0.4), materials.standard('#ffffff', { map: this.texture(stripeTexture('#ff3d00', '#1a1a1f')) }), 0, 0.6, 0), mesh(new CylinderGeometry(0.18, 0.18, 0.3, 10).rotateZ(Math.PI / 2), materials.standard('#111111'), -0.7, 0.18, 0), mesh(new CylinderGeometry(0.18, 0.18, 0.3, 10).rotateZ(Math.PI / 2), materials.standard('#111111'), 0.7, 0.18, 0));
        break;
    }

    return group;
  }

  /** Casca de banana aberta no chão: arco amarelo com as pontas escuras. */
  private buildBanana(): Mesh[] {
    const peel = this.materials.standard('#ffd23f', { roughness: 0.55 });
    const tip = this.materials.standard('#5a3b14', { roughness: 0.8 });
    const pieces: Mesh[] = [];

    for (let index = 0; index < 3; index += 1) {
      const strip = mesh(new TorusGeometry(0.22, 0.055, 8, 16, Math.PI * 0.9), peel, 0, 0.06, 0);

      strip.rotation.set(Math.PI / 2, 0, (index / 3) * Math.PI * 2);
      pieces.push(strip);
    }

    pieces.push(mesh(new SphereGeometry(0.06, 10, 8), tip, 0, 0.08, 0));

    return pieces;
  }

  /** Pato, gato ou porquinho: bichos de formas redondas que atravessam a pista. */
  private buildAnimal(variant: AnimalVariant): Object3D {
    const group = new Group();
    const materials = this.materials;
    const eye = materials.standard('#111111', { roughness: 0.2 });

    switch (variant) {
      case 'pato': {
        const feather = materials.standard('#ffffff', { roughness: 0.7 });
        const beak = materials.standard('#ff9a1f', { roughness: 0.5 });

        group.add(
          mesh(new SphereGeometry(0.34, 18, 14).scale(1, 0.85, 1.25), feather, 0, 0.38, 0),
          mesh(new SphereGeometry(0.2, 16, 12), feather, 0, 0.72, 0.28),
          mesh(new ConeGeometry(0.08, 0.2, 10).rotateX(Math.PI / 2), beak, 0, 0.7, 0.5),
          mesh(new SphereGeometry(0.03, 8, 6), eye, -0.09, 0.78, 0.43),
          mesh(new SphereGeometry(0.03, 8, 6), eye, 0.09, 0.78, 0.43),
          mesh(new CylinderGeometry(0.03, 0.03, 0.12, 6), beak, -0.1, 0.06, 0),
          mesh(new CylinderGeometry(0.03, 0.03, 0.12, 6), beak, 0.1, 0.06, 0),
        );
        break;
      }
      case 'gato': {
        const fur = materials.standard('#f08a2b', { roughness: 0.8 });
        const belly = materials.standard('#ffe2c2', { roughness: 0.8 });

        group.add(
          mesh(new SphereGeometry(0.3, 18, 14).scale(0.9, 0.85, 1.4), fur, 0, 0.42, 0),
          mesh(new SphereGeometry(0.2, 16, 12), fur, 0, 0.7, 0.36),
          mesh(new SphereGeometry(0.1, 12, 10).scale(1, 0.8, 0.8), belly, 0, 0.64, 0.5),
          mesh(new ConeGeometry(0.07, 0.15, 8), fur, -0.11, 0.9, 0.34),
          mesh(new ConeGeometry(0.07, 0.15, 8), fur, 0.11, 0.9, 0.34),
          mesh(new SphereGeometry(0.03, 8, 6), eye, -0.08, 0.74, 0.54),
          mesh(new SphereGeometry(0.03, 8, 6), eye, 0.08, 0.74, 0.54),
          mesh(new CylinderGeometry(0.035, 0.025, 0.5, 8).rotateX(-0.9), fur, 0, 0.62, -0.5),
        );
        break;
      }
      case 'porquinho': {
        const skin = materials.standard('#ff9fb6', { roughness: 0.6 });
        const snout = materials.standard('#ff7f9e', { roughness: 0.6 });

        group.add(
          mesh(new SphereGeometry(0.36, 18, 14).scale(1, 0.85, 1.3), skin, 0, 0.42, 0),
          mesh(new SphereGeometry(0.22, 16, 12), skin, 0, 0.55, 0.42),
          mesh(new CylinderGeometry(0.09, 0.09, 0.08, 14).rotateX(Math.PI / 2), snout, 0, 0.52, 0.64),
          mesh(new ConeGeometry(0.07, 0.12, 8), skin, -0.12, 0.76, 0.4),
          mesh(new ConeGeometry(0.07, 0.12, 8), skin, 0.12, 0.76, 0.4),
          mesh(new SphereGeometry(0.03, 8, 6), eye, -0.09, 0.62, 0.6),
          mesh(new SphereGeometry(0.03, 8, 6), eye, 0.09, 0.62, 0.6),
        );
        break;
      }
    }

    // De lado: o bicho atravessa a pista, não vem de frente.
    group.rotation.y = Math.PI / 2;

    return group;
  }

  private buildScenery(variant: number): Object3D {
    const group = new Group();
    const materials = this.materials;
    const accent = this.theme.accent;

    switch (this.theme.scenery) {
      case 'palms':
        group.add(buildPalm(materials, 3.8 + variant * 0.9, 0.25 + variant * 0.12));
        break;
      case 'buildings':
      case 'towers': {
        const isTower = this.theme.scenery === 'towers';
        const height = (isTower ? 14 : 7) + variant * (isTower ? 6 : 3);
        const wall = materials.standard(isTower ? '#141428' : ['#8fa3b8', '#c7b299', '#7f8c9d'][variant], { roughness: 0.6, metalness: isTower ? 0.6 : 0.1 });

        group.add(mesh(new BoxGeometry(5, height, 5), wall, 0, height / 2, 0));
        group.add(mesh(new BoxGeometry(5.05, 0.3, 5.05), materials.neon(isTower ? accent : '#ffe08a', isTower ? 1.8 : 0.4), 0, height * 0.66, 0));

        if (isTower) {
          group.add(mesh(new BoxGeometry(5.05, 0.25, 5.05), materials.neon('#3fb8ff', 1.6), 0, height * 0.33, 0));
        }

        break;
      }
      case 'rocks': {
        const rock = materials.standard('#8c8c96', { roughness: 0.95 });
        const snow = materials.standard('#ffffff', { roughness: 0.8 });
        const size = 1.6 + variant * 0.9;

        group.add(mesh(new DodecahedronGeometry(size, 0), rock, 0, size * 0.7, 0));
        group.add(mesh(new ConeGeometry(size * 0.75, size * 0.9, 6), snow, 0, size * 1.45, 0));
        break;
      }
      case 'dunes': {
        const sand = materials.standard('#e0a75e', { roughness: 1 });

        group.add(mesh(new SphereGeometry(3 + variant, 10, 6).scale(1.6, 0.35, 1), sand, 0, 0, 0));

        if (variant === 1) {
          group.add(mesh(new CylinderGeometry(0.25, 0.3, 2.4, 7), materials.standard('#3f8f4f'), 1.2, 1.2, 0));
        }

        break;
      }
      case 'neon': {
        const height = 5 + variant * 2;

        group.add(mesh(new BoxGeometry(0.5, height, 0.5), materials.standard('#0c0c18', { metalness: 0.7, roughness: 0.3 }), 0, height / 2, 0));
        group.add(mesh(new BoxGeometry(0.62, 0.5, 0.62), materials.neon(variant === 2 ? '#3fb8ff' : accent, 2), 0, height, 0));
        break;
      }
    }

    return group;
  }
}
