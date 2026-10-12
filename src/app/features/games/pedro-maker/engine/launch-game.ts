import { THEME_PALETTES } from '../art/palettes';
import type { GameLaunchOptions, MakerGameSession } from '../models/session.model';
import { GameLoop } from './game-loop';
import { PlayerInput } from './input/player-input';
import { LevelView } from './render/level-view';
import { FrameBudgetMonitor, initialQualityTier, QUALITY } from './render/quality';
import { Stage } from './render/stage';
import { GameSimulation, STEP_MS } from './simulation/game-simulation';

const NO_3D_MESSAGE = 'Este aparelho não conseguiu abrir o jogo em 3D. Tente atualizar o navegador.';
const BUILD_FAILED_MESSAGE = 'Não foi possível montar esta fase.';

/**
 * Cria uma partida do Pedro Maker dentro de um elemento da página.
 *
 * É a única porta de entrada do motor 3D: quem chama recebe uma sessão com
 * pausa, retomada, recomeço e `destroy`, e nunca toca no motor diretamente.
 * Este módulo só é baixado quando alguém abre uma fase.
 */
export function launchMakerGame(options: GameLaunchOptions): MakerGameSession {
  const { blueprint, listener } = options;
  const tier = initialQualityTier();
  const monitor = new FrameBudgetMonitor(tier);
  const input = new PlayerInput(options.input, window);

  let stage: Stage | null = null;
  let simulation: GameSimulation | null = null;
  let view: LevelView | null = null;
  let isDestroyed = false;
  /** Cada montagem ganha um número: uma montagem antiga que termina tarde é descartada. */
  let buildNumber = 0;

  const loop = new GameLoop((steps, alpha, frameMs) => {
    const running = simulation;

    if (!running || !view) {
      return;
    }

    for (let step = 0; step < steps && loop.isRunning; step += 1) {
      running.step(input.read());
    }

    view.render(alpha, frameMs);

    const lower = monitor.sample(frameMs);

    if (lower && stage) {
      stage.applyQuality(lower);
      view.applyQuality(QUALITY[lower]);
    }
  }, STEP_MS);

  const fail = (message: string, error: unknown): void => {
    console.error(`Pedro Maker: ${message}`, error);
    listener({ type: 'error', message });
  };

  const build = async (): Promise<void> => {
    const number = ++buildNumber;

    if (!stage) {
      return;
    }

    const nextSimulation = new GameSimulation({
      blueprint,
      hero: options.character.hero,
      rules: options.rules,
      isTouch: options.isTouch,
      listener,
    });
    const nextView = new LevelView(
      stage,
      nextSimulation,
      { character: options.character, petEmoji: options.petEmoji, effectsEnabled: options.effectsEnabled, isTouch: options.isTouch },
      options.parent,
    );

    try {
      await nextView.build((progress) => {
        if (number === buildNumber && !isDestroyed) {
          listener({ type: 'loading', progress });
        }
      });
    } catch (error) {
      nextView.dispose();
      throw error;
    }

    if (number !== buildNumber || isDestroyed) {
      nextView.dispose();
      return;
    }

    simulation = nextSimulation;
    view = nextView;
    input.reset();
    input.setCapturing(true);
    nextSimulation.announceReady();
    monitor.reset();
    loop.start();
  };

  const rebuild = (): void => {
    loop.stop();
    view?.dispose();
    view = null;
    simulation = null;
    build().catch((error: unknown) => fail(BUILD_FAILED_MESSAGE, error));
  };

  try {
    stage = new Stage(options.parent, blueprint.theme, THEME_PALETTES[blueprint.theme], tier);
    rebuild();
  } catch (error) {
    // Sem WebGL não há jogo; o aviso sai depois do retorno, quando a tela já escuta.
    queueMicrotask(() => fail(NO_3D_MESSAGE, error));
  }

  return {
    pause: () => {
      loop.stop();
      input.setCapturing(false);
    },
    resume: () => {
      if (isDestroyed || !simulation) {
        return;
      }

      input.reset();
      input.setCapturing(true);
      monitor.reset();
      loop.start();
    },
    retryFromCheckpoint: () => {
      if (isDestroyed || !simulation) {
        return;
      }

      simulation.retryFromCheckpoint();
      input.reset();
      input.setCapturing(true);
      monitor.reset();
      loop.start();
    },
    restart: () => {
      if (!isDestroyed) {
        rebuild();
      }
    },
    destroy: () => {
      if (isDestroyed) {
        return;
      }

      isDestroyed = true;
      buildNumber += 1;
      loop.stop();
      view?.dispose();
      view = null;
      simulation = null;
      stage?.dispose();
      stage = null;
      input.dispose();
    },
  };
}
