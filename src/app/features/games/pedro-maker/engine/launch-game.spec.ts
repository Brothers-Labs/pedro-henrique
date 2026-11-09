import { DEFAULT_LOOK, paletteFor } from '../config/character.config';
import { DIFFICULTY_RULES } from '../config/rules.config';
import { campaignLevelById } from '../levels/campaign';
import type { LevelBlueprint } from '../models/level.model';
import type { GameSessionEvent, HudState, MakerGameSession, VirtualInputState } from '../models/session.model';
import { launchMakerGame } from './launch-game';

const BOOT_TIMEOUT_MS = 15000;

interface RunningGame {
  readonly session: MakerGameSession;
  readonly events: GameSessionEvent[];
  readonly input: VirtualInputState;
  readonly parent: HTMLElement;
}

function blueprintOf(id: string): LevelBlueprint {
  const level = campaignLevelById(id);

  if (!level) {
    throw new Error(`Fase ${id} não existe.`);
  }

  return level.build();
}

function start(blueprint: LevelBlueprint): RunningGame {
  const parent = document.createElement('div');
  parent.style.cssText = 'position:fixed;left:0;top:0;width:640px;height:360px;';
  document.body.appendChild(parent);

  const events: GameSessionEvent[] = [];
  const input: VirtualInputState = { left: false, right: false, run: false, jump: false, action: false };
  const session = launchMakerGame({
    parent,
    blueprint,
    rules: DIFFICULTY_RULES.aventura,
    character: paletteFor(DEFAULT_LOOK, 'pedro'),
    effectsEnabled: true,
    isTouch: false,
    petEmoji: '🐶',
    input,
    listener: (event) => events.push(event),
  });

  return { session, events, input, parent };
}

function stop(game: RunningGame): void {
  game.session.destroy();
  game.parent.remove();
}

async function waitFor(condition: () => boolean, timeoutMs = BOOT_TIMEOUT_MS): Promise<void> {
  const startedAt = performance.now();

  while (!condition()) {
    if (performance.now() - startedAt > timeoutMs) {
      throw new Error('Tempo esgotado esperando o motor.');
    }

    await delay(50);
  }
}

function delay(milliseconds: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, milliseconds));
}

function lastHud(events: readonly GameSessionEvent[]): HudState | null {
  for (let index = events.length - 1; index >= 0; index -= 1) {
    const event = events[index];

    if (event.type === 'hud') {
      return event.hud;
    }
  }

  return null;
}

describe('Motor 3D do Pedro Maker (WebGL de verdade)', () => {
  it(
    'monta a 1-1, anda, coleta moedas, pausa sem contar tempo e destrói o canvas',
    async () => {
      const game = start(blueprintOf('1-1'));

      try {
        await waitFor(() => game.events.some((event) => event.type === 'ready'));

        expect(game.events.some((event) => event.type === 'loading')).toBeTrue();
        expect(game.events.some((event) => event.type === 'error')).toBeFalse();
        expect(game.parent.querySelector('canvas')).not.toBeNull();
        expect(lastHud(game.events)).toEqual(
          jasmine.objectContaining({ hearts: 3, maxHearts: 3, coins: 0, crystalsTotal: 3 }),
        );

        // As primeiras moedas da fase ficam no chão, logo à direita do início.
        game.input.right = true;
        await waitFor(() => (lastHud(game.events)?.coins ?? 0) >= 4, 6000);
        game.input.right = false;

        expect(lastHud(game.events)?.coins).toBeGreaterThanOrEqual(4);
        expect(game.events.some((event) => event.type === 'sound' && event.cue === 'coin')).toBeTrue();

        game.session.pause();
        const eventsWhilePaused = game.events.length;
        game.input.right = true;
        await delay(600);
        game.input.right = false;

        expect(game.events.length).toBe(eventsWhilePaused);

        game.session.resume();
        game.session.restart();
        await waitFor(() => game.events.filter((event) => event.type === 'ready').length >= 2);

        expect(lastHud(game.events)?.coins).toBe(0);
      } finally {
        stop(game);
      }

      // Destruir leva junto o canvas e a camada de textos por cima dele.
      expect(game.parent.querySelector('canvas')).toBeNull();
      expect(game.parent.childElementCount).toBe(0);
    },
    BOOT_TIMEOUT_MS * 3,
  );

  for (const id of ['1-2', '1-3', '1-10', '1-S', '3-6', '5-10', '6-3', '6-10']) {
    it(
      `monta a fase ${id} sem erro`,
      async () => {
        const game = start(blueprintOf(id));

        try {
          await waitFor(() => game.events.some((event) => event.type === 'ready' || event.type === 'error'));

          expect(game.events.find((event) => event.type === 'error')).toBeUndefined();
          expect(lastHud(game.events)?.crystalsTotal).toBe(3);
        } finally {
          stop(game);
        }
      },
      BOOT_TIMEOUT_MS * 2,
    );
  }
});
