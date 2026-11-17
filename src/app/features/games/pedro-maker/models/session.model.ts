import type { CharacterPalette } from '../config/character.config';
import type { ScreenMode } from '../config/screen.config';
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
  /** Chaves no bolso, para as portas com cadeado. */
  readonly keys: number;
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
  /** Bloco musical tocado: `degree` é a nota na escala pentatônica, 0 a mais grave. */
  | { readonly type: 'note'; readonly degree: number }
  | { readonly type: 'damage' }
  | { readonly type: 'checkpoint' }
  | { readonly type: 'power-up'; readonly kind: PowerUpKind; readonly durationMs: number }
  | { readonly type: 'power-up-ended'; readonly kind: PowerUpKind }
  | { readonly type: 'mascot'; readonly text: string }
  /** A Flor Falante disse a frase escrita no editor: a tela mostra e lê em voz alta. */
  | { readonly type: 'flower-speech'; readonly text: string }
  /** O botão P foi apertado (ou renovado): tijolos e moedas trocados por `durationMs`. */
  | { readonly type: 'p-switch'; readonly durationMs: number }
  /** Acabou o efeito do botão P: tudo voltou ao lugar. */
  | { readonly type: 'p-switch-ended' }
  | { readonly type: 'boss'; readonly boss: BossHudState | null }
  /** Uma porta liberou a fase secreta; `secretLevel` é a fase do Pedro escolhida na porta dourada, ou `null` na campanha. */
  | { readonly type: 'secret-found'; readonly secretLevel: string | null }
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
  /** Tela escolhida: NES, SNES, Nintendo 64, 3D, HD ou 4K. */
  readonly screen: ScreenMode;
  readonly isTouch: boolean;
  /** Emoji do mascote do site, que acompanha o Pedro na fase. */
  readonly petEmoji: string | null;
  readonly input: VirtualInputState;
  readonly listener: GameSessionListener;
  /**
   * Os amigos que jogam junto, já com as cores: o Jogador 2 e o Jogador 3.
   * Vazio (ou ausente), joga uma criança só, com o teclado todo.
   */
  readonly partners?: readonly CharacterPalette[];
}

/** Controle de uma partida em andamento. */
export interface MakerGameSession {
  pause(): void;
  resume(): void;
  /** Volta ao último checkpoint com os corações cheios. */
  retryFromCheckpoint(): void;
  /** Recomeça a fase do zero. */
  restart(): void;
  /** Troca a tela na hora, sem recomeçar a fase. */
  setScreen(screen: ScreenMode): void;
  destroy(): void;
}
