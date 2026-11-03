import { ChangeDetectionStrategy, Component } from '@angular/core';
import { RouterLink } from '@angular/router';

import { SPRUNK_ROSTER } from '../../data/sprunk-roster.data';
import { SprunkFigure } from '../sprunk-figure/sprunk-figure';

/** Três bonecos na vitrine do cartão: um da turma do dia, o Bolão na corrente e um da turma da noite. */
const SHOWCASE_IDS: readonly string[] = ['zabumba', 'bolao', 'pisca-pisca'];

/**
 * Porta de entrada do Pedro Sprunks na página de jogos.
 *
 * O mesmo desenho dos cartões do Pedro Maker, Kart e Flash, com três bonecos
 * da banda no palco. O motor de som não é carregado aqui: só nasce na tela
 * do jogo.
 */
@Component({
  selector: 'app-sprunks-launcher-card',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [RouterLink, SprunkFigure],
  template: `
    <article class="launcher">
      <div class="launcher__art launcher__art--stage" aria-hidden="true">
        <div class="launcher__band">
          @for (character of showcase; track character.id) {
            <app-sprunk-figure [character]="character" />
          }
        </div>
        <span class="launcher__ground"></span>
      </div>

      <div class="launcher__body">
        <h2 class="launcher__title launcher__title--sprunks">PEDRO SPRUNKS</h2>
        <p class="launcher__subtitle">Monte a sua banda de bonecos!</p>
        <ul class="launcher__features">
          <li>🎵 20 bonecos fantasiados, cada um com o seu som</li>
          <li>🌗 A turma do dia e a turma da noite no mesmo palco</li>
          <li>👆 Toque no boneco do palco para ver a ação dele</li>
          <li>⛓️ O Bolão, a bola de ferro na corrente</li>
          <li>🎨 Meus personagens: crie os seus bonecos</li>
        </ul>
        <div class="launcher__actions">
          <a class="button button--primary" routerLink="/jogos/pedro-sprunks">
            <span aria-hidden="true">▶</span> Tocar agora
          </a>
        </div>
      </div>
    </article>
  `,
  styleUrls: ['../../../pedro-maker/components/maker-launcher-card/maker-launcher-card.scss', './sprunks-launcher-card.scss'],
})
export class SprunksLauncherCard {
  protected readonly showcase = SPRUNK_ROSTER.filter((character) => SHOWCASE_IDS.includes(character.id));
}
