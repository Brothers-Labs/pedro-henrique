import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';

import { KartPageFrame } from '../../components/kart-page-frame/kart-page-frame';
import { TrackThumbnail } from '../../components/track-thumbnail/track-thumbnail';
import { DIFFICULTIES } from '../../config/kart.config';
import { trackTheme } from '../../config/theme.config';
import type { RaceDifficulty } from '../../models/kart.model';
import type { TrackDefinition } from '../../models/track.model';
import { formatPlacement, formatRaceTime } from '../../race-format';
import { KartProgressService } from '../../services/kart-progress.service';
import { KartTrackService } from '../../services/kart-track.service';
import { DEFAULT_TRACKS } from '../../tracks/default-tracks';

/**
 * Escolha da pista: as cinco oficiais e as que o Pedro criou.
 *
 * A dificuldade fica aqui, e não escondida num menu de configurações: é a
 * última escolha antes da largada, quando ela mais importa.
 */
@Component({
  selector: 'app-kart-tracks-page',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [RouterLink, KartPageFrame, TrackThumbnail],
  templateUrl: './kart-tracks-page.html',
  styleUrl: './kart-tracks-page.scss',
})
export class KartTracksPage {
  private readonly progressService = inject(KartProgressService);
  private readonly trackService = inject(KartTrackService);

  protected readonly officialTracks = DEFAULT_TRACKS;
  protected readonly difficulties = DIFFICULTIES;
  protected readonly difficulty = this.progressService.difficulty;
  protected readonly customTracks = this.trackService.tracks;
  protected readonly status = this.trackService.status;
  protected readonly isEmpty = this.trackService.isEmpty;
  /** Pista com o "apagar mesmo?" aberto; apagar é para sempre, então pede confirmação. */
  protected readonly pendingDeletion = signal<string | null>(null);

  constructor() {
    void this.trackService.load();
  }

  protected chooseDifficulty(difficulty: RaceDifficulty): void {
    this.progressService.chooseDifficulty(difficulty);
  }

  protected themeLabel(track: TrackDefinition): string {
    const theme = trackTheme(track.theme);

    return `${theme.emoji} ${theme.label}`;
  }

  protected recordLabel(track: TrackDefinition): string | null {
    const record = this.progressService.recordOf(track.id);

    return record ? `Recorde ${formatRaceTime(record.bestTimeMs)} · melhor ${formatPlacement(record.bestPlacement)} lugar` : null;
  }

  protected askToDelete(id: string): void {
    this.pendingDeletion.set(id);
  }

  protected cancelDeletion(): void {
    this.pendingDeletion.set(null);
  }

  protected async confirmDeletion(id: string): Promise<void> {
    this.pendingDeletion.set(null);

    try {
      await this.trackService.remove(id);
    } catch (error) {
      console.error('Pedro Kart: não foi possível apagar a pista.', error);
    }
  }

  protected retryLoading(): void {
    void this.trackService.load();
  }
}
