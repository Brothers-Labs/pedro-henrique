import type { TubeScene } from '../models/tube.model';
import { clampSceneSeconds, MAX_SCENE_SECONDS, sceneAt, sceneStarts, totalDuration } from './scene-timeline';

const scene = (emoji: string, seconds: number): TubeScene => ({ emoji, text: '', background: '#2ba8e0', motion: 'pular', seconds });
const SCENES = [scene('🦖', 2), scene('🚀', 3), scene('🍕', 1)];

describe('Linha do tempo da animação', () => {
  it('soma o tempo das cenas e sabe onde cada uma começa', () => {
    expect(totalDuration(SCENES)).toBe(6);
    expect(totalDuration([])).toBe(0);
    expect(sceneStarts(SCENES)).toEqual([0, 2, 5]);
  });

  it('mostra a cena certa em cada instante, com o quanto dela já passou', () => {
    expect(sceneAt(SCENES, 0)).toEqual({ index: 0, scene: SCENES[0], progress: 0 });
    expect(sceneAt(SCENES, 1)?.progress).toBe(0.5);
    expect(sceneAt(SCENES, 2)?.index).withContext('a virada já é a cena seguinte').toBe(1);
    expect(sceneAt(SCENES, 4.5)?.index).toBe(1);
    expect(sceneAt(SCENES, 5.5)?.scene.emoji).toBe('🍕');
  });

  it('antes do começo fica na primeira cena; depois do fim, parada na última', () => {
    expect(sceneAt(SCENES, -3)).toEqual({ index: 0, scene: SCENES[0], progress: 0 });
    expect(sceneAt(SCENES, 99)).toEqual({ index: 2, scene: SCENES[2], progress: 1 });
    expect(sceneAt([], 1)).toBeNull();
  });

  it('o tempo de cada cena fica entre 1 e o máximo, em segundos inteiros', () => {
    expect(clampSceneSeconds(0)).toBe(1);
    expect(clampSceneSeconds(2.6)).toBe(3);
    expect(clampSceneSeconds(99)).toBe(MAX_SCENE_SECONDS);
    expect(clampSceneSeconds(Number.NaN)).toBe(1);
  });
});
