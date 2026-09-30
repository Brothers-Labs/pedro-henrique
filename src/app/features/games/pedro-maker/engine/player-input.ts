import * as Phaser from 'phaser';

import type { VirtualInputState } from '../models/session.model';

/** O que o Pedro quer fazer neste quadro, juntando teclado e toque. */
export interface InputSnapshot {
  readonly left: boolean;
  readonly right: boolean;
  readonly run: boolean;
  readonly jumpHeld: boolean;
  /** Verdadeiro só no quadro em que o pulo foi apertado. */
  readonly jumpPressed: boolean;
  readonly actionPressed: boolean;
  readonly pausePressed: boolean;
}

type KeyName = 'left' | 'right' | 'a' | 'd' | 'up' | 'w' | 'space' | 'shift' | 'e' | 'esc';

/**
 * Entrada do jogador.
 *
 * Teclado e botões de toque valem ao mesmo tempo: quem joga no notebook com
 * tela de toque pode usar os dois. O "apertou agora" é calculado aqui, uma
 * vez por quadro, para que nenhuma outra parte do jogo precise lembrar do
 * quadro anterior.
 */
export class PlayerInput {
  private readonly keys: Readonly<Record<KeyName, Phaser.Input.Keyboard.Key>> | null;
  private wasJumpHeld = false;
  private wasActionHeld = false;
  private wasPauseHeld = false;

  constructor(
    keyboard: Phaser.Input.Keyboard.KeyboardPlugin | null,
    private readonly virtual: VirtualInputState,
  ) {
    const codes = Phaser.Input.Keyboard.KeyCodes;

    this.keys = keyboard
      ? {
          left: keyboard.addKey(codes.LEFT),
          right: keyboard.addKey(codes.RIGHT),
          a: keyboard.addKey(codes.A),
          d: keyboard.addKey(codes.D),
          up: keyboard.addKey(codes.UP),
          w: keyboard.addKey(codes.W),
          space: keyboard.addKey(codes.SPACE),
          shift: keyboard.addKey(codes.SHIFT),
          e: keyboard.addKey(codes.E),
          esc: keyboard.addKey(codes.ESC),
        }
      : null;
  }

  read(): InputSnapshot {
    const keys = this.keys;
    const isDown = (...names: KeyName[]): boolean => names.some((name) => keys?.[name].isDown ?? false);

    const jumpHeld = this.virtual.jump || isDown('up', 'w', 'space');
    const actionHeld = this.virtual.action || isDown('e');
    const pauseHeld = isDown('esc');

    const snapshot: InputSnapshot = {
      left: this.virtual.left || isDown('left', 'a'),
      right: this.virtual.right || isDown('right', 'd'),
      run: isDown('shift'),
      jumpHeld,
      jumpPressed: jumpHeld && !this.wasJumpHeld,
      actionPressed: actionHeld && !this.wasActionHeld,
      pausePressed: pauseHeld && !this.wasPauseHeld,
    };

    this.wasJumpHeld = jumpHeld;
    this.wasActionHeld = actionHeld;
    this.wasPauseHeld = pauseHeld;

    return snapshot;
  }

  /** Esquece o que estava apertado: ao voltar da pausa, nada dispara sozinho. */
  reset(): void {
    this.virtual.left = false;
    this.virtual.right = false;
    this.virtual.jump = false;
    this.virtual.action = false;
    this.wasJumpHeld = true;
    this.wasActionHeld = true;
    this.wasPauseHeld = true;

    for (const key of Object.values(this.keys ?? {})) {
      key.reset();
    }
  }
}
