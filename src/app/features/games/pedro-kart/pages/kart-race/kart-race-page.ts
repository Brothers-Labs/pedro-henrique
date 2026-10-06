import { ChangeDetectionStrategy, Component, computed, effect, inject, signal, untracked } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { map } from 'rxjs';

import { KartPageFrame } from '../../components/kart-page-frame/kart-page-frame';
import { KartRaceHost } from '../../components/kart-race-host/kart-race-host';
import type { TrackDefinition } from '../../models/track.model';
import { formatPlacement, formatRaceTime } from '../../race-format';
import { KartProgressService, type RaceRecordOutcome } from '../../services/kart-progress.service';
import { KartTrackService } from '../../services/kart-track.service';
import type { RaceResult } from '../../simulation/race-simulation';

type PageStatus = 'carregando' | 'pronta' | 'nao-encontrada' | 'erro';

interface FinishedRace {
  readonly result: RaceResult;
  readonly outcome: RaceRecordOutcome;
}

/** O que dizer em cada colocação; nunca soa como derrota. */
function finishMessage(placement: number): string {
  if (placement === 1) {
    return 'Você venceu a corrida! 🏆';
  }

  if (placement <= 3) {
    return 'Pódio! Que corrida incrível! 🥳';
  }

  return 'Você cruzou a linha de chegada! Bora de novo? 💪';
}

/**
 * A tela da corrida.
 *
 * Carrega a pista (oficial ou criada), entrega para o anfitrião da corrida e
 * mostra o resultado na chegada. "Correr de novo" troca a chave do
 * anfitrião, e o Angular cria uma corrida novinha.
 */
@Component({
  selector: 'app-kart-race-page',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [RouterLink, KartPageFrame, KartRaceHost],
  templateUrl: './kart-race-page.html',
  styleUrl: './kart-race-page.scss',
})
export class KartRacePage {
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);
  private readonly tracks = inject(KartTrackService);
  private readonly progress = inject(KartProgressService);
  private readonly trackId = toSignal(this.route.paramMap.pipe(map((params) => params.get('trackId') ?? '')), {
    initialValue: '',
  });

  protected readonly status = signal<PageStatus>('carregando');
  protected readonly track = signal<TrackDefinition | null>(null);
  protected readonly finished = signal<FinishedRace | null>(null);
  protected readonly attempt = signal(0);
  /** Uma chave por tentativa: trocar a chave recria o anfitrião, e a corrida recomeça limpa. */
  protected readonly runKeys = computed(() => [`${this.track()?.id ?? ''}:${this.attempt()}`]);
  protected readonly formatTime = formatRaceTime;
  protected readonly formatPlacement = formatPlacement;
  protected readonly finishMessage = finishMessage;
  protected readonly starSlots = [1, 2, 3] as const;

  constructor() {
    effect(() => {
      const id = this.trackId();

      untracked(() => void this.loadTrack(id));
    });
  }

  protected onFinished(result: RaceResult): void {
    const track = this.track();

    if (!track) {
      return;
    }

    const outcome = this.progress.recordRace(track.id, result.placement, result.timeMs);

    this.finished.set({ result, outcome });
  }

  protected raceAgain(): void {
    this.finished.set(null);
    this.attempt.update((value) => value + 1);
  }

  protected leave(): void {
    void this.router.navigate(['/jogos/pedro-kart/pistas']);
  }

  private async loadTrack(id: string): Promise<void> {
    this.status.set('carregando');
    this.finished.set(null);

    try {
      const track = await this.tracks.find(id);

      this.track.set(track);
      this.status.set(track ? 'pronta' : 'nao-encontrada');
    } catch (error) {
      console.error('Pedro Kart: não foi possível abrir a pista.', error);
      this.status.set('erro');
    }
  }
}
