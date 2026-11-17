import { ChangeDetectionStrategy, Component, input } from '@angular/core';

/**
 * O quarto que sobra na tela dividida em quatro, com três jogadores: nada de
 * mundo desenhado ali, só o nome do mundo e como cada um joga, sempre à vista.
 */
@Component({
  selector: 'app-craft-trio-panel',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <p class="title"><span aria-hidden="true">🧱</span> {{ worldName() }}</p>
    <ul class="controls">
      <li><strong>Jogador 1:</strong> clique no mundo, <strong>WASD</strong> anda, mouse olha, quebra e coloca, <strong>E</strong> mochila.</li>
      <li>
        <strong>Jogador 2:</strong> o 1º controle, ou <strong>setas</strong> andam, <strong>I J K L</strong> olham, <strong>Enter</strong> pula,
        <strong>U</strong> quebra, <strong>O</strong> coloca, <strong>H</strong> mochila.
      </li>
      <li><strong>Jogador 3:</strong> o 2º controle.</li>
    </ul>
  `,
  styles: `
    :host {
      display: grid;
      align-content: center;
      justify-items: center;
      gap: 0.6rem;
      height: 100%;
      box-sizing: border-box;
      padding: 1rem calc(1rem + var(--safe-right, 0px)) calc(1rem + var(--safe-bottom, 0px)) 1rem;
      background: #2a2350;
      color: #ffffff;
      text-align: center;
    }

    .title {
      margin: 0;
      font-family: var(--font-display);
      font-size: var(--text-lg);
      font-weight: 800;
    }

    .controls {
      display: grid;
      gap: 0.35rem;
      max-width: 30rem;
      margin: 0;
      padding: 0;
      list-style: none;
      font-size: 0.9rem;
      font-weight: 600;
      line-height: 1.35;
    }
  `,
})
export class CraftTrioPanel {
  readonly worldName = input.required<string>();
}
