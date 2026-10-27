/**
 * O que o herói quer fazer neste passo, juntando teclado, mouse e toque.
 *
 * A simulação lê só isto: não sabe se o pulo veio da barra de espaço ou do
 * botão grande da tela. Os "Pressed" valem só no passo em que o botão desceu.
 */
export interface CraftInputSnapshot {
  /** Andar de lado: -1 esquerda, 1 direita, valores no meio vêm do analógico. */
  readonly strafe: number;
  /** Andar para a frente (1) ou para trás (-1). */
  readonly forward: number;
  readonly jumpHeld: boolean;
  /** Quebrar ou golpear: segurado. */
  readonly primaryHeld: boolean;
  readonly primaryPressed: boolean;
  /** Colocar bloco ou usar o item: um toque, uma vez. */
  readonly secondaryPressed: boolean;
  /** Espaço da barra escolhido por número (0 a 8); `null` quando nenhum. */
  readonly hotbarSlot: number | null;
  /** Rodinha do mouse: -1, 0 ou 1. */
  readonly hotbarScroll: number;
  readonly inventoryPressed: boolean;
  readonly pausePressed: boolean;
}

export const IDLE_CRAFT_INPUT: CraftInputSnapshot = {
  strafe: 0,
  forward: 0,
  jumpHeld: false,
  primaryHeld: false,
  primaryPressed: false,
  secondaryPressed: false,
  hotbarSlot: null,
  hotbarScroll: 0,
  inventoryPressed: false,
  pausePressed: false,
};

/**
 * Estado dos controles de toque, escrito pela tela e lido pelo motor.
 *
 * Mutável de propósito, como o do Pedro Maker: o motor lê 60 vezes por
 * segundo e criar um objeto por toque só daria trabalho ao coletor de lixo.
 * O olhar acumula o arrasto em pixels até o motor consumir.
 */
export interface VirtualCraftInput {
  strafe: number;
  forward: number;
  lookDeltaX: number;
  lookDeltaY: number;
  jump: boolean;
  primary: boolean;
  /** Toques no botão de usar ainda não consumidos pelo motor. */
  secondaryTaps: number;
}

export function createVirtualCraftInput(): VirtualCraftInput {
  return { strafe: 0, forward: 0, lookDeltaX: 0, lookDeltaY: 0, jump: false, primary: false, secondaryTaps: 0 };
}

/** Quanto o olhar gira, em radianos, para cada pixel de arrasto com sensibilidade 1. */
export const LOOK_RADIANS_PER_PIXEL = 0.0042;
