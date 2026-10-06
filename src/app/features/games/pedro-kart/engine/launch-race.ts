import { GameLoop } from '../../pedro-maker/engine/game-loop';
import { FrameBudgetMonitor, initialQualityTier, QUALITY } from '../../pedro-maker/engine/render/quality';
import { trackTheme } from '../config/theme.config';
import type { RaceLaunchOptions, RaceSession } from '../models/race-session.model';
import { RACE_STEP_MS, RaceSimulation, type RaceHud } from '../simulation/race-simulation';
import { DriveControls } from './drive-input';
import { KartStage } from './kart-stage';
import { RaceView } from './race-view';

const NO_3D_MESSAGE = 'Este aparelho não conseguiu abrir a corrida em 3D. Tente atualizar o navegador.';
/** O cronômetro do painel anda de décimo em décimo: atualizar a cada quadro não muda nada para o olho. */
const HUD_TICK_MS = 100;

/**
 * Cria uma corrida do Pedro Kart dentro de um elemento da página.
 *
 * É a única porta de entrada do motor 3D do kart. Este módulo, junto com o
 * Three.js, só é baixado quando uma corrida começa.
 */
export function launchKartRace(options: RaceLaunchOptions): RaceSession {
  const { listener } = options;
  const theme = trackTheme(options.track.theme);
  const tier = initialQualityTier();
  const monitor = new FrameBudgetMonitor(tier);
  const controls = new DriveControls(options.input, window);
  const seed = hashSeed(options.track.id);
  const race = new RaceSimulation({
    track: options.track,
    playerSetup: options.kart,
    playerName: options.playerName,
    rivalPace: options.rivalPace,
  });

  let stage: KartStage;

  try {
    stage = new KartStage(options.parent, theme, tier);
  } catch (error) {
    console.error('Pedro Kart: o WebGL não abriu.', error);
    controls.dispose();
    queueMicrotask(() => listener({ type: 'erro', message: NO_3D_MESSAGE }));

    return { pause: () => undefined, resume: () => undefined, destroy: () => undefined };
  }

  const view = new RaceView(stage, race, theme, QUALITY[tier], {
    kart: options.kart,
    driver: options.driver,
    minimap: options.minimap,
    seed,
  });
  let lastHud: RaceHud | null = null;
  let isDestroyed = false;

  const publishHud = (): void => {
    const hud = race.hud();

    if (!lastHud || hasHudChanged(lastHud, hud)) {
      lastHud = hud;
      listener({ type: 'painel', hud });
    }
  };

  const loop = new GameLoop((steps, alpha, frameMs) => {
    if (controls.consumePauseRequest()) {
      listener({ type: 'pausa-pedida' });
      return;
    }

    for (let step = 0; step < steps; step += 1) {
      race.step(controls.read());
    }

    for (const event of race.drainEvents()) {
      listener({ type: 'corrida', event });
    }

    publishHud();
    view.render(alpha, frameMs);

    const lower = monitor.sample(frameMs);

    if (lower) {
      stage.applyQuality(lower);
    }
  }, RACE_STEP_MS);

  controls.setCapturing(true);
  view.render(0, RACE_STEP_MS);
  publishHud();
  listener({ type: 'pronto' });
  loop.start();

  return {
    pause: () => {
      loop.stop();
      controls.setCapturing(false);
    },
    resume: () => {
      if (isDestroyed) {
        return;
      }

      monitor.reset();
      controls.setCapturing(true);
      loop.start();
    },
    destroy: () => {
      if (isDestroyed) {
        return;
      }

      isDestroyed = true;
      loop.stop();
      controls.dispose();
      view.dispose();
      stage.dispose();
    },
  };
}

function hasHudChanged(previous: RaceHud, next: RaceHud): boolean {
  return (
    previous.phase !== next.phase ||
    previous.lap !== next.lap ||
    previous.position !== next.position ||
    previous.item !== next.item ||
    Math.floor(previous.elapsedMs / HUD_TICK_MS) !== Math.floor(next.elapsedMs / HUD_TICK_MS)
  );
}

/** Semente do cenário a partir do id da pista: a mesma pista tem sempre as mesmas árvores. */
function hashSeed(text: string): number {
  let hash = 2166136261;

  for (let index = 0; index < text.length; index += 1) {
    hash = Math.imul(hash ^ text.charCodeAt(index), 16777619);
  }

  return hash >>> 0;
}
