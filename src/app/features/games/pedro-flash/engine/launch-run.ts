import { GameLoop } from '../../pedro-maker/engine/game-loop';
import { FrameBudgetMonitor, initialQualityTier, QUALITY } from '../../pedro-maker/engine/render/quality';
import { seedFromText } from '../../pedro-maker/levels/seeded-random';
import { flashTheme } from '../config/theme.config';
import type { RunLaunchOptions, RunSession } from '../models/run-session.model';
import { RUN_STEP_MS, RunSimulation, type RunHud } from '../simulation/run-simulation';
import { FlashStage } from './flash-stage';
import { RunControls } from './run-input';
import { RunView } from './run-view';

const NO_3D_MESSAGE = 'Este aparelho não conseguiu abrir o Pedro Flash em 3D. Tente atualizar o navegador.';
/** O cronômetro do painel anda de décimo em décimo: atualizar a cada quadro não muda nada para o olho. */
const HUD_TICK_MS = 100;

/**
 * Cria uma partida do Pedro Flash dentro de um elemento da página.
 *
 * É a única porta de entrada do motor 3D do jogo. Este módulo, junto com o
 * Three.js, só é baixado quando uma partida começa.
 */
export function launchFlashRun(options: RunLaunchOptions): RunSession {
  const { listener } = options;
  const theme = flashTheme(options.setup.course.theme);
  const tier = initialQualityTier();
  const monitor = new FrameBudgetMonitor(tier);
  const controls = new RunControls(options.input, window);
  const seed = seedFromText(options.setup.course.id);
  const run = new RunSimulation(options.setup);

  let stage: FlashStage;

  try {
    stage = new FlashStage(options.parent, theme, tier, seed);
  } catch (error) {
    console.error('Pedro Flash: o WebGL não abriu.', error);
    controls.dispose();
    queueMicrotask(() => listener({ type: 'erro', message: NO_3D_MESSAGE }));

    return { pause: () => undefined, resume: () => undefined, destroy: () => undefined };
  }

  const view = new RunView(stage, run, theme, QUALITY[tier], { look: options.look, setup: options.setup.playerSetup, seed });
  let lastHud: RunHud | null = null;
  let isDestroyed = false;

  const publishHud = (): void => {
    const hud = run.hud();

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
      run.step(controls.read());
    }

    for (const event of run.drainEvents()) {
      view.react(event);
      listener({ type: 'partida', event });
    }

    publishHud();
    view.render(alpha, frameMs, performance.now());

    const lower = monitor.sample(frameMs);

    if (lower) {
      stage.applyQuality(lower);
    }
  }, RUN_STEP_MS);

  controls.setCapturing(true);
  view.render(0, RUN_STEP_MS, performance.now());
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

function hasHudChanged(previous: RunHud, next: RunHud): boolean {
  return (
    previous.phase !== next.phase ||
    previous.raios !== next.raios ||
    Math.floor(previous.energy) !== Math.floor(next.energy) ||
    previous.canDash !== next.canDash ||
    previous.hasShield !== next.hasShield ||
    previous.hasMagnet !== next.hasMagnet ||
    previous.isDashing !== next.isDashing ||
    previous.isFast !== next.isFast ||
    previous.position !== next.position ||
    previous.boss?.hitsLeft !== next.boss?.hitsLeft ||
    previous.boss?.isTired !== next.boss?.isTired ||
    Math.floor(previous.elapsedMs / HUD_TICK_MS) !== Math.floor(next.elapsedMs / HUD_TICK_MS)
  );
}
