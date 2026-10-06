import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';
import { RouterLink } from '@angular/router';

import { KartPageFrame } from '../../components/kart-page-frame/kart-page-frame';
import { KartShowroom } from '../../components/kart-showroom/kart-showroom';
import { KART_BODIES, KART_COLORS, kartBody, kartColor } from '../../config/kart.config';
import type { KartBodyId, KartColorId, KartStats } from '../../models/kart.model';
import { KartProgressService } from '../../services/kart-progress.service';

interface StatRow {
  readonly label: string;
  readonly emoji: string;
  readonly value: number;
}

/** Notas vão de 1 a 5; a barra mostra quantas bolinhas estão cheias. */
const STAT_MAXIMUM = 5;

/**
 * A garagem: modelo e cor do kart.
 *
 * Toda escolha vale na hora e fica guardada; não existe botão de salvar para
 * a criança esquecer de apertar.
 */
@Component({
  selector: 'app-kart-garage-page',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [RouterLink, KartPageFrame, KartShowroom],
  templateUrl: './kart-garage-page.html',
  styleUrl: './kart-garage-page.scss',
})
export class KartGaragePage {
  private readonly progressService = inject(KartProgressService);

  protected readonly bodies = KART_BODIES;
  protected readonly colors = KART_COLORS;
  protected readonly statDots = Array.from({ length: STAT_MAXIMUM }, (_, index) => index + 1);
  protected readonly setup = this.progressService.setup;

  protected readonly selectedBody = computed(() => kartBody(this.setup().body));
  protected readonly selectedColor = computed(() => kartColor(this.setup().color));
  protected readonly stats = computed(() => statRows(this.selectedBody().stats));
  protected readonly showroomLabel = computed(
    () => `Kart ${this.selectedBody().label} ${this.selectedColor().label.toLowerCase()} com o Pedro ao volante`,
  );

  protected chooseBody(body: KartBodyId): void {
    this.progressService.chooseBody(body);
  }

  protected chooseColor(color: KartColorId): void {
    this.progressService.chooseColor(color);
  }
}

function statRows(stats: KartStats): readonly StatRow[] {
  return [
    { label: 'Velocidade', emoji: '💨', value: stats.speed },
    { label: 'Arrancada', emoji: '🚀', value: stats.acceleration },
    { label: 'Curva', emoji: '↪️', value: stats.handling },
  ];
}
