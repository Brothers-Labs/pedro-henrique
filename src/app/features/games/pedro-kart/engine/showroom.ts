import {
  ACESFilmicToneMapping,
  CylinderGeometry,
  DirectionalLight,
  HemisphereLight,
  Mesh,
  MeshStandardMaterial,
  PerspectiveCamera,
  Scene,
  SRGBColorSpace,
  WebGLRenderer,
} from 'three';

import type { CharacterPalette } from '../../pedro-maker/config/character.config';
import { kartColor } from '../config/kart.config';
import type { KartSetup } from '../models/kart.model';
import { KartModel } from './kart-model';

/** Uma volta inteira na vitrine leva doze segundos: devagar, para dar tempo de olhar. */
const TURN_SPEED = (Math.PI * 2) / 12_000;
const RESTING_ANGLE = -0.6;

export interface ShowroomOptions {
  readonly parent: HTMLElement;
  readonly setup: KartSetup;
  readonly driver: CharacterPalette;
  /** Falso no modo calmo ou quando o sistema pede menos movimento: o kart fica parado. */
  readonly isAnimated: boolean;
}

export interface Showroom {
  show(setup: KartSetup): void;
  dispose(): void;
}

/**
 * A vitrine da garagem: o kart escolhido girando num pedestal.
 *
 * Usa o mesmo modelo da corrida, então o kart que aparece aqui é exatamente
 * o que vai para a pista.
 */
export function launchShowroom(options: ShowroomOptions): Showroom {
  const { parent } = options;
  const renderer = new WebGLRenderer({ antialias: true, alpha: true });
  const scene = new Scene();
  const camera = new PerspectiveCamera(32, 1, 0.1, 100);
  const pedestal = new Mesh(
    new CylinderGeometry(2.6, 2.8, 0.4, 40),
    new MeshStandardMaterial({ color: '#ffffff', roughness: 0.7 }),
  );
  const sun = new DirectionalLight('#ffffff', 2.2);

  renderer.outputColorSpace = SRGBColorSpace;
  renderer.toneMapping = ACESFilmicToneMapping;
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
  renderer.domElement.style.cssText = 'display:block;width:100%;height:100%;';
  renderer.domElement.setAttribute('aria-hidden', 'true');
  parent.appendChild(renderer.domElement);

  pedestal.position.y = -0.2;
  sun.position.set(-4, 8, 6);
  scene.add(new HemisphereLight('#dff3ff', '#8a7a6a', 1.4), sun, pedestal);
  camera.position.set(0, 3.2, 7.4);
  camera.lookAt(0, 0.8, 0);

  let model: KartModel | null = null;
  let frame: number | null = null;
  let angle = RESTING_ANGLE;
  let lastTime: number | null = null;

  const draw = (): void => {
    renderer.render(scene, camera);
  };

  const show = (setup: KartSetup): void => {
    model?.dispose();
    model = new KartModel(setup.body, kartColor(setup.color).hex, options.driver);
    model.root.rotation.y = angle;
    model.update({ speed: 0, steer: 0, isBoosting: false, hasStar: false }, 0, 0);
    scene.add(model.root);
    draw();
  };

  const resize = (): void => {
    const width = Math.max(1, parent.clientWidth);
    const height = Math.max(1, parent.clientHeight);

    renderer.setSize(width, height, false);
    camera.aspect = width / height;
    camera.updateProjectionMatrix();
    draw();
  };

  const tick = (time: number): void => {
    frame = requestAnimationFrame(tick);
    angle += (lastTime === null ? 0 : time - lastTime) * TURN_SPEED;
    lastTime = time;

    if (model) {
      model.root.rotation.y = angle;
    }

    draw();
  };

  const observer = new ResizeObserver(resize);
  observer.observe(parent);
  show(options.setup);
  resize();

  if (options.isAnimated) {
    frame = requestAnimationFrame(tick);
  }

  return {
    show,
    dispose: () => {
      if (frame !== null) {
        cancelAnimationFrame(frame);
      }

      observer.disconnect();
      model?.dispose();
      pedestal.geometry.dispose();
      pedestal.material.dispose();
      renderer.dispose();
      renderer.forceContextLoss();
      renderer.domElement.remove();
    },
  };
}
