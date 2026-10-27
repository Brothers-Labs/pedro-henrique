import type { MakerSoundCue } from '../../pedro-maker/models/session.model';
import type { CraftCatalog } from '../content/craft-catalog';
import type { VirtualCraftInput } from '../engine/input/craft-input';

/**
 * Contrato entre o Angular e o motor do PedroCraft.
 *
 * O motor não conhece serviço, rota nem signal: recebe uma configuração,
 * escreve eventos numa função e obedece a poucos comandos. É o mesmo desenho
 * do Pedro Maker, que mantém o motor 3D trocável e a tela testável sem ele.
 */

/** Preferências que o motor precisa saber enquanto roda. */
export interface CraftEngineSettings {
  readonly lookSensitivity: number;
  readonly autoJump: boolean;
  readonly effectsEnabled: boolean;
}

export type CraftSessionEvent =
  | { readonly type: 'loading'; readonly progress: number }
  | { readonly type: 'ready' }
  | { readonly type: 'sound'; readonly cue: MakerSoundCue }
  | { readonly type: 'pause-requested' }
  | { readonly type: 'error'; readonly message: string };

export type CraftSessionListener = (event: CraftSessionEvent) => void;

export interface CraftLaunchOptions {
  readonly parent: HTMLElement;
  readonly catalog: CraftCatalog;
  readonly seed: number;
  readonly settings: CraftEngineSettings;
  readonly input: VirtualCraftInput;
  readonly listener: CraftSessionListener;
}

/** Controle de uma partida em andamento. */
export interface CraftGameSession {
  pause(): void;
  resume(): void;
  updateSettings(settings: CraftEngineSettings): void;
  destroy(): void;
}
