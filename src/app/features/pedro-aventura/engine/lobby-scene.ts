import {
  BufferAttribute,
  BufferGeometry,
  type CanvasTexture,
  CylinderGeometry,
  Group,
  Mesh,
  type Material,
  type Object3D,
  PlaneGeometry,
  PMREMGenerator,
  PointLight,
  Points,
  PointsMaterial,
  SphereGeometry,
  SpotLight,
  type Texture,
  TorusGeometry,
  Vector3,
} from 'three';
import { RoomEnvironment } from 'three/examples/jsm/environments/RoomEnvironment.js';
import { RoundedBoxGeometry } from 'three/examples/jsm/geometries/RoundedBoxGeometry.js';

import type { Cosmetic } from '../models/economy.model';
import type { AventuraStage } from './aventura-stage';
import { buildVehicle, DogRig, PedroRig } from './characters';
import { disposeGeometries, MaterialLibrary } from './materials';
import { buildPalm } from './nature';
import { marbleTexture, villaGlassTexture, windowsTexture } from './textures';

export type LobbyFraming = 'lobby' | 'character';

export interface LobbyLook {
  readonly outfit: Cosmetic;
  readonly dog: Cosmetic;
  readonly vehicle: Cosmetic;
}

const STAR_COUNT = 260;
const SKYLINE_TOWERS = 16;

const FRAMING: Readonly<Record<LobbyFraming, { readonly position: Vector3; readonly target: Vector3; readonly fov: number }>> = {
  lobby: { position: new Vector3(0.6, 2.1, 7.4), target: new Vector3(0.6, 1.3, 0), fov: 50 },
  character: { position: new Vector3(0.2, 1.7, 5.2), target: new Vector3(0.2, 1.1, 0), fov: 48 },
};

function placed(mesh: Mesh, x: number, y: number, z: number): Mesh {
  mesh.position.set(x, y, z);
  mesh.castShadow = true;
  mesh.receiveShadow = true;

  return mesh;
}

function rounded(width: number, height: number, depth: number, radius = 0.05): RoundedBoxGeometry {
  return new RoundedBoxGeometry(width, height, depth, 3, radius);
}

/**
 * O lobby noturno: o Pedro e o Rex no pódio dourado, o carro escolhido, a
 * mansão moderna com as vidraças acesas, a piscina, o jardim, a cidade ao
 * fundo e o céu estrelado com a lua.
 *
 * Na qualidade média e alta o piso de mármore e o metal do carro refletem o
 * ambiente. A câmera passeia devagar; com movimento reduzido ela fica parada.
 */
export class LobbyScene {
  private readonly materials = new MaterialLibrary();
  private readonly world = new Group();
  private readonly textures: CanvasTexture[] = [];
  private readonly ownMaterials: Material[] = [];
  private readonly stars: Points;
  private readonly spotlight = new SpotLight('#fff1d6', 90, 18, Math.PI / 5, 0.5, 1.6);
  private environment: Texture | null = null;
  private pedro: PedroRig;
  private dog: DogRig;
  private vehicle: Object3D;
  private time = 0;

  constructor(
    private readonly stage: AventuraStage,
    look: LobbyLook,
    private readonly framing: LobbyFraming,
    private readonly isMotionAllowed: boolean,
    hasReflections: boolean,
  ) {
    stage.setSky({ top: '#04041a', bottom: '#3b1f5e', fogNear: 30, fogFar: 110, isNight: true });
    stage.scene.add(this.world);

    if (hasReflections) {
      const generator = new PMREMGenerator(stage.renderer);

      this.environment = generator.fromScene(new RoomEnvironment(), 0.04).texture;
      generator.dispose();
      stage.scene.environment = this.environment;
      stage.scene.environmentIntensity = 0.35;
    }

    this.stars = this.buildStars();
    this.world.add(this.stars);
    this.buildSet();
    this.pedro = this.createPedro(look.outfit);
    this.dog = this.createDog(look.dog);
    this.vehicle = this.createVehicle(look.vehicle);

    const view = FRAMING[framing];

    stage.camera.fov = view.fov;
    stage.camera.position.copy(view.position);
    stage.camera.lookAt(view.target);
    stage.camera.updateProjectionMatrix();
  }

