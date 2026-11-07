import type { CharacterPalette } from '../config/character.config';
import type { LevelRunResult } from './progress.model';
import type { LevelBlueprint, PowerUpKind } from './level.model';
import type { DifficultyRules } from './settings.model';

/**
 * Contrato entre o Angular e o motor do jogo.
 *
 * O motor não conhece serviço, rota nem signal: recebe uma configuração,
 * escreve eventos em uma função e obedece a meia dúzia de comandos. É o que
 * mantém o motor 3D trocável e a tela testável sem ele.
 */

export type MakerSoundCue =
  | 'jump'
  | 'coin'
  | 'crystal'
  | 'damage'
  | 'enemyHit'
  | 'checkpoint'
  | 'powerup'
  | 'victory'
  | 'boss'
  | 'button'
  | 'spring'
  | 'break'
  | 'secret'
  | 'fireball'
  | 'iceball'
  | 'freeze'
  | 'slide'
  | 'tailSpin';

export interface HudState {
  readonly hearts: number;
  readonly maxHearts: number;
  readonly coins: number;
  readonly crystalsFound: number;
  readonly crystalsTotal: number;
  readonly hasShield: boolean;
}

export interface BossHudState {
  readonly name: string;
  readonly emoji: string;
  readonly hitPoints: number;
  readonly maxHitPoints: number;
}

export type GameSessionEvent =
  | { readonly type: 'loading'; readonly progress: number }
  | { readonly type: 'ready' }
  | { readonly type: 'hud'; readonly hud: HudState }
  | { readonly type: 'sound'; readonly cue: MakerSoundCue }
  | { readonly type: 'damage' }
  | { readonly type: 'checkpoint' }
  | { readonly type: 'power-up'; readonly kind: PowerUpKind; readonly durationMs: number }
  | { readonly type: 'power-up-ended'; readonly kind: PowerUpKind }
  | { readonly type: 'mascot'; readonly text: string }
  | { readonly type: 'boss'; readonly boss: BossHudState | null }
  | { readonly type: 'secret-found' }
  | { readonly type: 'pause-requested' }
  | { readonly type: 'defeated' }
  | { readonly type: 'completed'; readonly result: LevelRunResult }
  | { readonly type: 'error'; readonly message: string };

export type GameSessionListener = (event: GameSessionEvent) => void;

/**
 * Estado dos botões de toque, escrito pela tela e lido pelo motor a cada quadro.
 *
 * É um objeto mutável de propósito: o motor lê 60 vezes por segundo, e criar
 * um objeto novo por toque só geraria lixo para o coletor.
 */
export interface VirtualInputState {
  left: boolean;
  right: boolean;
  /** Direcional empurrado até a ponta: o Pedro corre, como segurar Shift no teclado. */
  run: boolean;
  jump: boolean;
  action: boolean;
}

export interface GameLaunchOptions {
  readonly parent: HTMLElement;
  readonly blueprint: LevelBlueprint;
  readonly rules: DifficultyRules;
  /** Herói escolhido, já com as cores que veste. */
  readonly character: CharacterPalette;
  readonly effectsEnabled: boolean;
  readonly isTouch: boolean;
  /** Emoji do mascote do site, que acompanha o Pedro na fase. */
  readonly petEmoji: string | null;
  readonly input: VirtualInputState;
  readonly listener: GameSessionListener;
}

/** Controle de uma partida em andamento. */
export interface MakerGameSession {
  pause(): void;
  resume(): void;
  /** Volta ao último checkpoint com os corações cheios. */
  retryFromCheckpoint(): void;
  /** Recomeça a fase do zero. */
  restart(): void;
  destroy(): void;
}
