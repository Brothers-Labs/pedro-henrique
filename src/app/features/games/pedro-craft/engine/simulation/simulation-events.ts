import type { MakerSoundCue } from '../../../pedro-maker/models/session.model';
import type { GoalDefinition } from '../../models/content.model';

/** Tela que o jogo pede para abrir por cima do mundo. */
export type CraftScreen = 'inventory';

/**
 * O que a simulação conta para fora num passo.
 *
 * A tela decide o que fazer com cada um (som, aviso, comemoração); a
 * simulação só registra que aconteceu.
 */
export type SimulationEvent =
  | { readonly type: 'sound'; readonly cue: MakerSoundCue }
  | { readonly type: 'hint'; readonly text: string }
  | { readonly type: 'pickup'; readonly item: string; readonly count: number }
  | { readonly type: 'tool-broke'; readonly item: string }
  | { readonly type: 'goal-completed'; readonly goal: GoalDefinition }
  | { readonly type: 'open-screen'; readonly screen: CraftScreen };

/** O que só o desenho precisa saber: a poeira do bloco quebrado, o braço que balança. */
export type VisualEvent =
  | { readonly type: 'block-broken'; readonly x: number; readonly y: number; readonly z: number; readonly block: number }
  | { readonly type: 'swing' };
