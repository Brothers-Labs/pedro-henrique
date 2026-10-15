import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';

import { ConfirmDialog } from '../../components/confirm-dialog';
import { formatCountdown, formatNumber } from '../../components/format';
import { LevelBadge } from '../../components/level-badge';
import { PassCards } from '../../components/pass-cards';
import { presentReward, RewardTile } from '../../components/reward-tile';
import type { PassId, Reward, RewardStatus } from '../../models/economy.model';
import { PASS_ORDER } from '../../rules/season-pass';
import { AventuraAudio } from '../../services/aventura-audio.service';
import { AventuraStore } from '../../services/aventura-store.service';

/** Níveis mostrados por página da trilha: cabem no celular sem rolar de lado. */
const LEVELS_PER_PAGE = 5;

const PASS_LABEL: Readonly<Record<PassId, string>> = { gratuito: 'Gratuito', vip: 'VIP', luxo: 'Luxo' };

interface TrackCell {
  readonly level: number;
  readonly pass: PassId;
  readonly reward: Reward;
  readonly status: RewardStatus;
}

/**
 * Passe de temporada: a trilha de 20 níveis em três faixas, o resgate dos
 * prêmios, a compra de níveis e os passes VIP e Luxo.
 */
@Component({
  selector: 'app-pass-page',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [LevelBadge, PassCards, RewardTile, ConfirmDialog],
  templateUrl: './pass-page.html',
  styleUrls: ['../page.scss', './pass-page.scss'],
})
export class PassPage {
  private readonly store = inject(AventuraStore);
  private readonly audio = inject(AventuraAudio);

  protected readonly passes = PASS_ORDER;
  protected readonly passLabel = PASS_LABEL;
  protected readonly season = this.store.season;
  protected readonly phase = this.store.seasonPhase;
  protected readonly countdown = computed(() => formatCountdown(this.store.seasonTimeLeft()));
  protected readonly claimableCount = this.store.claimableRewardCount;
  protected readonly isBuyingLevel = signal(false);
  protected readonly formatNumber = formatNumber;
  protected readonly levelPrice = computed(() => this.store.levelsPrice(1));
  protected readonly canBuyLevel = computed(() => this.phase() === 'active' && this.levelPrice() > 0);

  protected readonly page = signal(Math.floor((this.store.seasonLevel().level - 1) / LEVELS_PER_PAGE));
  protected readonly pageCount = Math.ceil(this.season.tiers.length / LEVELS_PER_PAGE);

  protected readonly visibleLevels = computed(() =>
    this.season.tiers.slice(this.page() * LEVELS_PER_PAGE, (this.page() + 1) * LEVELS_PER_PAGE).map((tier) => tier.level),
  );

  protected readonly rows = computed(() =>
    PASS_ORDER.map((pass) => ({
      pass,
      cells: this.visibleLevels().map((level): TrackCell => {
        const tier = this.season.tiers[level - 1];

        return { level, pass, reward: tier.rewards[pass], status: this.store.rewardStatus(level, pass) };
      }),
    })),
  );

  protected readonly highlights = computed(() =>
    [20, 10, 5].map((level) => {
      const reward = this.season.tiers[level - 1].rewards.luxo;

      return { level, reward, view: presentReward(reward) };
    }),
  );

  protected previousPage(): void {
    this.page.update((page) => Math.max(0, page - 1));
  }

  protected nextPage(): void {
    this.page.update((page) => Math.min(this.pageCount - 1, page + 1));
  }

  protected claim(cell: TrackCell): void {
    if (cell.status === 'claimable' && this.store.claimReward(cell.level, cell.pass)) {
      this.audio.play('claim');
    }
  }

  protected claimAll(): void {
    if (this.store.claimAllRewards()) {
      this.audio.play('claim');
    }
  }

  protected buyLevel(): void {
    this.isBuyingLevel.set(false);

    if (this.store.buyLevels(1)) {
      this.audio.play('unlock');
    }
  }

  protected canAffordLevel(): boolean {
    return this.store.diamonds() >= this.levelPrice();
  }

  protected cellLabel(cell: TrackCell): string {
    const view = presentReward(cell.reward);

    return `Nível ${cell.level}, ${PASS_LABEL[cell.pass]}: ${view.detail}`;
  }
}
