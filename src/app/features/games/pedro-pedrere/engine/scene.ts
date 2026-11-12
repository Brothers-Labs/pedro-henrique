import type { HeroLook } from '../config/hero-look.config';
import type { LevelLayout } from '../levels/level-layout';
import type { ControlLayout, ControlState } from '../models/controls.model';
import type { GameEvent, HudEntry, SceneResult } from '../models/scene.model';
import type { HeroMotion } from '../simulation/hero-motion';
import type { HeroMotionKind } from './hero-painter';
import type { WorldCamera } from './world-painter';

/**
 * Blocos que cabem na largura da tela, no mínimo. Num celular em pé a fase
 * inteira não cabe na altura sem virar formiguinha; com este mínimo ela fica
 * no meio da tela, e os botões de toque ficam na terra, embaixo dela.
 */
const MIN_COLUMNS_IN_VIEW = 10;
/** O Pedro fica um pouco antes do meio da tela, para ver o que vem pela frente. */
const HERO_SCREEN_ANCHOR = 0.4;

/**
 * Um modo de jogo pronto para a tela: a simulação com o desenho por cima.
 *
 * O componente que roda o jogo só conhece esta interface. Aventura, corrida
 * e pula-pula entram por ela, e um modo novo não exige mexer no componente.
 */
export interface PedrereScene {
  readonly controls: ControlLayout;
  /** Para o leitor de tela: o que o canvas está mostrando. */
  readonly description: string;
  step(controls: ControlState): readonly GameEvent[];
  paint(context: CanvasRenderingContext2D, width: number, height: number, timeSeconds: number): void;
  hud(): readonly HudEntry[];
  /** Aviso grande no meio da tela, como a contagem da largada. */
  banner(): string | null;
  result(): SceneResult | null;
}

export interface SceneOptions {
  readonly look: HeroLook;
}

/** Câmera das fases deitadas: mostra a fase inteira na altura e segue o Pedro para os lados. */
export function followCamera(layout: LevelLayout, heroX: number, width: number, height: number): WorldCamera {
  const scale = Math.min(height / layout.height, width / MIN_COLUMNS_IN_VIEW);
  const columnsInView = width / scale;
  const maxLeft = Math.max(0, layout.width - columnsInView);
  const left = Math.min(maxLeft, Math.max(0, heroX - columnsInView * HERO_SCREEN_ANCHOR));

  return { scale, left, offsetY: (height - layout.height * scale) / 2 };
}

/** Semente nova para cada partida dos modos gerados, para o Pedro não decorar onde fica cada coisa. */
export function randomSeed(): number {
  return Math.floor(Math.random() * 2 ** 31);
}

export function motionKindOf(hero: HeroMotion): HeroMotionKind {
  if (!hero.isGrounded) {
    return 'no-ar';
  }

  return Math.abs(hero.body.vx) > 0.5 ? 'correndo' : 'parado';
}
