import type { CharacterPalette } from '../../pedro-maker/config/character.config';
import type { RunEvent, RunHud, RunSetup } from '../simulation/run-simulation';

/**
 * Botões de toque, escritos pela tela e lidos pelo motor.
 *
 * É um objeto mutável compartilhado de propósito: o dedo encosta e o Pedro
 * pula no mesmo quadro, sem passar pela detecção de mudanças do Angular.
 */
export interface VirtualRunState {
  left: boolean;
  right: boolean;
  jump: boolean;
  dash: boolean;
}

export function createVirtualRunState(): VirtualRunState {
  return { left: false, right: false, jump: false, dash: false };
}

export interface RunLaunchOptions {
  readonly parent: HTMLElement;
  readonly setup: RunSetup;
  /** As roupas do Pedro, escolhidas no Pedro Maker. */
  readonly look: CharacterPalette;
  readonly input: VirtualRunState;
  readonly listener: RunSessionListener;
}

/** O que o motor conta para a tela: os acontecimentos da partida e o painel. */
export type RunSessionEvent =
  | { readonly type: 'pronto' }
  | { readonly type: 'painel'; readonly hud: RunHud }
  | { readonly type: 'partida'; readonly event: RunEvent }
  | { readonly type: 'pausa-pedida' }
  | { readonly type: 'erro'; readonly message: string };

export type RunSessionListener = (event: RunSessionEvent) => void;

export interface RunSession {
  pause(): void;
  resume(): void;
  destroy(): void;
}
