import { ChangeDetectionStrategy, Component } from '@angular/core';
import { RouterLink } from '@angular/router';

/**
 * Porta de entrada do Pedro Kart na página de jogos.
 *
 * Só um cartão com links, como o do Pedro Maker — e com o mesmo desenho, para
 * os dois jogos grandes do site parecerem irmãos. O motor 3D não é carregado
 * aqui: a página de jogos continua leve.
 */
@Component({
  selector: 'app-kart-launcher-card',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [RouterLink],
  template: `
    <article class="launcher">
      <div class="launcher__art" aria-hidden="true">
        <span class="launcher__cloud"></span>
        <span class="launcher__hero">🏎️</span>
        <span class="launcher__coin">🏁</span>
        <span class="launcher__crystal">🏆</span>
        <span class="launcher__ground"></span>
      </div>

      <div class="launcher__body">
        <h2 class="launcher__title">PEDRO KART</h2>
        <p class="launcher__subtitle">Corridas de kart com o Pedro Maker!</p>
        <ul class="launcher__features">
          <li>🏁 5 pistas em cenários diferentes</li>
          <li>🎨 Karts de vários modelos e cores</li>
          <li>🛠️ Pedro Kart Maker para criar as suas pistas</li>
        </ul>
        <div class="launcher__actions">
          <a class="button button--primary" routerLink="/jogos/pedro-kart">
            <span aria-hidden="true">▶</span> Correr agora
          </a>
          <a class="button button--secondary" routerLink="/jogos/pedro-kart/criar">
            <span aria-hidden="true">🛠️</span> Criar pista
          </a>
        </div>
      </div>
    </article>
  `,
  styleUrl: '../../../pedro-maker/components/maker-launcher-card/maker-launcher-card.scss',
})
export class KartLauncherCard {}
