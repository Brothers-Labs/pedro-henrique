import { formatPlacement, formatRaceTime } from '../../pedro-kart/race-format';
import { PHYSICS } from '../config/physics.config';
import { createRaceTrack } from '../levels/race-track';
import { RaceSimulation, type RivalRunner } from '../simulation/race-simulation';
import { type HeroMotionKind, INK, paintHero } from './hero-painter';
import { followCamera, motionKindOf, type PedrereScene, type SceneOptions } from './scene';
import { paintBackground, paintGoal, paintTerrain, screenX, screenY } from './world-painter';

/** Quanto tempo o "JÁ!" fica na tela depois da largada. */
const GO_BANNER_SECONDS = 0.7;
/** Os rivais ficam meio transparentes para nunca esconderem o Pedro. */
const RIVAL_OPACITY = 0.6;

export interface RaceSceneOptions extends SceneOptions {
  /** Semente da pista e dos tropeços: a mesma semente repete a mesma corrida. */
  readonly seed: number;
}

/** A corrida na tela: pista, rivais e o Pedro na frente de todos. */
export function createRaceScene(options: RaceSceneOptions): PedrereScene {
  const simulation = new RaceSimulation(createRaceTrack(options.seed), options.seed);
  const { layout, hero, track } = simulation;

  return {
    controls: 'corrida',
    description: 'Corrida: o Pedro corre sozinho contra três amigos e pula os tijolos até a chegada.',
    step: (controls) => simulation.step(controls),
    result: () => simulation.result(),
    banner: () => {
      const countdown = simulation.countdownValue();

      if (countdown !== null) {
        return String(countdown);
      }

      return simulation.elapsedSeconds < GO_BANNER_SECONDS ? 'JÁ!' : null;
    },
    hud: () => [
      { id: 'posicao', emoji: '🏁', label: 'Posição', value: formatPlacement(simulation.currentPlacement()) },
      { id: 'tempo', emoji: '⏱️', label: 'Tempo', value: formatRaceTime(simulation.elapsedSeconds * 1000) },
    ],
    paint: (context, width, height, timeSeconds) => {
      const camera = followCamera(layout, hero.body.x, width, height);
      const groundFeetY = layout.start.row + 1;

      paintBackground(context, track.level.theme, width, height, camera.left * camera.scale);
      paintTerrain(context, layout, track.level.theme, camera, width, height);
      paintGoal(context, layout.goal, camera);

      for (const rival of simulation.rivals) {
        const centerX = screenX(camera, rival.x + PHYSICS.heroWidth / 2);
        const feetY = screenY(camera, groundFeetY - rival.lift);

        paintHero(context, rival.profile.look, {
          centerX,
          feetY,
          scale: camera.scale,
          facing: 1,
          motion: rivalMotion(rival, simulation),
          timeSeconds: timeSeconds + rival.profile.speed,
          opacity: RIVAL_OPACITY,
        });
        paintName(context, rival.profile.name, centerX, feetY - camera.scale * 1.5, camera.scale);
      }

      paintHero(context, options.look, {
        centerX: screenX(camera, hero.body.x + hero.body.width / 2),
        feetY: screenY(camera, hero.body.y + hero.body.height),
        scale: camera.scale,
        facing: 1,
        motion: simulation.status === 'contagem' ? 'parado' : motionKindOf(hero),
        timeSeconds,
      });
    },
  };
}

function rivalMotion(rival: RivalRunner, simulation: RaceSimulation): HeroMotionKind {
  if (rival.lift > 0) {
    return 'no-ar';
  }

  const isRunning = simulation.status !== 'contagem' && rival.stumbleLeft === 0 && rival.finishedAtSeconds === null;

  return isRunning ? 'correndo' : 'parado';
}

function paintName(context: CanvasRenderingContext2D, name: string, x: number, y: number, size: number): void {
  context.font = `800 ${Math.round(size * 0.32)}px sans-serif`;
  context.textAlign = 'center';
  context.textBaseline = 'bottom';
  context.lineWidth = Math.max(2, size * 0.08);
  context.strokeStyle = '#ffffff';
  context.strokeText(name, x, y);
  context.fillStyle = INK;
  context.fillText(name, x, y);
}
