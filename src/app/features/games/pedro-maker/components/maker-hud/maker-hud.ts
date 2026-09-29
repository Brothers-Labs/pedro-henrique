import { ChangeDetectionStrategy, Component, computed, input, output } from '@angular/core';

import { POWER_UP_LABELS } from '../../config/object-catalog';
import type { PowerUpKind } from '../../models/level.model';
import type { BossHudState, HudState } from '../../models/session.model';

/** Power-up ativo mostrado na barra de baixo; `key` reinicia a contagem ao pegar de novo. */
export interface ActivePowerUp {
  readonly kind: PowerUpKind;
  readonly durationMs: number;
  readonly key: number;
}

/**
 * Painel da fase: corações à esquerda, nome da fase no centro, moedas e
 * cristais à direita, power-ups ativos embaixo e a vida do chefão quando ele
 * acorda. Só informa — nenhum número daqui é calculado na tela.
 */
@Component({
  selector: 'app-maker-hud',
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './maker-hud.html',
  styleUrl: './maker-hud.scss',
})
export class MakerHud {
  readonly hud = input.required<HudState>();
  readonly label = input.required<string>();
  readonly subtitle = input('');
  readonly boss = input<BossHudState | null>(null);
  readonly powerUps = input<readonly ActivePowerUp[]>([]);

  readonly pauseRequested = output<void>();

  protected readonly hearts = computed(() => {
    const { hearts, maxHearts } = this.hud();

    return Array.from({ length: maxHearts }, (_, index) => index < hearts);
  });

  protected readonly crystals = computed(() => {
    const { crystalsFound, crystalsTotal } = this.hud();

    return Array.from({ length: crystalsTotal }, (_, index) => index < crystalsFound);
  });

  protected readonly bossHearts = computed(() => {
    const boss = this.boss();

    return boss ? Array.from({ length: boss.maxHitPoints }, (_, index) => index < boss.hitPoints) : [];
  });

  protected labelOf(kind: PowerUpKind): { readonly label: string; readonly emoji: string } {
    return POWER_UP_LABELS[kind];
  }
}
