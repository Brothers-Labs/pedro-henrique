import type { PedrereLevel } from '../models/level.model';
import { AdventureSimulation } from '../simulation/adventure-simulation';
import { paintHero } from './hero-painter';
import { followCamera, motionKindOf, type PedrereScene, type SceneOptions } from './scene';
import {
  paintBackground,
  paintCheckpoint,
  paintCoin,
  paintGoal,
  paintPebble,
  paintTerrain,
  screenX,
  screenY,
} from './world-painter';

/** Piscadas por segundo do Pedro enquanto está protegido depois de se machucar. */
const BLINK_RATE = 12;

/** Uma fase de aventura na tela: a simulação da fase com o desenho por cima. */
export function createAdventureScene(level: PedrereLevel, options: SceneOptions): PedrereScene {
  const simulation = new AdventureSimulation(level);
  const { layout, hero } = simulation;

  return {
    controls: 'plataforma',
    description: `Fase ${level.name}: o Pedro corre e pula até a bandeira de chegada.`,
    step: (controls) => simulation.step(controls),
    result: () => simulation.result(),
    banner: () => null,
    hud: () => [
      { id: 'vidas', emoji: '❤️', label: 'Vidas', value: String(simulation.hearts) },
      { id: 'moedas', emoji: '🪙', label: 'Moedas', value: `${simulation.coins}/${simulation.totalCoins}` },
    ],
    paint: (context, width, height, timeSeconds) => {
      const camera = followCamera(layout, hero.body.x, width, height);

      paintBackground(context, level.theme, width, height, camera.left * camera.scale);
      paintTerrain(context, layout, level.theme, camera, width, height);

      layout.checkpoints.forEach((checkpoint, index) =>
        paintCheckpoint(context, checkpoint, camera, simulation.checkpointIndex === index),
      );
      paintGoal(context, layout.goal, camera);

      layout.coins.forEach((coin, index) => {
        if (!simulation.isCoinCollected(index)) {
          paintCoin(context, screenX(camera, coin.column), screenY(camera, coin.row), camera.scale, timeSeconds);
        }
      });

      for (const pebble of simulation.pebbles) {
        if (pebble.isVisible) {
          paintPebble(context, pebble.body, camera, pebble.direction, !pebble.isActive);
        }
      }

      const isBlinking = simulation.invulnerableLeft > 0 && Math.floor(timeSeconds * BLINK_RATE) % 2 === 0;

      paintHero(context, options.look, {
        centerX: screenX(camera, hero.body.x + hero.body.width / 2),
        feetY: screenY(camera, hero.body.y + hero.body.height),
        scale: camera.scale,
        facing: hero.facing,
        motion: motionKindOf(hero),
        timeSeconds,
        opacity: isBlinking ? 0.35 : 1,
      });
    },
  };
}
