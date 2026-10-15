import { GameLoop } from '../../games/pedro-maker/engine/game-loop';
import { FrameBudgetMonitor, initialQualityTier, type QualityTier } from '../../games/pedro-maker/engine/render/quality';
import { type Difficulty, difficultyById } from '../config/difficulty.config';
import type { QualityPreference } from '../models/aventura-state.model';
import type { LevelDefinition, RegionId, RegionStatus, RegionTheme } from '../models/campaign.model';
import { generateLayout } from '../simulation/level-generator';
import { NO_COMMANDS, RUN_STEP_MS, type RunEvent, type RunHud, RunSimulation, type RunStats } from '../simulation/run-simulation';
import { AventuraStage } from './aventura-stage';
import { type LobbyFraming, type LobbyLook, LobbyScene } from './lobby-scene';
import { MapScene } from './map-scene';
import { type RunCommand, RunInput } from './run-input';
import { type RunLook, RunScene } from './run-scene';

const NO_3D_MESSAGE = 'Este aparelho não conseguiu abrir o jogo em 3D. Tente atualizar o navegador ou usar outro aparelho.';
/** O painel anda de décimo em décimo: atualizar a cada quadro não muda nada para o olho. */
const HUD_INTERVAL_MS = 100;

interface SceneHost {
  render(frameSeconds: number): void;
  dispose(): void;
}

export interface SceneSession {
  pause(): void;
  resume(): void;
  destroy(): void;
}

interface BaseOptions {
  readonly parent: HTMLElement;
  readonly quality: QualityPreference;
  readonly isMotionAllowed: boolean;
  readonly onContextChange: (isLost: boolean) => void;
}

function resolveTier(preference: QualityPreference): QualityTier {
  return preference === 'auto' ? initialQualityTier() : preference;
}

/**
 * Monta palco, cena e relógio, e devolve os controles da sessão.
 *
 * Na qualidade automática, o monitor de quadros baixa a qualidade quando o
 * aparelho engasga — e só desce, para a imagem não ficar piscando.
 */
function startScene<TScene extends SceneHost>(
  options: BaseOptions,
  buildScene: (stage: AventuraStage, tier: QualityTier) => TScene,
  onFrame: (scene: TScene, steps: number, frameMs: number) => void = () => undefined,
): { readonly scene: TScene; readonly stage: AventuraStage; readonly session: SceneSession } {
  const tier = resolveTier(options.quality);
  const monitor = options.quality === 'auto' ? new FrameBudgetMonitor(tier) : null;
  let isContextLost = false;
  let isPaused = false;

  const stage = new AventuraStage(options.parent, {
    tier,
    onContextLost: () => {
      isContextLost = true;
      loop.stop();
      options.onContextChange(true);
    },
    onContextRestored: () => {
      isContextLost = false;
      monitor?.reset();

      if (!isPaused) {
        loop.start();
      }

      options.onContextChange(false);
    },
  });

  let scene: TScene;

  try {
    scene = buildScene(stage, tier);
  } catch (error) {
    // Sem cena não há o que mostrar: o canvas e o contexto WebGL não podem ficar para trás.
    stage.dispose();
    throw error;
  }

  const loop = new GameLoop((steps, _alpha, frameMs) => {
    onFrame(scene, steps, frameMs);
    scene.render(frameMs / 1000);

    const lower = monitor?.sample(frameMs) ?? null;

    if (lower) {
      stage.applyQuality(lower);
    }
  }, RUN_STEP_MS);

  loop.start();

  return {
    scene,
    stage,
    session: {
      pause: () => {
        isPaused = true;
        loop.stop();
      },
      resume: () => {
        isPaused = false;
        monitor?.reset();

        if (!isContextLost) {
          loop.start();
        }
      },
      destroy: () => {
        loop.stop();
        scene.dispose();
        stage.dispose();
      },
    },
  };
}

/* Corrida -------------------------------------------------------------------------------- */

export type RunSessionEvent =
  | { readonly type: 'ready' }
  | { readonly type: 'hud'; readonly hud: RunHud }
  | { readonly type: 'events'; readonly events: readonly RunEvent[] }
  | { readonly type: 'finished'; readonly phase: 'victory' | 'defeat' }
  | { readonly type: 'pause-requested' }
  | { readonly type: 'context'; readonly isLost: boolean }
  | { readonly type: 'error'; readonly message: string };

export interface RunLaunchOptions {
  readonly parent: HTMLElement;
  readonly level: LevelDefinition;
  readonly difficulty: Difficulty;
  readonly theme: RegionTheme;
  readonly look: RunLook;
  readonly quality: QualityPreference;
  readonly isMotionAllowed: boolean;
  readonly listener: (event: RunSessionEvent) => void;
}

