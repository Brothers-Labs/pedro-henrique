import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';

import { AventuraStore } from '../services/aventura-store.service';
import { formatNumber } from './format';

/** Escudo com o nível da temporada e a barra de XP até o próximo. */
@Component({
  selector: 'app-level-badge',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    @let info = level();
    <div class="badge">
      <span class="badge__shield" aria-hidden="true">
        <small>Nível</small>
        <strong>{{ info.level }}</strong>
      </span>
      <div class="badge__body">
        @if (info.isMaxLevel) {
          <p class="badge__xp">Nível máximo da temporada! 🏆</p>
        } @else {
          <p class="badge__xp">{{ xpText() }}</p>
          <div
            class="badge__track"
            role="progressbar"
            aria-valuemin="0"
            [attr.aria-valuemax]="info.xpForNextLevel"
            [attr.aria-valuenow]="info.xpInLevel"
            [attr.aria-label]="'XP para o nível ' + (info.level + 1)"
          >
            <span class="badge__fill" [style.width.%]="info.percentage"></span>
          </div>
        }
      </div>
      @if (!info.isMaxLevel) {
        <span class="badge__next"><span aria-hidden="true">🎁</span> Nível {{ info.level + 1 }}</span>
      }
    </div>
  `,
  styleUrl: './level-badge.scss',
})
export class LevelBadge {
  private readonly store = inject(AventuraStore);

  protected readonly level = this.store.seasonLevel;
  protected readonly xpText = computed(() => {
    const info = this.level();

    return `${formatNumber(info.xpInLevel)} / ${formatNumber(info.xpForNextLevel)} XP`;
  });
}
