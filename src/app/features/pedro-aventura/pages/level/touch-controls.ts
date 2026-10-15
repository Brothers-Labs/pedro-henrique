import { ChangeDetectionStrategy, Component, output } from '@angular/core';

import type { RunCommand } from '../../engine/run-input';

/**
 * Controles de toque da corrida: trocar de faixa à esquerda, ações à direita.
 *
 * Cada botão age no `pointerdown`, sem esperar soltar o dedo: na velocidade da
 * corrida, o atraso do clique faria o Pedro bater. Alvos grandes, longe das
 * bordas do aparelho.
 */
@Component({
  selector: 'app-touch-controls',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="pad pad--left">
      <button type="button" class="pad__button" aria-label="Faixa da esquerda" (pointerdown)="send($event, 'left')">◀</button>
      <button type="button" class="pad__button" aria-label="Faixa da direita" (pointerdown)="send($event, 'right')">▶</button>
    </div>
    <div class="pad pad--right">
      <button type="button" class="pad__button pad__button--small" (pointerdown)="send($event, 'slide')">
        <span aria-hidden="true">🛹</span><small>Derrapar</small>
      </button>
      <button type="button" class="pad__button pad__button--small" (pointerdown)="send($event, 'attack')">
        <span aria-hidden="true">👊</span><small>Atacar</small>
      </button>
      <button type="button" class="pad__button pad__button--jump" (pointerdown)="send($event, 'jump')">
        <span aria-hidden="true">🏃</span><small>Pular</small>
      </button>
    </div>
  `,
  styles: `
    :host {
      position: absolute;
      inset: auto 0 0;
      z-index: 5;
      display: flex;
      align-items: flex-end;
      justify-content: space-between;
      gap: 1rem;
      padding: 0 calc(1rem + env(safe-area-inset-right, 0px)) calc(1.25rem + env(safe-area-inset-bottom, 0px))
        calc(1rem + env(safe-area-inset-left, 0px));
      pointer-events: none;
    }

    .pad {
      display: flex;
      align-items: flex-end;
      gap: 0.75rem;
      pointer-events: auto;
    }

    .pad__button {
      display: grid;
      place-items: center;
      width: 4.75rem;
      height: 4.75rem;
      border: 2px solid rgb(255 255 255 / 35%);
      border-radius: 50%;
      background: rgb(10 10 20 / 55%);
      color: #ffffff;
      font-family: var(--font-display);
      font-size: 1.8rem;
      font-weight: 800;
      touch-action: none;
      user-select: none;
      -webkit-user-select: none;
      backdrop-filter: blur(6px);
    }

    .pad__button small {
      font-size: 0.7rem;
      text-transform: uppercase;
    }

    .pad__button--small {
      width: 4.25rem;
      height: 4.25rem;
      font-size: 1.4rem;
    }

    .pad__button--jump {
      width: 6rem;
      height: 6rem;
      border-color: #3fb8ff;
      background: radial-gradient(circle, rgb(21 101 216 / 85%), rgb(10 30 80 / 85%));
      box-shadow: 0 0 22px rgb(63 184 255 / 55%);
      font-size: 2rem;
    }

    .pad__button:active {
      transform: scale(0.94);
    }

    .pad__button:focus-visible {
      outline: 3px solid #3fb8ff;
      outline-offset: 3px;
    }

    /* Celular estreito: tudo cabe numa linha, sem botão saindo da tela. */
    @media (max-width: 30rem) {
      :host {
        gap: 0.5rem;
        padding-inline: calc(0.75rem + env(safe-area-inset-left, 0px)) calc(0.75rem + env(safe-area-inset-right, 0px));
      }

      .pad {
        gap: 0.5rem;
      }

      .pad__button {
        width: 4rem;
        height: 4rem;
      }

      .pad__button--small {
        width: 3.5rem;
        height: 3.5rem;
        font-size: 1.2rem;
      }

      .pad__button--jump {
        width: 5rem;
        height: 5rem;
      }
    }
  `,
})
export class TouchControls {
  readonly command = output<RunCommand>();

  protected send(event: PointerEvent, command: RunCommand): void {
    // Sem isso o navegador também dispara clique, foco e rolagem.
    event.preventDefault();
    this.command.emit(command);
  }
}
