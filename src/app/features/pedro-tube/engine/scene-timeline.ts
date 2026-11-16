import type { TubeScene } from '../models/tube.model';

export const MAX_SCENES = 8;
export const MIN_SCENE_SECONDS = 1;
export const MAX_SCENE_SECONDS = 6;
export const MAX_SCENE_TEXT_LENGTH = 40;

export interface ScenePosition {
  readonly index: number;
  readonly scene: TubeScene;
  /** Quanto da cena já passou, de 0 a 1. */
  readonly progress: number;
}

/** Duração da animação inteira, em segundos. */
export function totalDuration(scenes: readonly TubeScene[]): number {
  return scenes.reduce((total, scene) => total + scene.seconds, 0);
}

/**
 * Qual cena aparece num instante da animação.
 *
 * Antes do começo vale a primeira cena; depois do fim, a última, parada no
 * final — assim a tela nunca fica vazia quando o vídeo termina.
 */
export function sceneAt(scenes: readonly TubeScene[], time: number): ScenePosition | null {
  if (scenes.length === 0) {
    return null;
  }

  let start = 0;

  for (let index = 0; index < scenes.length; index += 1) {
    const scene = scenes[index];
    const end = start + scene.seconds;

    if (time < end || index === scenes.length - 1) {
      const progress = scene.seconds > 0 ? (time - start) / scene.seconds : 1;

      return { index, scene, progress: Math.min(1, Math.max(0, progress)) };
    }

    start = end;
  }

  return null;
}

/** Segundo em que cada cena começa, para pular direto para ela. */
export function sceneStarts(scenes: readonly TubeScene[]): readonly number[] {
  const starts: number[] = [];
  let start = 0;

  for (const scene of scenes) {
    starts.push(start);
    start += scene.seconds;
  }

  return starts;
}

/** Tempo de cena dentro dos limites, em segundos inteiros. */
export function clampSceneSeconds(seconds: number): number {
  if (!Number.isFinite(seconds)) {
    return MIN_SCENE_SECONDS;
  }

  return Math.min(MAX_SCENE_SECONDS, Math.max(MIN_SCENE_SECONDS, Math.round(seconds)));
}
