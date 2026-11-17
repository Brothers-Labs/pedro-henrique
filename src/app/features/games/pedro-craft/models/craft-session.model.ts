import type { HeroId } from '../../pedro-maker/models/progress.model';
import type { MakerSoundCue } from '../../pedro-maker/models/session.model';
import type { CraftCatalog } from '../content/craft-catalog';
import type { VirtualCraftInput } from '../engine/input/craft-input';
import type { SlotClick } from '../engine/simulation/inventory';
import type { CraftScreen, SlotRef } from '../engine/simulation/screens';
import type { PartOfDay } from '../engine/simulation/day-clock';
import type { FirstStep } from '../engine/simulation/first-steps';
import type { WeatherKind } from '../engine/simulation/weather';
import type { GoalDefinition } from './content.model';
import type { CraftDifficulty } from './craft-settings.model';
import type { WorldSave } from './world-save.model';

/**
 * Contrato entre o Angular e o motor do PedroCraft.
 *
 * O motor não conhece serviço, rota nem signal: recebe uma configuração,
 * escreve eventos numa função e obedece a poucos comandos. É o mesmo desenho
 * do Pedro Maker, que mantém o motor 3D trocável e a tela testável sem ele.
 */

/** Preferências que o motor precisa saber enquanto roda. */
export interface CraftEngineSettings {
  /** Modo Paz: nenhum inimigo nasce. */
  readonly peaceful: boolean;
  readonly difficulty: CraftDifficulty;
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
  /** Figura do item da missão (o tronco, a picareta); `null` quando a missão não tem item. */
  readonly icon: string | null;
}

/** Dia, estação, parte do dia e clima, como o HUD mostra. */
export interface CalendarView {
  readonly day: number;
  readonly seasonName: string;
  readonly seasonEmoji: string;
  readonly partOfDay: PartOfDay;
  readonly weather: WeatherKind;
  readonly isFullMoon: boolean;
}

export interface CraftHudState {
  readonly hotbar: readonly (SlotView | null)[];
  readonly selected: number;
  /** Missão da vez; `null` quando todas foram cumpridas. */
  readonly goal: GoalView | null;
  readonly goalsDone: number;
  readonly goalsTotal: number;
  /** Corações do herói agora e no máximo. */
  readonly health: number;
  readonly maxHealth: number;
  readonly calendar: CalendarView;
  /** Golpes que as armaduras da mochila ainda seguram; `null` sem armadura. */
  readonly armor: number | null;
  /** Energia do modo Sobrevivência gentil; `null` nos outros modos. */
  readonly energy: { readonly value: number; readonly max: number } | null;
  /** O gesto da vez no guia do primeiro minuto; `null` sem guia. */
  readonly firstStep: FirstStep | null;
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
  readonly infiniteChest?: boolean;
  readonly furnace: FurnaceView | null;
  /** Modo Criativo, na mochila: todos os itens do jogo para pegar com um toque. Vazio nos outros casos. */
  readonly creativeItems: readonly string[];
  /** Na tela dividida, de quem é a mochila aberta (1, 2 ou 3); `null` jogando sozinho. */
  readonly player: number | null;
}

export type CraftSessionEvent =
  | { readonly type: 'loading'; readonly progress: number }
  | { readonly type: 'ready' }
  | { readonly type: 'sound'; readonly cue: MakerSoundCue }
  | { readonly type: 'hud'; readonly hud: CraftHudState }
  /** A barra, a vida e a energia do Jogador 2, na metade direita da tela. */
  | { readonly type: 'partner-hud'; readonly hud: CraftHudState }
  /** A barra, a vida e a energia do Jogador 3, no quarto de baixo à esquerda. */
  | { readonly type: 'third-hud'; readonly hud: CraftHudState }
  | { readonly type: 'hint'; readonly text: string }
  /** Uma criatura falou com o herói: sempre mostrada e lida em voz alta. */
  | { readonly type: 'creature-speech'; readonly speaker: string; readonly text: string }
  | { readonly type: 'pickup'; readonly item: string; readonly count: number }
  | { readonly type: 'tool-broke'; readonly item: string }
  | { readonly type: 'goal-completed'; readonly goal: GoalDefinition }
  | { readonly type: 'open-screen'; readonly screen: CraftScreen }
  | { readonly type: 'hero-hurt' }
  | { readonly type: 'first-steps-done' }
  /** A tela aberta mudou sozinha (a fornalha assando). */
  | { readonly type: 'screen'; readonly view: ScreenView }
  | { readonly type: 'pause-requested' }
  | { readonly type: 'error'; readonly message: string };

export type CraftSessionListener = (event: CraftSessionEvent) => void;

export interface CraftLaunchOptions {
  readonly parent: HTMLElement;
  readonly catalog: CraftCatalog;
  /** O mundo a abrir: a semente e o que já mudou nele (`state` vazio num mundo novo). */
  readonly world: WorldSave;
  readonly settings: CraftEngineSettings;
  /** Mostra o guia do primeiro minuto neste mundo. */
  readonly guideFirstSteps: boolean;
  readonly input: VirtualCraftInput;
  readonly listener: CraftSessionListener;
  /**
   * Herói do Jogador 1 e, na tela dividida, o do Jogador 2 (`null` jogando
   * sozinho) e o do Jogador 3 (`null` sem ele; só vale junto com o Jogador 2).
   */
  readonly players: { readonly hero: HeroId; readonly partner: HeroId | null; readonly third: HeroId | null };
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
  /** Modo Criativo: põe uma pilha cheia do item na mochila e devolve a tela atualizada. */
  takeCreativeItem(itemId: string): ScreenView | null;
  /** Termina o guia do primeiro minuto. */
  skipFirstSteps(): void;
  /** O mundo como está agora, pronto para guardar; `null` enquanto ainda carrega. */
  capture(): WorldSave | null;
  destroy(): void;
}