export interface RunSession extends SceneSession {
  /** Larga depois da contagem regressiva. */
  start(): void;
  continueFromCheckpoint(): void;
  press(command: RunCommand): void;
  stats(): RunStats;
}

/**
 * Cria uma partida dentro de um elemento da página.
 *
 * É a única porta de entrada do motor da corrida: este módulo, com o
 * three.js, só é baixado quando a fase abre.
 */
export function launchRun(options: RunLaunchOptions): RunSession {
  const { listener } = options;
  const run = new RunSimulation(options.level, generateLayout(options.level, options.difficulty), difficultyById(options.difficulty));
  const input = new RunInput(window, options.parent);
  let lastHudAt = 0;
  let lastPhase = run.phase;

  try {
    const { session } = startScene(
      { ...options, onContextChange: (isLost) => listener({ type: 'context', isLost }) },
      (stage, tier) => new RunScene(stage, run, options.theme, options.look, tier, options.isMotionAllowed),
      (scene, steps, frameMs) => {
        if (input.consumePauseRequest() && run.phase === 'playing') {
          listener({ type: 'pause-requested' });
          return;
        }

        for (let step = 0; step < steps; step += 1) {
          run.step(step === 0 ? input.consume() : NO_COMMANDS);
        }

        const events = run.drainEvents();

        for (const event of events) {
          scene.handle(event);
        }

        if (events.length > 0) {
          listener({ type: 'events', events });
        }

        lastHudAt += frameMs;

        if (lastHudAt >= HUD_INTERVAL_MS || run.phase !== lastPhase) {
          lastHudAt = 0;
          listener({ type: 'hud', hud: run.hud() });
        }

        if (run.phase !== lastPhase) {
          lastPhase = run.phase;
          input.setEnabled(run.phase === 'playing');

          if (run.phase === 'victory' || run.phase === 'defeat') {
            listener({ type: 'finished', phase: run.phase });
          }
        }
      },
    );

    queueMicrotask(() => {
      listener({ type: 'hud', hud: run.hud() });
      listener({ type: 'ready' });
    });

    return {
      start: () => {
        run.start();
        input.setEnabled(true);
      },
      pause: () => {
        run.pause();
        input.setEnabled(false);
        session.pause();
      },
      resume: () => {
        run.resume();
        input.setEnabled(true);
        session.resume();
      },
      continueFromCheckpoint: () => {
        run.continueFromCheckpoint();
        input.setEnabled(true);
        session.resume();
      },
      press: (command) => input.press(command),
      stats: () => run.result(),
      destroy: () => {
        input.dispose();
        session.destroy();
      },
    };
  } catch (error) {
    console.error('Pedro Aventura: o WebGL não abriu.', error);
    input.dispose();
    queueMicrotask(() => listener({ type: 'error', message: NO_3D_MESSAGE }));

    return {
      start: () => undefined,
      pause: () => undefined,
      resume: () => undefined,
      continueFromCheckpoint: () => undefined,
      press: () => undefined,
      stats: () => run.result(),
      destroy: () => undefined,
    };
  }
}

/* Lobby e personagem ---------------------------------------------------------------------- */

export interface LobbyLaunchOptions extends BaseOptions {
  readonly look: LobbyLook;
  readonly framing: LobbyFraming;
}

export interface LobbySession extends SceneSession {
  setLook(look: LobbyLook): void;
}

export function launchLobby(options: LobbyLaunchOptions): LobbySession {
  const { scene, session } = startScene(
    options,
    // Reflexo do ambiente só onde o aparelho aguenta: na qualidade baixa o mármore fica fosco.
    (stage, tier) => new LobbyScene(stage, options.look, options.framing, options.isMotionAllowed, tier !== 'baixa'),
  );

  return { ...session, setLook: (look) => scene.setLook(look) };
}

/* Mapa -------------------------------------------------------------------------------- */

export interface MapLaunchOptions extends BaseOptions {
  readonly labels: ReadonlyMap<RegionId, HTMLElement>;
  readonly onSelect: (regionId: RegionId) => void;
}

export interface MapSession extends SceneSession {
  setStatuses(statuses: ReadonlyMap<RegionId, RegionStatus>, selected: RegionId | null): void;
}

export function launchMap(options: MapLaunchOptions): MapSession {
  const { scene, session } = startScene(options, (stage) => new MapScene(stage, options.labels, options.onSelect, options.isMotionAllowed));

  return { ...session, setStatuses: (statuses, selected) => scene.setStatuses(statuses, selected) };
}
