import { GameLoop } from '../../pedro-maker/engine/game-loop';
import { FrameBudgetMonitor, initialQualityTier } from '../../pedro-maker/engine/render/quality';
import { STEP_MS } from '../config/craft-physics.config';
import type { CraftEngineSettings, CraftGameSession, CraftLaunchOptions } from '../models/craft-session.model';
import { generateWorld } from '../world/world-generator';
import { CraftInputReader } from './input/craft-input-reader';
import { nextTask } from './next-task';
import { CraftStage } from './render/craft-stage';
import { CraftView } from './render/craft-view';
import { CraftSimulation } from './simulation/craft-simulation';

const NO_3D_MESSAGE = 'Este aparelho não conseguiu abrir o jogo em 3D. Tente atualizar o navegador.';
const BUILD_FAILED_MESSAGE = 'Não foi possível montar este mundo.';

/** Fração da barra de carga gasta gerando o mundo; o resto é a malha. */
const GENERATION_SHARE = 0.25;

/**
 * Cria uma partida do PedroCraft dentro de um elemento da página.
 *
 * É a única porta de entrada do motor 3D: quem chama recebe uma sessão com
 * pausa, retomada, preferências e `destroy`, e nunca toca no motor
 * diretamente. Este módulo só é baixado quando um mundo abre.
 */
export function launchCraftGame(options: CraftLaunchOptions): CraftGameSession {
  const { listener } = options;
  const tier = initialQualityTier();
  const monitor = new FrameBudgetMonitor(tier);
  let settings: CraftEngineSettings = options.settings;
  let stage: CraftStage | null = null;
  let simulation: CraftSimulation | null = null;
  let view: CraftView | null = null;
  let input: CraftInputReader | null = null;
  let isDestroyed = false;
  let wasPointerLocked = false;

  const loop = new GameLoop((steps, alpha, frameMs) => {
    if (!simulation || !view || !input) {
      return;
    }

    simulation.look(input.readLook());

    for (let step = 0; step < steps && loop.isRunning; step += 1) {
      const snapshot = input.read();

      if (snapshot.pausePressed) {
        listener({ type: 'pause-requested' });
      }

      simulation.step(snapshot);
    }

    view.render(alpha);

    const lower = monitor.sample(frameMs);

    if (lower) {
      view.applyQuality(lower);
    }
  }, STEP_MS);

  /** Soltar o ponteiro (Esc no computador) é pedir pausa: o mouse volta a ser do menu. */
  const onPointerLockChange = (): void => {
    const isLocked = input?.isPointerLocked ?? false;

    if (wasPointerLocked && !isLocked && loop.isRunning) {
      listener({ type: 'pause-requested' });
    }

    wasPointerLocked = isLocked;
  };

  const fail = (message: string, error: unknown): void => {
    console.error(`PedroCraft: ${message}`, error);
    listener({ type: 'error', message });
  };

  const build = async (activeStage: CraftStage): Promise<void> => {
    listener({ type: 'loading', progress: 0 });
    await nextTask();

    const generated = generateWorld(options.catalog, options.seed);
    const nextSimulation = new CraftSimulation({
      catalog: options.catalog,
      world: generated.world,
      spawn: generated.layout.spawn,
      autoJump: settings.autoJump,
    });
    const nextView = new CraftView(activeStage, nextSimulation);

    listener({ type: 'loading', progress: GENERATION_SHARE });

    try {
      await nextView.build((progress) => {
        if (!isDestroyed) {
          listener({ type: 'loading', progress: GENERATION_SHARE + progress * (1 - GENERATION_SHARE) });
        }
      });
    } catch (error) {
      nextView.dispose();
      throw error;
    }

    if (isDestroyed) {
      nextView.dispose();
      return;
    }

    simulation = nextSimulation;
    view = nextView;
    input = new CraftInputReader(options.input, window, activeStage.canvas, () => settings.lookSensitivity);
    input.reset();
    document.addEventListener('pointerlockchange', onPointerLockChange);
    listener({ type: 'ready' });
    monitor.reset();
    loop.start();
  };

  try {
    stage = new CraftStage(options.parent, tier);
    build(stage).catch((error: unknown) => fail(BUILD_FAILED_MESSAGE, error));
  } catch (error) {
    // Sem WebGL não há jogo; o aviso sai depois do retorno, quando a tela já escuta.
    queueMicrotask(() => fail(NO_3D_MESSAGE, error));
  }

  return {
    pause: () => {
      loop.stop();
      input?.setCapturing(false);
    },
    resume: () => {
      if (isDestroyed || !simulation) {
        return;
      }

      input?.reset();
      input?.setCapturing(true);
      monitor.reset();
      loop.start();
    },
    updateSettings: (next) => {
      settings = next;
      simulation?.setAutoJump(next.autoJump);
    },
    destroy: () => {
      if (isDestroyed) {
        return;
      }

      isDestroyed = true;
      loop.stop();
      document.removeEventListener('pointerlockchange', onPointerLockChange);
      input?.dispose();
      input = null;
      view?.dispose();
      view = null;
      simulation = null;
      stage?.dispose();
      stage = null;
    },
  };
}