  /** Troca roupa, cachorro e carro sem recriar o cenário. */
  setLook(look: LobbyLook): void {
    this.pedro.dispose();
    this.dog.dispose();
    disposeGeometries(this.vehicle);
    this.pedro = this.createPedro(look.outfit);
    this.dog = this.createDog(look.dog);
    this.vehicle = this.createVehicle(look.vehicle);
  }

  render(frameSeconds: number): void {
    this.time += frameSeconds;

    const motion = this.isMotionAllowed ? 1 : 0;

    this.pedro.pose('idle', this.time, 1, motion);
    this.dog.pose('sit', this.time, 1, motion);

    if (this.isMotionAllowed) {
      const view = FRAMING[this.framing];
      const angle = Math.sin(this.time * 0.12) * 0.22;
      const radius = view.position.z;

      this.stage.camera.position.set(view.target.x + Math.sin(angle) * radius, view.position.y, Math.cos(angle) * radius);
      this.stage.camera.lookAt(view.target);
    }

    this.stage.follow(0, 0, 0);
    this.stage.render();
  }

  dispose(): void {
    this.pedro.dispose();
    this.dog.dispose();
    disposeGeometries(this.vehicle);
    disposeGeometries(this.world);
    this.spotlight.dispose();
    this.stars.geometry.dispose();

    for (const material of this.ownMaterials) {
      material.dispose();
    }

    for (const texture of this.textures) {
      texture.dispose();
    }

    if (this.environment) {
      this.stage.scene.environment = null;
      this.environment.dispose();
    }

    this.materials.dispose();
  }

  private createPedro(outfit: Cosmetic): PedroRig {
    const rig = new PedroRig(this.materials, outfit.palette);

    rig.root.position.set(this.framing === 'character' ? -0.3 : 0, 0.32, 0);
    rig.root.rotation.y = 0.15;
    this.stage.scene.add(rig.root);

    return rig;
  }

  private createDog(dog: Cosmetic): DogRig {
    const rig = new DogRig(this.materials, dog.palette, dog.id !== 'rex' && dog.id !== 'rex-azul');

    rig.root.position.set(this.framing === 'character' ? 0.75 : 1.05, 0.32, 0.35);
    rig.root.rotation.y = -0.35;
    this.stage.scene.add(rig.root);

    return rig;
  }

  private createVehicle(vehicle: Cosmetic): Object3D {
    const model = buildVehicle(this.materials, vehicle.vehicleShape ?? 'suv', vehicle.palette);

    model.position.set(3.6, 0, -2.6);
    model.rotation.y = -0.65;
    this.stage.scene.add(model);

    return model;
  }

  private texture(texture: CanvasTexture): CanvasTexture {
    this.textures.push(texture);

    return texture;
  }

  private buildSet(): void {
    const materials = this.materials;
    const add = (object: Object3D) => this.world.add(object);

    // Piso de mármore polido, em placas grandes.
    const marble = this.texture(marbleTexture());

    marble.repeat.set(14, 14);

    const floor = placed(new Mesh(new PlaneGeometry(90, 90), materials.standard('#ffffff', { map: marble, metalness: 0.35, roughness: 0.2 })), 0, 0, 0);

    floor.rotation.x = -Math.PI / 2;
    add(floor);

    // Pódio dourado com aro de neon.
    add(placed(new Mesh(new CylinderGeometry(1.9, 2.05, 0.32, 48), materials.standard('#141219', { metalness: 0.8, roughness: 0.22 })), 0.3, 0.16, 0));
    const podiumRim = placed(new Mesh(new TorusGeometry(1.95, 0.05, 10, 64), materials.neon('#f5c542', 2.2)), 0.3, 0.33, 0);

    podiumRim.rotation.x = Math.PI / 2;
    add(podiumRim);

    this.buildPool();
    this.buildVilla(-1, -13, 1);
    this.buildVilla(11, -16, 0.8);
    this.buildSkyline();
    this.buildGarden();
    this.buildLights();

    const moon = placed(new Mesh(new SphereGeometry(2.2, 32, 24), materials.standard('#fff6dc', { emissive: '#fff1c8', emissiveIntensity: 1.2 })), -24, 26, -70);

    moon.castShadow = false;
    add(moon);
  }

