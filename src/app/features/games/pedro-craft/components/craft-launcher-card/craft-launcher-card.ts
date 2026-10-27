import { ChangeDetectionStrategy, Component } from '@angular/core';
import { RouterLink } from '@angular/router';

/**
 * Porta de entrada do PedroCraft na página de jogos.
 *
 * Só um cartão com links, com o mesmo desenho dos cartões dos outros jogos
 * 3D. O motor e o conteúdo do jogo não são carregados aqui: a página de jogos
 * continua leve.
 */
@Component({
  selector: 'app-craft-launcher-card',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [RouterLink],
  template: `
    <article class="launcher">
      <div class="launcher__art" aria-hidden="true">
        <span class="launcher__cloud"></span>
        <span class="launcher__hero">⛏️</span>
        <span class="launcher__coin">🌾</span>
        <span class="launcher__crystal">🌳</span>
        <span class="launcher__ground launcher__ground--blocks"></span>
      </div>

      <div class="launcher__body">
        <h2 class="launcher__title launcher__title--craft">PEDROCRAFT</h2>
        <p class="launcher__subtitle">Colha, construa e cuide da sua fazenda!</p>
        <ul class="launcher__features">
          <li>🪵 Madeira, pedra, água e minérios para colher</li>
          <li>🛠️ Ferramentas e armas para fabricar</li>
          <li>🌾 Fazenda com trigo, cenoura e animais</li>
          <li>🌙 Inimigos fofos à noite, ou Modo Paz</li>
        </ul>
        <div class="launcher__actions">
          <a class="button button--primary" routerLink="/jogos/pedro-craft">
            <span aria-hidden="true">▶</span> Jogar agora
          </a>
        </div>
      </div>
    </article>
  `,
  styleUrls: ['../../../pedro-maker/components/maker-launcher-card/maker-launcher-card.scss', './craft-launcher-card.scss'],
})
export class CraftLauncherCard {}
