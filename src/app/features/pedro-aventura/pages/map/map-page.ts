import {
  afterNextRender,
  ChangeDetectionStrategy,
  Component,
  computed,
  DestroyRef,
  effect,
  type ElementRef,
  inject,
  NgZone,
  signal,
  untracked,
  viewChild,
  viewChildren,
} from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { map } from 'rxjs';

import { MotionPreferenceService } from '../../../../core/services/motion-preference.service';
import { formatStopwatch } from '../../components/format';
import { LevelBadge } from '../../components/level-badge';
import { RewardTile } from '../../components/reward-tile';
import { NO_3D_MESSAGE, ScenePresence } from '../../components/scene-presence';
import { REGIONS } from '../../config/regions.config';
import type { MapSession } from '../../engine/launch';
import type { RegionId, RegionStatus } from '../../models/campaign.model';
import { AventuraAudio } from '../../services/aventura-audio.service';
import { AventuraStore } from '../../services/aventura-store.service';

const REGION_IDS = new Set<string>(REGIONS.map((region) => region.id));

function isRegionId(value: string | undefined): value is RegionId {
  return value !== undefined && REGION_IDS.has(value);
}

/**
 * Mapa da aventura: as seis regiões em 3D, a faixa de cartões e as fases da
 * região escolhida.
 *
 * O mapa 3D é atalho visual; a faixa de cartões e a lista de fases fazem o
 * mesmo com teclado e leitor de tela.
 */
@Component({
  selector: 'app-map-page',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [RouterLink, LevelBadge, RewardTile],
  templateUrl: './map-page.html',
  styleUrl: './map-page.scss',
})
export class MapPage {
  private readonly route = inject(ActivatedRoute);
  private readonly store = inject(AventuraStore);
  private readonly audio = inject(AventuraAudio);
  private readonly motion = inject(MotionPreferenceService);
  private readonly zone = inject(NgZone);
  private readonly canvasHost = viewChild.required<ElementRef<HTMLElement>>('canvasHost');
  private readonly labelElements = viewChildren<ElementRef<HTMLElement>>('regionLabel');

  protected readonly presence = new ScenePresence<MapSession>(this.zone, inject(DestroyRef));
  protected readonly noSceneMessage = NO_3D_MESSAGE;
  protected readonly regions = this.store.regions;
  protected readonly formatStopwatch = formatStopwatch;
  private readonly chosen = signal<RegionId | null>(null);

  /** `?regiao=` da URL, para voltar do jogo direto na região certa. */
  private readonly regiao = toSignal(this.route.queryParamMap.pipe(map((params) => params.get('regiao') ?? undefined)), {
    initialValue: this.route.snapshot.queryParamMap.get('regiao') ?? undefined,
  });

  protected readonly selectedId = computed<RegionId>(() => {
    const chosen = this.chosen();
    const fromUrl = this.regiao();

    if (chosen) {
      return chosen;
    }

    if (isRegionId(fromUrl)) {
      return fromUrl;
    }

    return this.store.suggestedLevel().regionId;
  });

  protected readonly selected = computed(() => this.regions().find((view) => view.region.id === this.selectedId()) ?? this.regions()[0]);

  protected readonly nextReward = computed(() => {
    const info = this.store.seasonLevel();
    const tier = this.store.season.tiers.find((candidate) => candidate.level === info.level + 1);

    return tier ? { level: tier.level, reward: tier.rewards.gratuito, missingXp: info.xpForNextLevel - info.xpInLevel } : null;
  });

  constructor() {
    afterNextRender(() => void this.start());

    effect(() => {
      const statuses = new Map<RegionId, RegionStatus>(this.regions().map((view) => [view.region.id, view.status]));
      const selected = this.selectedId();
      const session = this.presence.current;

      if (session && this.presence.phase() === 'ready') {
        untracked(() => session.setStatuses(statuses, selected));
      }
    });
  }

  protected select(regionId: RegionId): void {
    this.chosen.set(regionId);
    this.audio.play('button');
  }

  protected statusLabel(status: RegionStatus): string {
    switch (status) {
      case 'unlocked':
        return 'Aberta';
      case 'locked':
        return 'Trancada';
      case 'event-closed':
        return 'Evento encerrado';
    }
  }

  private async start(): Promise<void> {
    const labels = new Map<RegionId, HTMLElement>();

    for (const element of this.labelElements()) {
      const id = element.nativeElement.dataset['region'];

      if (isRegionId(id)) {
        labels.set(id, element.nativeElement);
      }
    }

    await this.presence.mount(async () => {
      const { launchMap } = await import('../../engine/launch');

      return launchMap({
        parent: this.canvasHost().nativeElement,
        labels,
        onSelect: (regionId) => this.selectFromScene(regionId),
        quality: untracked(() => this.store.settings().quality),
        isMotionAllowed: untracked(() => this.motion.isAllowed()),
        onContextChange: (isLost) => this.presence.setContextLost(isLost),
      });
    });
  }

  /** Toque na ilha chega de fora da zona do Angular. */
  private readonly selectFromScene = (regionId: RegionId): void => {
    this.zone.run(() => this.select(regionId));
  };
}