  /** Piscina de borda de pedra com água iluminada por dentro. */
  private buildPool(): void {
    const materials = this.materials;
    const water = placed(
      new Mesh(new PlaneGeometry(7, 3), materials.standard('#0b78c7', { metalness: 0.5, roughness: 0.08, emissive: '#0a5fa6', emissiveIntensity: 0.55 })),
      -7.5,
      0.03,
      -5,
    );
    const stone = materials.standard('#d9d2c3', { roughness: 0.7 });

    water.rotation.x = -Math.PI / 2;
    this.world.add(
      water,
      placed(new Mesh(rounded(7.6, 0.14, 0.3), stone), -7.5, 0.07, -3.35),
      placed(new Mesh(rounded(7.6, 0.14, 0.3), stone), -7.5, 0.07, -6.65),
      placed(new Mesh(rounded(0.3, 0.14, 3.6), stone), -11.15, 0.07, -5),
      placed(new Mesh(rounded(0.3, 0.14, 3.6), stone), -3.85, 0.07, -5),
    );
  }

  /**
   * Mansão moderna: dois pavimentos em balanço, vidraças acesas, sacada de
   * vidro, painel de madeira e frisos de luz dourada sob as lajes.
   */
  private buildVilla(x: number, z: number, scale: number): void {
    const materials = this.materials;
    const villa = new Group();
    const wall = materials.standard('#ece7de', { roughness: 0.8 });
    const slab = materials.standard('#f7f4ee', { roughness: 0.6 });
    const wood = materials.standard('#7a5234', { roughness: 0.7 });
    const glass = materials.standard('#ffffff', { map: this.texture(villaGlassTexture()), emissive: '#ffb366', emissiveIntensity: 0.55, roughness: 0.15 });
    const railing = new Mesh(new PlaneGeometry(9.6, 0.9), materials.standard('#9fd3ff', { transparent: true, opacity: 0.25, metalness: 0.5, roughness: 0.05 }));
    const glow = materials.neon('#ffd27a', 1.8);

    railing.position.set(0.5, 4.75, 2.3);
    villa.add(
      // Térreo: parede com vidraça inteira na frente.
      placed(new Mesh(rounded(12, 3.6, 6, 0.06), wall), 0, 1.8, 0),
      placed(new Mesh(new PlaneGeometry(9, 2.8), glass), -0.6, 1.6, 3.01),
      placed(new Mesh(rounded(2, 3.6, 0.2, 0.04), wood), 4.6, 1.8, 3.05),
      // Laje do primeiro andar, em balanço, com friso de luz por baixo.
      placed(new Mesh(rounded(13.5, 0.35, 7.4, 0.06), slab), 0.4, 3.8, 0.2),
      placed(new Mesh(new PlaneGeometry(13.4, 0.08), glow), 0.4, 3.61, 3.91),
      // Primeiro andar recuado, com vidraça e sacada.
      placed(new Mesh(rounded(10, 3, 5.4, 0.06), wall), 0.6, 5.5, -0.6),
      placed(new Mesh(new PlaneGeometry(8, 2.3), glass), 0.6, 5.4, 2.11),
      railing,
      // Cobertura.
      placed(new Mesh(rounded(11.5, 0.3, 6.6, 0.06), slab), 0.6, 7.15, -0.4),
      placed(new Mesh(new PlaneGeometry(11.4, 0.07), glow), 0.6, 6.99, 2.91),
    );
    villa.position.set(x, 0, z);
    villa.scale.setScalar(scale);
    this.world.add(villa);
  }

  /** Cidade ao longe: torres com janelas acesas que a névoa apaga aos poucos. */
  private buildSkyline(): void {
    const windows = this.texture(windowsTexture('#ffd27a', '#141428'));

    windows.repeat.set(2, 4);

    const tower = this.materials.standard('#ffffff', { map: windows, emissive: '#ffcf7a', emissiveIntensity: 0.35, roughness: 0.4, metalness: 0.4 });

    for (let index = 0; index < SKYLINE_TOWERS; index += 1) {
      const height = 12 + ((index * 7) % 5) * 5;
      const width = 4 + (index % 3);

      this.world.add(placed(new Mesh(new RoundedBoxGeometry(width, height, 4, 2, 0.15), tower), -42 + index * 6, height / 2, -48 - (index % 4) * 4));
    }
  }

