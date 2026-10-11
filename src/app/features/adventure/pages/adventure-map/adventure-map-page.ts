import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { Router, RouterLink } from '@angular/router';

import { PROFILE } from '../../../../core/data/profile.data';
import { PetService } from '../../../../core/services/pet.service';
import { PageIntro } from '../../../../shared/components/page-intro/page-intro';
import { AdventureDiary } from '../../components/adventure-diary/adventure-diary';
import { AdventureHeader } from '../../components/adventure-header/adventure-header';
import { MapCompanion } from '../../components/map-companion/map-companion';
import { WorldDetails } from '../../components/world-details/world-details';
import { WorldStrip } from '../../components/world-strip/world-strip';
import { WorldTrail } from '../../components/world-trail/world-trail';
import { COMPANION_LINES, journeyGreeting } from '../../config/companion-lines.config';
import type { LevelView, WorldView } from '../../models/adventure.model';
import { AdventureService } from '../../services/adventure.service';

/** Estado que a tela da fase deixa ao voltar para o mapa. */
export interface AdventureMapNavigationState {
  readonly arrivedFromLevelId?: string;
}

/**
 * Página do Mapa da Aventura.
 *
 * Mostra o mundo em que a criança está, com o mascote parado na fase atual.
 * Os outros mundos ficam a um toque, na faixa do topo; os trancados contam o
 * que falta para abri-los, sem esconder que existem.
 */
@Component({
  selector: 'app-adventure-map-page',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [RouterLink, PageIntro, AdventureHeader, WorldStrip, WorldTrail, WorldDetails, MapCompanion, AdventureDiary],
  templateUrl: './adventure-map-page.html',
  styleUrl: './adventure-map-page.scss',
})
export class AdventureMapPage {
  private readonly adventure = inject(AdventureService);

  /** Lido uma vez: o mascote só anda na chegada, não a cada visita ao mapa. */
  private readonly arrivedFromLevelId =
    (inject(Router).currentNavigation()?.extras.state as AdventureMapNavigationState | undefined)
      ?.arrivedFromLevelId ?? null;

  private readonly shownWorldId = signal<string | null>(null);
  private readonly lockedHint = signal<string | null>(null);

  protected readonly hasPet = inject(PetService).hasPet;
  protected readonly worlds = this.adventure.worldViews;
  protected readonly detailsView = signal<WorldView | null>(null);

  protected readonly currentWorld = this.adventure.currentWorld;

  /** Mundo desenhado no mapa: o escolhido na faixa, ou o atual. */
  protected readonly shownWorld = computed<WorldView | null>(() => {
    const chosen = this.worlds().find((view) => view.world.id === this.shownWorldId());

    return chosen ?? this.currentWorld();
  });

  protected readonly shownWorldIdOrNull = computed(() => this.shownWorld()?.world.id ?? null);

  protected readonly isCompanionHere = computed(
    () => this.shownWorld()?.world.id === this.currentWorld()?.world.id,
  );

  protected readonly arrivalLevelId = computed(() => (this.isCompanionHere() ? this.arrivedFromLevelId : null));

  protected readonly companionLine = computed(() => this.lockedHint() ?? journeyGreeting(this.currentWorld(), PROFILE.firstName));

  constructor() {
    this.adventure.deliverAccessories();
  }

  protected openDetails(view: WorldView): void {
    this.detailsView.set(view);
  }

  protected closeDetails(): void {
    this.detailsView.set(null);
  }

  protected showWorld(view: WorldView): void {
    this.detailsView.set(null);
    this.shownWorldId.set(view.world.id);
  }

  protected explainLocked(view: LevelView): void {
    this.lockedHint.set(`${COMPANION_LINES.map.locked} (Fase ${view.order}: ${view.level.title})`);
  }
}
