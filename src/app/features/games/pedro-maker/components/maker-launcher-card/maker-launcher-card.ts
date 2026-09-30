import { ChangeDetectionStrategy, Component } from '@angular/core';
import { RouterLink } from '@angular/router';

/**
 * Porta de entrada do Pedro Maker na página de jogos.
 *
 * É só um cartão com links: nada do jogo é carregado aqui, para a página de
 * jogos continuar leve. O Pedro Maker inteiro abre na rota própria.
 */
@Component({
  selector: 'app-maker-launcher-card',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [RouterLink],
  template: `
    <article class="launcher">
      <div class="launcher__art" aria-hidden="true">
        <span class="launcher__cloud"></span>
        <span class="launcher__hero">🏃</span>
        <span class="launcher__coin">🪙</span>
        <span class="launcher__crystal">💎</span>
        <span class="launcher__ground"></span>
      </div>

      <div class="launcher__body">
        <h2 class="launcher__title">PEDRO MAKER</h2>
        <p class="launcher__subtitle">A grande aventura — crie, jogue, explore e evolua!</p>
        <ul class="launcher__features">
          <li>🗺️ 5 mundos e 50 fases</li>
          <li>👑 Chefões no fim de cada mundo</li>
          <li>🛠️ Editor para criar as suas fases</li>
        </ul>
        <div class="launcher__actions">
          <a class="button button--primary" routerLink="/jogos/pedro-maker">
            <span aria-hidden="true">▶</span> Jogar agora
          </a>
          <a class="button button--secondary" routerLink="/jogos/pedro-maker/criar">
            <span aria-hidden="true">🛠️</span> Criar fase
          </a>
        </div>
      </div>
    </article>
  `,
  styleUrl: './maker-launcher-card.scss',
})
export class MakerLauncherCard {}
