import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';
import { RouterLink } from '@angular/router';

import { FlashPageFrame } from '../../components/flash-page-frame/flash-page-frame';
import { FlashShowroom } from '../../components/flash-showroom/flash-showroom';
import { shoe, SHOES, TRAIL_COLORS, trailColor } from '../../config/runner.config';
import type { ShoeId, ShoeStats, TrailColorId } from '../../models/runner.model';
import { FlashProgressService } from '../../services/flash-progress.service';

interface StatRow {
  readonly label: string;
  readonly emoji: string;
  readonly value: number;
}

/** Notas vão de 1 a 5; a barra mostra quantas bolinhas estão cheias. */
const STAT_MAXIMUM = 5;

/**
 * O vestiário: o tênis e a cor do rastro de raio.
 *
 * Mesmo jeito da garagem do Pedro Kart: toda escolha vale na hora e fica
 * guardada, sem botão de salvar para a criança esquecer de apertar.
 */
@Component({
  selector: 'app-flash-wardrobe-page',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [RouterLink, FlashPageFrame, FlashShowroom],
  templateUrl: './flash-wardrobe-page.html',
  styleUrl: '../../../pedro-kart/pages/kart-garage/kart-garage-page.scss',
})
export class FlashWardrobePage {
  private readonly progressService = inject(FlashProgressService);

  protected readonly shoes = SHOES;
  protected readonly trails = TRAIL_COLORS;
  protected readonly statDots = Array.from({ length: STAT_MAXIMUM }, (_, index) => index + 1);
  protected readonly setup = this.progressService.setup;

  protected readonly selectedShoe = computed(() => shoe(this.setup().shoe));
  protected readonly selectedTrail = computed(() => trailColor(this.setup().trail));
  protected readonly stats = computed(() => statRows(this.selectedShoe().stats));
  protected readonly showroomLabel = computed(
    () => `O Pedro com o tênis ${this.selectedShoe().label} e rastro ${this.selectedTrail().label.toLowerCase()}`,
  );

  protected chooseShoe(id: ShoeId): void {
    this.progressService.chooseShoe(id);
  }

  protected chooseTrail(id: TrailColorId): void {
    this.progressService.chooseTrail(id);
  }
}

function statRows(stats: ShoeStats): readonly StatRow[] {
  return [
    { label: 'Velocidade', emoji: '💨', value: stats.speed },
    { label: 'Arrancada', emoji: '🚀', value: stats.acceleration },
    { label: 'Pulo', emoji: '🦘', value: stats.jump },
  ];
}
