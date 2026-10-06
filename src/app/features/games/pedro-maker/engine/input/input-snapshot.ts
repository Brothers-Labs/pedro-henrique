/** O que o Pedro quer fazer neste passo, juntando teclado e toque. */
export interface InputSnapshot {
  readonly left: boolean;
  readonly right: boolean;
  readonly run: boolean;
  readonly jumpHeld: boolean;
  /** Verdadeiro só no passo em que o pulo foi apertado. */
  readonly jumpPressed: boolean;
  readonly actionPressed: boolean;
  readonly pausePressed: boolean;
}

export const IDLE_INPUT: InputSnapshot = {
  left: false,
  right: false,
  run: false,
  jumpHeld: false,
  jumpPressed: false,
  actionPressed: false,
  pausePressed: false,
};
