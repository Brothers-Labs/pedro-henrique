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
import { shoe, trailColor } from '../config/runner.config';
import type { RunnerSetup } from '../models/runner.model';
import { RunnerModel, type RunnerPose } from './runner-model';

/** Uma volta inteira na vitrine leva doze segundos: devagar, para dar tempo de olhar. */
const TURN_SPEED = (Math.PI * 2) / 12_000;
const RESTING_ANGLE = -0.6;

/** Na vitrine o Pedro corre no lugar, devagarinho, para mostrar o tênis em ação. */
const JOG_POSE: RunnerPose = {
  speed: 10,
  maxSpeed: 40,
  steer: 0,
  lateralVelocity: 0,
  isGrounded: true,
  isFalling: false,
  airStyle: 'pulo',
  isHoming: false,
  isDashing: false,
  isBoosting: false,
  isStumbling: false,
  isBlinking: false,
  hasShield: false,
  hasMagnet: false,
};

export interface ShowroomOptions {
  readonly parent: HTMLElement;
  readonly setup: RunnerSetup;
  readonly look: CharacterPalette;
  /** Falso no modo calmo ou quando o sistema pede menos movimento: o Pedro fica parado. */
  readonly isAnimated: boolean;
}

export interface Showroom {
  show(setup: RunnerSetup): void;
  dispose(): void;
}

/**
 * A vitrine do vestiário: o Pedro de tênis novo num pedestal que gira.
 *
 * Usa o mesmo modelo da partida, então o visual que aparece aqui é
 * exatamente o que vai para a pista.
 */
export function launchShowroom(options: ShowroomOptions): Showroom {
  const { parent } = options;
  const renderer = new WebGLRenderer({ antialias: true, alpha: true });
  const scene = new Scene();
  const camera = new PerspectiveCamera(30, 1, 0.1, 100);
  const pedestal = new Mesh(new CylinderGeometry(1.8, 2, 0.4, 40), new MeshStandardMaterial({ color: '#ffffff', roughness: 0.6 }));
  const sun = new DirectionalLight('#ffffff', 2.2);

  renderer.outputColorSpace = SRGBColorSpace;
  renderer.toneMapping = ACESFilmicToneMapping;
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
  renderer.domElement.style.cssText = 'display:block;width:100%;height:100%;';
  renderer.domElement.setAttribute('aria-hidden', 'true');
  parent.appendChild(renderer.domElement);

  pedestal.position.y = -0.2;
  sun.position.set(-4, 8, 6);
  scene.add(new HemisphereLight('#dff3ff', '#6a5a8a', 1.4), sun, pedestal);
  camera.position.set(0, 2.2, 6.4);
  camera.lookAt(0, 0.9, 0);

  let model: RunnerModel | null = null;
  let frame: number | null = null;
  let angle = RESTING_ANGLE;
  let lastTime: number | null = null;

  const draw = (): void => {
    renderer.render(scene, camera);
  };

  const show = (setup: RunnerSetup): void => {
    model?.dispose();
    model = new RunnerModel({ palette: options.look, shoeColor: shoe(setup.shoe).color, trailColor: trailColor(setup.trail).hex });
    model.update(JOG_POSE, 0, 0);
    model.root.rotation.y = angle;
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

    const elapsed = lastTime === null ? 0 : time - lastTime;

    angle += elapsed * TURN_SPEED;
    lastTime = time;

    if (model) {
      model.update(JOG_POSE, elapsed / 1000, time);
      // `update` endireita o corpo a cada quadro; o giro da vitrine vem depois.
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
