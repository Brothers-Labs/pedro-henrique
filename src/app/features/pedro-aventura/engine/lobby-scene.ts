import {
  PointLight,
  SpotLight,
  BufferAttribute,
  BufferGeometry,
  CylinderGeometry,
  Group,
  Mesh,
  type Object3D,
  PlaneGeometry,
  Points,
  PointsMaterial,
  SphereGeometry,
  TorusGeometry,
  Vector3,
  BoxGeometry,
  type CanvasTexture,
} from 'three';

import { REGIONS } from '../config/regions.config';
import type { Cosmetic } from '../models/economy.model';
import type { AventuraStage } from './aventura-stage';
import { buildVehicle, DogRig, PedroRig } from './characters';
import { disposeGeometries, MaterialLibrary } from './materials';
import { PropKit } from './props';
import { windowsTexture } from './textures';

export type LobbyFraming = 'lobby' | 'character';

export interface LobbyLook {
  readonly outfit: Cosmetic;
  readonly dog: Cosmetic;
  readonly vehicle: Cosmetic;
}

const STAR_COUNT = 260;

const FRAMING: Readonly<Record<LobbyFraming, { readonly position: Vector3; readonly target: Vector3; readonly fov: number }>> = {
  lobby: { position: new Vector3(0.6, 2.1, 7.4), target: new Vector3(0.6, 1.3, 0), fov: 50 },
  character: { position: new Vector3(0.2, 1.7, 5.2), target: new Vector3(0.2, 1.1, 0), fov: 48 },
};

/**
 * O lobby noturno: o Pedro e o Rex no pódio dourado, o carro escolhido atrás,
 * a mansão com as janelas acesas, a piscina e o céu estrelado.
 *
 * A câmera passeia devagar; com movimento reduzido ela fica parada.
 */
export class LobbyScene {
  private readonly materials = new MaterialLibrary();
  private readonly kit: PropKit;
  private readonly world = new Group();
  private readonly windows: CanvasTexture;
  private readonly stars: Points;
  private readonly spotlight = new SpotLight('#fff1d6', 90, 18, Math.PI / 5, 0.5, 1.6);
  private pedro: PedroRig;
  private dog: DogRig;
  private vehicle: Object3D;
  private time = 0;

  constructor(
    private readonly stage: AventuraStage,
    look: LobbyLook,
    private readonly framing: LobbyFraming,
    private readonly isMotionAllowed: boolean,
  ) {
    this.kit = new PropKit(this.materials, REGIONS[0].theme);
    this.windows = windowsTexture('#ffd27a', '#1b1626');
    stage.setSky({ top: '#05051a', bottom: '#3b1f5e', fogNear: 25, fogFar: 90, isNight: true });
    stage.scene.add(this.world);

    this.stars = this.buildStars();
    this.buildSet();
    this.world.add(this.stars);
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
    (this.stars.material as PointsMaterial).dispose();
    this.windows.dispose();
    this.kit.dispose();
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

  private buildSet(): void {
    const materials = this.materials;
    const add = (object: Object3D) => this.world.add(object);
    const at = (object: Mesh, x: number, y: number, z: number): Mesh => {
      object.position.set(x, y, z);
      object.castShadow = true;
      object.receiveShadow = true;

      return object;
    };

    const floor = at(new Mesh(new PlaneGeometry(90, 90), materials.standard('#0c0b14', { metalness: 0.55, roughness: 0.28 })), 0, 0, 0);
    floor.rotation.x = -Math.PI / 2;
    add(floor);

    // Pódio dourado com aro de neon.
    add(at(new Mesh(new CylinderGeometry(1.9, 2.05, 0.32, 40), materials.standard('#16141f', { metalness: 0.7, roughness: 0.3 })), 0.3, 0.16, 0));
    const rim = at(new Mesh(new TorusGeometry(1.95, 0.05, 8, 48), materials.neon('#f5c542', 2.2)), 0.3, 0.33, 0);
    rim.rotation.x = Math.PI / 2;
    add(rim);

    // Piscina iluminada atrás, à esquerda.
    const pool = at(new Mesh(new PlaneGeometry(7, 3), materials.neon('#0b6fb8', 0.35)), -7.5, 0.02, -5);
    pool.rotation.x = -Math.PI / 2;
    add(pool);

    // Luz de palco: o Pedro e o Rex são os astros, não silhuetas na noite.
    const key = this.spotlight;
    key.position.set(1.5, 6.5, 6);
    key.target.position.set(0.3, 1, 0);
    key.castShadow = true;
    add(key);
    add(key.target);

    const backLight = new PointLight('#3fb8ff', 18, 12, 1.8);
    backLight.position.set(-2.5, 3, -2.5);
    add(backLight);

    const fill = new PointLight('#ffcf7a', 10, 10, 1.8);
    fill.position.set(3, 2, 3);
    add(fill);

    // Mansão ao fundo: blocos com janelas acesas e frisos dourados.
    const wall = materials.standard('#ffffff', { map: this.windows, emissive: '#ffcf7a', emissiveIntensity: 0.25, roughness: 0.6 });

    for (const [x, width, height] of [[-9, 8, 6], [0, 10, 8], [10, 8, 5]] as const) {
      add(at(new Mesh(new BoxGeometry(width, height, 5), wall), x, height / 2, -13));
      add(at(new Mesh(new BoxGeometry(width + 0.3, 0.25, 5.3), materials.neon('#f5c542', 1.4)), x, height + 0.12, -13));
    }

    // Palmeiras nos lados.
    for (const [x, z, variant] of [[-6, -5, 0], [-9.5, -2, 1], [6.5, -6, 2], [9, -1, 0], [-3.5, -8, 2]] as const) {
      const palm = this.kit.scenery(variant);

      palm.position.set(x, 0, z);
      add(palm);
    }

    // Cordão de luzes entre as palmeiras.
    for (let index = 0; index <= 16; index += 1) {
      const t = index / 16;
      const bulb = new Mesh(new SphereGeometry(0.07, 8, 6), materials.neon(index % 2 === 0 ? '#ffd27a' : '#ffffff', 2.4));

      bulb.position.set(-9.5 + t * 18.5, 4.2 - Math.sin(t * Math.PI) * 1.1, -2 - t * 4);
      add(bulb);
    }

  }

  private buildStars(): Points {
    const positions = new Float32Array(STAR_COUNT * 3);

    for (let index = 0; index < STAR_COUNT; index += 1) {
      // Estrelas fixas, espalhadas por uma meia cúpula atrás do cenário.
      const angle = (index * 2.399963) % (Math.PI * 2);
      const height = 12 + ((index * 37) % 28);

      positions.set([Math.cos(angle) * 60, height, -30 - Math.abs(Math.sin(angle)) * 30], index * 3);
    }

    const geometry = new BufferGeometry();

    geometry.setAttribute('position', new BufferAttribute(positions, 3));

    return new Points(geometry, new PointsMaterial({ color: '#ffffff', size: 0.35, sizeAttenuation: true, fog: false }));
  }
}
