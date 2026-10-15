import { ChangeDetectionStrategy, Component, computed, inject, input } from '@angular/core';

import type { MissionStatus } from '../models/economy.model';
import { timeUntil } from '../rules/calendar';
import { AventuraAudio } from '../services/aventura-audio.service';
import { AventuraStore } from '../services/aventura-store.service';
import { formatCountdown, formatNumber } from './format';

/** Uma missão: o que fazer, quanto falta, quanto vale e o botão de resgatar. */
@Component({
  selector: 'app-mission-card',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    @let entry = status();
    <article class="mission" [class.mission--done]="entry.state !== 'in-progress'">
      <span class="mission__icon" aria-hidden="true">{{ entry.mission.emoji }}</span>
      <div class="mission__body">
        <h3 class="mission__title">{{ entry.mission.title }}</h3>
        <div
          class="mission__track"
          role="progressbar"
          aria-valuemin="0"
          [attr.aria-valuemax]="entry.mission.target"
          [attr.aria-valuenow]="entry.progress"
          [attr.aria-label]="entry.mission.title"
        >
          <span class="mission__fill" [style.width.%]="percentage()"></span>
        </div>
        <p class="mission__meta">
          <span>{{ entry.progress }}/{{ entry.mission.target }}</span>
          @if (showExpiry() && expiresIn(); as remaining) {
            <span>⏱ {{ remaining }}</span>
          }
        </p>
      </div>

      @switch (entry.state) {
        @case ('completed') {
          <button type="button" class="mission__claim" (click)="claim()">Resgatar</button>
        }
        @case ('claimed') {
          <span class="mission__claimed"><span aria-hidden="true">✅</span> Resgatada</span>
        }
        @default {
          <span class="mission__reward">+{{ formatNumber(entry.mission.reward.xp) }} XP</span>
        }
      }
    </article>
  `,
  styleUrl: './mission-card.scss',
})
export class MissionCard {
  readonly status = input.required<MissionStatus>();
  readonly showExpiry = input(false);

  private readonly store = inject(AventuraStore);
  private readonly audio = inject(AventuraAudio);

  protected readonly formatNumber = formatNumber;
  protected readonly percentage = computed(() => {
    const { progress, mission } = this.status();

    return Math.round((progress / mission.target) * 100);
  });

  protected readonly expiresIn = computed(() => {
    const expiresAt = this.status().expiresAt;

    return expiresAt ? formatCountdown(timeUntil(expiresAt, this.store.now())) : null;
  });

  protected claim(): void {
    if (this.store.claimMission(this.status().mission.id)) {
      this.audio.play('claim');
    }
  }
}
