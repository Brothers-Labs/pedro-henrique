import {
  afterNextRender,
  ChangeDetectionStrategy,
  Component,
  computed,
  DestroyRef,
  ElementRef,
  inject,
  input,
  output,
  signal,
} from '@angular/core';
import { RouterLink } from '@angular/router';

import { ADVENTURE_RULES } from '../../config/adventure-rules.config';
import { buildTrailLayout, TRAIL_WIDTH, type TrailPoint, trailPath } from '../../engine/trail-layout';
import type { LevelStatus, LevelView, WorldView } from '../../models/adventure.model';
import { MapCompanion } from '../map-companion/map-companion';
import { StarRating } from '../star-rating/star-rating';

/** Larguras (px) a partir das quais a trilha ganha mais colunas. */
const THREE_COLUMNS_FROM = 560;
const FIVE_COLUMNS_FROM = 900;

/** Enfeites demais disputam atenção com a trilha. */
const MAX_DECORATIONS = 18;

/** Pausa antes do mascote andar, para a criança ver de onde ele saiu. */
const ARRIVAL_DELAY_MS = 450;

const RIVER_WAVE_HEIGHT = 26;
const RIVER_WAVE_LENGTH = 130;

interface TrailNode {
  readonly view: LevelView;
  readonly left: number;
  readonly top: number;
  readonly marker: string;
  readonly ariaLabel: string;
}

interface TrailDecoration {
  readonly emoji: string;
  readonly left: number;
  readonly top: number;
}

/**
 * A trilha de um mundo, desenhada como um mapa.
 *
 * O caminho e o rio são SVG; as fases são links de verdade por cima, numa
 * lista ordenada — o teclado e o leitor de tela percorrem as fases na ordem da
 * jornada, sem precisar enxergar o desenho. No celular a trilha desce em uma
 * coluna; com mais espaço, serpenteia em fileiras.
 */
@Component({
  selector: 'app-world-trail',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [RouterLink, MapCompanion, StarRating],
  templateUrl: './world-trail.html',
  styleUrl: './world-trail.scss',
})
export class WorldTrail {
  readonly view = input.required<WorldView>();
  /** O mascote só aparece no mundo em que a criança está. */
  readonly showCompanion = input(false);
  /** Fase de onde o mascote sai andando, logo depois de concluí-la. */
  readonly arrivedFromLevelId = input<string | null>(null);

  readonly lockedTapped = output<LevelView>();

  private readonly columns = signal(1);
  private readonly hasArrived = signal(false);

  /**
   * Só depois de medir a largura real a trilha sabe onde cada fase fica. Até
   * lá o mascote não tem transição — senão ele "viajaria" do desenho
   * provisório até o lugar certo a cada visita ao mapa.
   */
  protected readonly isMeasured = signal(false);

  protected readonly layout = computed(() => {
    const count = this.view().levels.length;

    return buildTrailLayout(count, Math.min(this.columns(), Math.max(1, count)));
  });

  /** Índice da fase em que o mascote mora. */
  private readonly targetIndex = computed(() => Math.max(0, (this.view().companionLevel?.order ?? 1) - 1));

  protected readonly aspectRatio = computed(() => `${this.layout().width} / ${this.layout().height}`);
  protected readonly fullPath = computed(() => trailPath(this.layout()));

  /** Caminho já percorrido: do início até a fase em que o mascote está. */
  protected readonly walkedPath = computed(() => trailPath(this.layout(), this.targetIndex()));

  protected readonly riverPath = computed(() => {
    const { width, riverY } = this.layout();
    const points: string[] = [];

    for (let x = 0; x <= width; x += RIVER_WAVE_LENGTH / 4) {
      points.push(`${x} ${Math.round(riverY + RIVER_WAVE_HEIGHT * Math.sin(x / RIVER_WAVE_LENGTH))}`);
    }

    return `M ${points.join(' L ')}`;
  });

  protected readonly nodes = computed<readonly TrailNode[]>(() => {
    const { points } = this.layout();

    return this.view().levels.map((view, index) => ({
      view,
      ...this.toPercent(points[index]),
      marker: markerFor(view),
      ariaLabel: `Fase ${view.order}: ${view.level.title}. ${statusText(view)}`,
    }));
  });

  protected readonly decorations = computed<readonly TrailDecoration[]>(() => {
    const spots = this.layout().decorationSpots;
    const stride = Math.max(1, Math.ceil(spots.length / MAX_DECORATIONS));
    const emojis = this.view().world.scenery.decorations;

    return spots
      .filter((_, index) => index % stride === 0)
      .map((spot, index) => ({ emoji: emojis[index % emojis.length], ...this.toPercent(spot) }));
  });

  protected readonly companion = computed(() => {
    const from = this.view().levels.findIndex((view) => view.level.id === this.arrivedFromLevelId());
    const index = !this.hasArrived() && from >= 0 ? from : this.targetIndex();
    const point = this.layout().points[index];

    return point ? { ...this.toPercent(point), side: point.x > TRAIL_WIDTH / 2 ? 'left' : 'right' } : null;
  });

  constructor() {
    const host = inject<ElementRef<HTMLElement>>(ElementRef).nativeElement;
    const destroyRef = inject(DestroyRef);

    afterNextRender(() => {
      this.columns.set(columnsFor(host.clientWidth));

      const observer = new ResizeObserver(([entry]) => this.columns.set(columnsFor(entry.contentRect.width)));
      const frame = requestAnimationFrame(() => this.isMeasured.set(true));
      const timer = setTimeout(() => this.hasArrived.set(true), ARRIVAL_DELAY_MS);

      observer.observe(host);
      destroyRef.onDestroy(() => {
        observer.disconnect();
        cancelAnimationFrame(frame);
        clearTimeout(timer);
      });
    });
  }

  protected tapLocked(view: LevelView): void {
    this.lockedTapped.emit(view);
  }

  private toPercent(point: TrailPoint): { readonly left: number; readonly top: number } {
    const { width, height } = this.layout();

    return { left: (point.x / width) * 100, top: (point.y / height) * 100 };
  }
}

function columnsFor(width: number): number {
  if (width >= FIVE_COLUMNS_FROM) {
    return 5;
  }

  return width >= THREE_COLUMNS_FROM ? 3 : 1;
}

const MARKERS: Readonly<Record<LevelStatus, string | null>> = {
  locked: '🔒',
  completed: '✓',
  perfect: '⭐',
  current: null,
  available: null,
};

function markerFor(view: LevelView): string {
  return MARKERS[view.status] ?? view.level.icon;
}

function statusText(view: LevelView): string {
  const stars = view.record?.bestStars ?? 0;
  const max = ADVENTURE_RULES.stars.max;

  switch (view.status) {
    case 'locked':
      return 'Trancada.';
    case 'current':
      return 'Você está aqui.';
    case 'available':
      return 'Liberada.';
    case 'completed':
      return `Concluída, ${stars} de ${max} estrelas.`;
    case 'perfect':
      return `Perfeita, ${max} de ${max} estrelas.`;
  }
}