  /** Palmeiras curvas, cercas vivas e arbustos redondos. */
  private buildGarden(): void {
    const hedge = this.materials.standard('#1f5a34', { roughness: 0.9 });
    const bush = this.materials.standard('#2c7a45', { roughness: 0.9 });

    for (const [x, z, height, lean] of [[-6, -6.5, 5.2, 0.4], [-10, -2.5, 6, -0.35], [7, -7, 5.6, -0.3], [9.5, -1.5, 4.8, 0.45], [-3, -9, 6.4, 0.2]] as const) {
      const palm = buildPalm(this.materials, height, lean);

      palm.position.set(x, 0, z);
      palm.rotation.y = x * 0.7;
      this.world.add(palm);
    }

    this.world.add(
      placed(new Mesh(rounded(6, 0.9, 0.9, 0.35), hedge), -5.5, 0.45, -9.6),
      placed(new Mesh(rounded(5, 0.9, 0.9, 0.35), hedge), 4.5, 0.45, -9.6),
    );

    for (const [x, z] of [[-2.6, -3], [2.4, -3.4], [-4.3, -1.2], [5.6, -4.2]] as const) {
      this.world.add(placed(new Mesh(new SphereGeometry(0.55, 16, 12).scale(1.2, 0.85, 1.2), bush), x, 0.45, z));
    }
  }

  /** Luz de palco no pódio, postes de jardim e o cordão de lâmpadas. */
  private buildLights(): void {
    const materials = this.materials;
    const post = materials.standard('#1c1a22', { metalness: 0.7, roughness: 0.3 });
    const lamp = materials.neon('#ffd9a0', 2.4);

    const key = this.spotlight;

    key.position.set(1.5, 6.5, 6);
    key.target.position.set(0.3, 1, 0);
    key.castShadow = true;
    this.world.add(key, key.target);

    const backLight = new PointLight('#3fb8ff', 18, 12, 1.8);

    backLight.position.set(-2.5, 3, -2.5);

    const fill = new PointLight('#ffcf7a', 10, 10, 1.8);

    fill.position.set(3, 2, 3);
    this.world.add(backLight, fill);

    // Postes afastados da câmera: de perto, a lâmpada viraria um borrão na frente do título.
    for (const [x, z] of [[-7, -2.5], [6.5, -1.5], [-11, -6], [11, -5]] as const) {
      this.world.add(
        placed(new Mesh(new CylinderGeometry(0.05, 0.07, 2.4, 10), post), x, 1.2, z),
        placed(new Mesh(new SphereGeometry(0.16, 16, 12), lamp), x, 2.5, z),
      );
    }

    for (let index = 0; index <= 18; index += 1) {
      const t = index / 18;
      const bulb = new Mesh(new SphereGeometry(0.06, 10, 8), materials.neon(index % 2 === 0 ? '#ffd27a' : '#ffffff', 2.4));

      bulb.position.set(-10 + t * 19.5, 4.4 - Math.sin(t * Math.PI) * 1.1, -2.5 - t * 4.5);
      this.world.add(bulb);
    }
  }

  private buildStars(): Points {
    const positions = new Float32Array(STAR_COUNT * 3);

    for (let index = 0; index < STAR_COUNT; index += 1) {
      // Estrelas fixas, espalhadas por uma meia cúpula atrás do cenário.
      const angle = (index * 2.399963) % (Math.PI * 2);
      const height = 14 + ((index * 37) % 30);

      positions.set([Math.cos(angle) * 70, height, -40 - Math.abs(Math.sin(angle)) * 30], index * 3);
    }

    const geometry = new BufferGeometry();
    const material = new PointsMaterial({ color: '#ffffff', size: 0.35, sizeAttenuation: true, fog: false });

    geometry.setAttribute('position', new BufferAttribute(positions, 3));
    this.ownMaterials.push(material);

    return new Points(geometry, material);
  }
}
