import type { MakerSoundCue } from '../../pedro-maker/models/session.model';
import type { CraftCatalog } from '../content/craft-catalog';
import type { VirtualCraftInput } from '../engine/input/craft-input';
import type { SlotClick } from '../engine/simulation/inventory';
import type { CraftScreen, SlotRef } from '../engine/simulation/screens';
import type { GoalDefinition } from './content.model';

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

/** Um espaço do inventário como a tela mostra: item, quantidade e quanto resta da ferramenta (0 a 1). */
export interface SlotView {
  readonly item: string;
  readonly count: number;
  readonly wear: number | null;
}

export interface GoalView {
  readonly goal: GoalDefinition;
  readonly amount: number;
}

export interface CraftHudState {
  readonly hotbar: readonly (SlotView | null)[];
  readonly selected: number;
  /** Missão da vez; `null` quando todas foram cumpridas. */
  readonly goal: GoalView | null;
  readonly goalsDone: number;
  readonly goalsTotal: number;
}

export interface IngredientView {
  readonly item: string;
  readonly count: number;
  /** Quanto disso a criança tem na mochila agora. */
  readonly have: number;
}

/** Uma página do livro de receitas. */
export interface RecipeView {
  readonly id: string;
  readonly output: SlotView;
  readonly ingredients: readonly IngredientView[];
  readonly canCraft: boolean;
}

export interface CraftingGridView {
  readonly size: number;
  readonly cells: readonly (SlotView | null)[];
  /** O que a grade monta agora; `null` quando não forma receita nenhuma. */
  readonly result: SlotView | null;
}

export interface FurnaceView {
  /** Assar, combustível e pronto, nessa ordem. */
  readonly slots: readonly (SlotView | null)[];
  /** Quanto resta do fogo, de 0 a 1. */
  readonly burn: number;
  /** Quanto falta para o item ficar pronto, de 0 a 1. */
  readonly progress: number;
}

/** A tela aberta por cima do mundo, como a criança a vê. */
export interface ScreenView {
  readonly kind: CraftScreen;
  readonly inventory: readonly (SlotView | null)[];
  /** O que está "na mão", pego na tela e ainda não solto. */
  readonly cursor: SlotView | null;
  readonly grid: CraftingGridView | null;
  readonly recipes: readonly RecipeView[];
  readonly chest: readonly (SlotView | null)[] | null;
  readonly furnace: FurnaceView | null;
}

export type CraftSessionEvent =
  | { readonly type: 'loading'; readonly progress: number }
  | { readonly type: 'ready' }
  | { readonly type: 'sound'; readonly cue: MakerSoundCue }
  | { readonly type: 'hud'; readonly hud: CraftHudState }
  | { readonly type: 'hint'; readonly text: string }
  | { readonly type: 'pickup'; readonly item: string; readonly count: number }
  | { readonly type: 'tool-broke'; readonly item: string }
  | { readonly type: 'goal-completed'; readonly goal: GoalDefinition }
  | { readonly type: 'open-screen'; readonly screen: CraftScreen }
  /** A tela aberta mudou sozinha (a fornalha assando). */
  | { readonly type: 'screen'; readonly view: ScreenView }
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
  selectSlot(index: number): void;
  /** Abre a mochila (o botão 🎒 da tela), para o mundo e devolve o que mostrar. */
  openInventory(): ScreenView | null;
  /** Para o mundo e devolve a tela que o jogo acabou de abrir (mesa, baú, fornalha). */
  showScreen(): ScreenView | null;
  clickSlot(ref: SlotRef, mode: SlotClick): ScreenView | null;
  takeGridResult(): ScreenView | null;
  craftRecipe(recipeId: string): ScreenView | null;
  /** Devolve a grade e a mão à mochila e solta o mundo de novo. */
  closeScreen(): void;
  destroy(): void;
}
