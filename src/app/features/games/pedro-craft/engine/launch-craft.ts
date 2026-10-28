import { GameLoop } from '../../pedro-maker/engine/game-loop';
import { FrameBudgetMonitor, initialQualityTier } from '../../pedro-maker/engine/render/quality';
import { STEP_MS } from '../config/craft-physics.config';
import type { CraftEngineSettings, CraftGameSession, CraftLaunchOptions, ScreenView } from '../models/craft-session.model';
import { generateWorld } from '../world/world-generator';
import { cleanWorldSave } from '../world/world-save';
import { CraftInputReader } from './input/craft-input-reader';
import { nextTask } from './next-task';
import { CraftStage } from './render/craft-stage';
import { CraftView } from './render/craft-view';
import { hudState, screenView } from './session-views';
import { CraftSimulation } from './simulation/craft-simulation';
import { progressFromCompleted } from './simulation/goal-tracker';
import { captureWorld, restoreWorld } from './world-snapshot';

const NO_3D_MESSAGE = 'Este aparelho não conseguiu abrir o jogo em 3D. Tente atualizar o navegador.';
const BUILD_FAILED_MESSAGE = 'Não foi possível montar este mundo.';

/** Fração da barra de carga gasta gerando o mundo; o resto é a malha. */
const GENERATION_SHARE = 0.25;

/** Com uma tela aberta o mundo para, mas as fornalhas seguem assando neste ritmo. */
const SCREEN_TICK_MS = 200;

/**
 * Cria uma partida do PedroCraft dentro de um elemento da página.
 *
 * É a única porta de entrada do motor 3D: quem chama recebe uma sessão com
 * pausa, retomada, mochila, preferências e `destroy`, e nunca toca no motor
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
  let reportedHudVersion = -1;
  let screenTimer: ReturnType<typeof setInterval> | null = null;

  /** Repassa à tela o que a simulação anotou desde o último quadro. */
  const publish = (running: CraftSimulation): void => {
    for (const event of running.drainEvents()) {
      listener(event);
    }

    if (running.hudVersion !== reportedHudVersion) {
      reportedHudVersion = running.hudVersion;
      listener({ type: 'hud', hud: hudState(running) });
    }
  };

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

    publish(simulation);
    view.render(alpha, frameMs);

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

  const stop = (): void => {
    loop.stop();
    input?.setCapturing(false);
  };

  const start = (): void => {
    if (isDestroyed || !simulation) {
      return;
    }

    input?.reset();
    input?.setCapturing(true);
    monitor.reset();
    loop.start();
  };

  const withSimulation = (action: (running: CraftSimulation) => void): ScreenView | null => {
    if (!simulation) {
      return null;
    }

    action(simulation);
    publish(simulation);

    return screenView(simulation);
  };

  /** Para o mundo para a tela aberta e deixa as fornalhas assando enquanto ela estiver na frente. */
  const holdForScreen = (): ScreenView | null => {
    stop();
    stopScreenTimer();
    screenTimer = setInterval(() => {
      if (simulation?.screens.screen?.kind === 'furnace') {
        simulation.tickFurnaces(SCREEN_TICK_MS);

        const view = screenView(simulation);

        if (view) {
          listener({ type: 'screen', view });
        }
      }
    }, SCREEN_TICK_MS);

    return withSimulation(() => undefined);
  };

  const stopScreenTimer = (): void => {
    if (screenTimer !== null) {
      clearInterval(screenTimer);
      screenTimer = null;
    }
  };

  const build = async (activeStage: CraftStage): Promise<void> => {
    listener({ type: 'loading', progress: 0 });
    await nextTask();

    const { catalog } = options;
    const { state } = cleanWorldSave(options.world, catalog);
    const generated = generateWorld(catalog, options.world.seed);
    const nextSimulation = new CraftSimulation({
      catalog,
      world: generated.world,
      spawn: generated.layout.spawn,
      autoJump: settings.autoJump,
      randomSeed: options.world.seed,
      peaceful: settings.peaceful,
      guideFirstSteps: options.guideFirstSteps,
      mode: options.world.mode,
      inventory: state?.inventory,
      goals: state ? progressFromCompleted(catalog.goals, state.goals.completed, state.goals.amount) : undefined,
    });

    if (state) {
      restoreWorld(nextSimulation, state);
    }

    const nextView = new CraftView(activeStage, nextSimulation);

    nextView.setEffectsEnabled(settings.effectsEnabled);
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
    publish(nextSimulation);
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
    pause: stop,
    resume: start,
    updateSettings: (next) => {
      settings = next;
      simulation?.setAutoJump(next.autoJump);
      simulation?.setPeaceful(next.peaceful);
      view?.setEffectsEnabled(next.effectsEnabled);
    },
    selectSlot: (index) => {
      withSimulation((running) => running.selectSlot(index));
    },
    openInventory: () => {
      if (!simulation || simulation.screens.screen) {
        return null;
      }

      simulation.openScreen('inventory', { announce: false });

      return holdForScreen();
    },
    showScreen: holdForScreen,
    clickSlot: (ref, mode) => withSimulation((running) => running.clickSlot(ref, mode)),
    takeGridResult: () => withSimulation((running) => running.takeGridResult()),
    craftRecipe: (recipeId) => withSimulation((running) => running.craftRecipe(recipeId)),
    closeScreen: () => {
      stopScreenTimer();
      withSimulation((running) => running.closeScreen());
      start();
    },
    takeCreativeItem: (itemId) => withSimulation((running) => running.giveCreativeItem(itemId)),
    skipFirstSteps: () => {
      withSimulation((running) => running.skipFirstSteps());
    },
    capture: () => (simulation ? captureWorld(simulation, options.world, new Date().toISOString()) : null),
    destroy: () => {
      if (isDestroyed) {
        return;
      }

      isDestroyed = true;
      loop.stop();
      stopScreenTimer();
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
