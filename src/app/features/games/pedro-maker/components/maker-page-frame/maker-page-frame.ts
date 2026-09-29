import { ChangeDetectionStrategy, Component, inject, input } from '@angular/core';
import { RouterLink } from '@angular/router';

import { MakerAchievementToast } from '../maker-achievement-toast/maker-achievement-toast';
import { LevelSyncService } from '../../sync/level-sync.service';
import { MakerStatusBar } from '../maker-status-bar/maker-status-bar';

/**
 * Moldura das telas de menu do Pedro Maker.
 *
 * Céu, botão de voltar, título e a barra do aventureiro sempre no mesmo
 * lugar: a criança aprende uma vez onde fica cada coisa e reconhece em todas
 * as telas.
 */
@Component({
  selector: 'app-maker-page-frame',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [RouterLink, MakerStatusBar, MakerAchievementToast],
  template: `
    <div class="frame">
      <div class="frame__top">
        <a class="frame__back" [routerLink]="backLink()">
          <span aria-hidden="true">←</span> {{ backLabel() }}
        </a>
        <app-maker-status-bar class="frame__status" />
      </div>

      @if (heading()) {
        <h1 class="frame__title"><span aria-hidden="true">{{ emoji() }}</span> {{ heading() }}</h1>
      }

      <ng-content />
    </div>

    <app-maker-achievement-toast />
  `,
  styleUrl: './maker-page-frame.scss',
})
export class MakerPageFrame {
  readonly heading = input('');
  readonly emoji = input('');
  readonly backLink = input('/jogos/pedro-maker');
  readonly backLabel = input('Voltar');

  constructor() {
    // Acorda a sincronização em qualquer tela de menu do jogo: a fila guardada
    // no aparelho sobe assim que alguém abre o Pedro Maker, sem clique nenhum.
    inject(LevelSyncService);
  }
}
