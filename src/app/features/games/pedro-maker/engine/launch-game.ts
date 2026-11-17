import { THEME_PALETTES } from '../art/palettes';
import type { GameLaunchOptions, MakerGameSession } from '../models/session.model';
import { GameLoop } from './game-loop';
import { PARTNER_SEATS, PartnerInput } from './input/partner-input';
import { PlayerInput } from './input/player-input';
import { LevelView } from './render/level-view';
import { FrameBudgetMonitor, initialQualityTier, QUALITY } from './render/quality';
import { Stage } from './render/stage';
import { startsInUltra } from './render/ultra-resolution';
import { GameSimulation, MAX_PARTNERS, STEP_MS } from './simulation/game-simulation';

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
  let monitor = new FrameBudgetMonitor(tier);
  const partners = (options.partners ?? []).slice(0, MAX_PARTNERS);
  // Com amigos, as setas são do Jogador 2: o Jogador 1 fica com o lado esquerdo do teclado.
  const input = new PlayerInput(options.input, window, partners.length > 0 ? 'left-side' : 'whole');
  const partnerInputs = partners.map((_, index) => new PartnerInput(window, PARTNER_SEATS[index]));
  const readPartners = () => partnerInputs.map((partnerInput) => partnerInput.read());
  const resetInputs = (): void => {
    input.reset();
    input.setCapturing(true);

    for (const partnerInput of partnerInputs) {
      partnerInput.reset();
      partnerInput.setCapturing(true);
    }
  };

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
      running.step(input.read(), readPartners());
    }

    view.render(alpha, frameMs);

    const lower = monitor.sample(frameMs);

    if (!lower || !stage) {
      return;
    }

    // O HD e o 4K são os primeiros a sair: a qualidade só baixa se o jogo continuar engasgando sem ele.
    if (stage.isUltraResolution) {
      stage.leaveUltraResolution();
      monitor = new FrameBudgetMonitor(tier);
      return;
    }

    stage.applyQuality(lower);
    view.applyQuality(QUALITY[lower]);
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
      partners: partners.map((partner) => partner.hero),
    });
    const nextView = new LevelView(
      stage,
      nextSimulation,
      {
        character: options.character,
        partners,
        petEmoji: options.petEmoji,
        effectsEnabled: options.effectsEnabled,
        isTouch: options.isTouch,
      },
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
    resetInputs();
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
    stage = new Stage(
      options.parent,
      blueprint.theme,
      THEME_PALETTES[blueprint.theme],
      tier,
      startsInUltra(tier),
      options.screen,
    );
    rebuild();
  } catch (error) {
    // Sem WebGL não há jogo; o aviso sai depois do retorno, quando a tela já escuta.
    queueMicrotask(() => fail(NO_3D_MESSAGE, error));
  }

  return {
    pause: () => {
      loop.stop();
      input.setCapturing(false);

      for (const partnerInput of partnerInputs) {
        partnerInput.setCapturing(false);
      }
    },
    resume: () => {
      if (isDestroyed || !simulation) {
        return;
      }

      resetInputs();
      monitor.reset();
      loop.start();
    },
    retryFromCheckpoint: () => {
      if (isDestroyed || !simulation) {
        return;
      }

      simulation.retryFromCheckpoint();
      resetInputs();
      monitor.reset();
      loop.start();
    },
    restart: () => {
      if (!isDestroyed) {
        rebuild();
      }
    },
    setScreen: (screen) => {
      if (isDestroyed || !stage) {
        return;
      }

      stage.setScreenMode(screen);
      // Mudar o tamanho do quadro apaga a imagem: com o jogo pausado, redesenha atrás do menu.
      stage.render();
      monitor.reset();
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

      for (const partnerInput of partnerInputs) {
        partnerInput.dispose();
      }
    },
  };
}
