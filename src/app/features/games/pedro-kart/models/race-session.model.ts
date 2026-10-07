import type { CharacterPalette } from '../../pedro-maker/config/character.config';
import type { RaceEvent, RaceHud } from '../simulation/race-simulation';
import type { RaceTuning } from '../simulation/race-tuning';
import type { KartSetup } from './kart.model';
import type { TrackDefinition } from './track.model';

/**
 * Botões de toque, escritos pela tela e lidos pelo motor.
 *
 * É um objeto mutável compartilhado de propósito: o dedo encosta e o kart
 * vira no mesmo quadro, sem passar pela detecção de mudanças do Angular.
 */
export interface VirtualDriveState {
  left: boolean;
  right: boolean;
  brake: boolean;
  item: boolean;
}

export function createVirtualDriveState(): VirtualDriveState {
  return { left: false, right: false, brake: false, item: false };
}

export interface RaceLaunchOptions {
  readonly parent: HTMLElement;
  readonly track: TrackDefinition;
  readonly kart: KartSetup;
  readonly driver: CharacterPalette;
  readonly playerName: string;
  readonly tuning: RaceTuning;
  readonly input: VirtualDriveState;
  /** Canvas do mapinha, posto pela tela; sem ele, a corrida segue sem mapa. */
  readonly minimap: HTMLCanvasElement | null;
  readonly listener: RaceSessionListener;
}

/** O que o motor conta para a tela: os acontecimentos da corrida e o painel. */
export type RaceSessionEvent =
  | { readonly type: 'pronto' }
  | { readonly type: 'painel'; readonly hud: RaceHud }
  | { readonly type: 'corrida'; readonly event: RaceEvent }
  | { readonly type: 'pausa-pedida' }
  | { readonly type: 'erro'; readonly message: string };

export type RaceSessionListener = (event: RaceSessionEvent) => void;

export interface RaceSession {
  pause(): void;
  resume(): void;
  destroy(): void;
}
