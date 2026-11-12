/**
 * Estado dos controles num instante: teclado e botões de toque escrevem aqui,
 * a simulação só lê.
 */
export interface ControlState {
  left: boolean;
  right: boolean;
  jump: boolean;
}

/** Quais botões de toque cada modo mostra. */
export type ControlLayout = 'plataforma' | 'corrida' | 'pula-pula';

export function createControlState(): ControlState {
  return { left: false, right: false, jump: false };
}

export type Direction = -1 | 0 | 1;

/** Esquerda e direita juntas se anulam, como num controle de verdade. */
export function directionOf(controls: ControlState): Direction {
  if (controls.left === controls.right) {
    return 0;
  }

  return controls.left ? -1 : 1;
}

export function releaseAll(state: ControlState): void {
  state.left = false;
  state.right = false;
  state.jump = false;
}
