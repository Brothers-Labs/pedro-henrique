import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';

import { cosmeticById, RARITY_LABEL } from '../config/cosmetics.config';
import type { Reward, RewardStatus } from '../models/economy.model';
import { formatNumber } from './format';

export interface RewardPresentation {
  readonly emoji: string;
  readonly label: string;
  readonly detail: string;
}

/** Como um prêmio aparece para a criança: o que é e o que vem dentro. */
export function presentReward(reward: Reward): RewardPresentation {
  switch (reward.kind) {
    case 'coins':
      return { emoji: '🪙', label: `x${formatNumber(reward.amount)}`, detail: `${formatNumber(reward.amount)} moedas` };
    case 'diamonds':
      return { emoji: '💎', label: `x${formatNumber(reward.amount)}`, detail: `${formatNumber(reward.amount)} diamantes` };
    case 'chest':
      return {
        emoji: '🧰',
        label: reward.name,
        detail: `${reward.name}: ${formatNumber(reward.contents.coins)} moedas e ${formatNumber(reward.contents.diamonds)} diamantes`,
      };
    case 'cosmetic': {
      const cosmetic = cosmeticById(reward.cosmeticId);

      return { emoji: cosmetic.emoji, label: cosmetic.name, detail: `${cosmetic.name} (${RARITY_LABEL[cosmetic.rarity]})` };
    }
  }
}

const STATUS_LABEL: Readonly<Record<RewardStatus, string>> = {
  claimed: 'resgatado',
  claimable: 'pronto para resgatar',
  'locked-level': 'chegue ao nível para liberar',
  'locked-pass': 'precisa do passe',
};

/** Um prêmio da trilha: ícone, nome curto e a situação (resgatado, pronto, trancado). */
@Component({
  selector: 'app-reward-tile',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    @let view = presentation();
    <span class="tile" [class]="'tile tile--' + (status() ?? 'plain')" [attr.title]="view.detail">
      <span class="tile__emoji" aria-hidden="true">{{ view.emoji }}</span>
      <span class="tile__label">{{ view.label }}</span>
      @switch (status()) {
        @case ('claimed') {
          <span class="tile__mark" aria-hidden="true">✅</span>
        }
        @case ('locked-pass') {
          <span class="tile__mark" aria-hidden="true">🔒</span>
        }
      }
      <span class="visually-hidden">{{ view.detail }}{{ status() ? ', ' + statusLabel() : '' }}</span>
    </span>
  `,
  styleUrl: './reward-tile.scss',
})
export class RewardTile {
  readonly reward = input.required<Reward>();
  readonly status = input<RewardStatus | null>(null);

  protected readonly presentation = computed(() => presentReward(this.reward()));
  protected readonly statusLabel = computed(() => {
    const status = this.status();

    return status ? STATUS_LABEL[status] : '';
  });
}
