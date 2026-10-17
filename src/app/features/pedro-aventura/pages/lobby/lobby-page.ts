import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';
import { Router, RouterLink } from '@angular/router';

import { DifficultyPicker } from '../../components/difficulty-picker';
import { describeCountdown, formatCountdown } from '../../components/format';
import { LevelBadge } from '../../components/level-badge';
import { LobbyStage } from '../../components/lobby-stage';
import { MissionCard } from '../../components/mission-card';
import { PassCards } from '../../components/pass-cards';
import { REGIONS } from '../../config/regions.config';
import { timeUntil } from '../../rules/calendar';
import { AventuraAudio } from '../../services/aventura-audio.service';
import { AventuraStore } from '../../services/aventura-store.service';

const EVENT_REGION = REGIONS.find((region) => region.id === 'eventos-especiais') ?? REGIONS[0];

/**
 * Lobby: o Pedro e o Rex no pódio, a contagem da temporada, o botão de jogar,
 * as missões do dia, o evento especial e os passes.
 *
 * "Jogar agora" leva direto à primeira fase aberta e ainda não vencida: um
 * toque do lobby até a corrida.
 */
@Component({
  selector: 'app-lobby-page',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [RouterLink, LobbyStage, LevelBadge, MissionCard, PassCards, DifficultyPicker],
  templateUrl: './lobby-page.html',
  styleUrl: './lobby-page.scss',
})
export class LobbyPage {
  private readonly store = inject(AventuraStore);
  private readonly router = inject(Router);
  private readonly audio = inject(AventuraAudio);

  protected readonly season = this.store.season;
  protected readonly phase = this.store.seasonPhase;
  protected readonly countdown = computed(() => formatCountdown(this.store.seasonTimeLeft()));
  protected readonly countdownLabel = computed(() => describeCountdown(this.store.seasonTimeLeft()));
  protected readonly suggested = this.store.suggestedLevel;
  protected readonly dailyMissions = computed(() => this.store.missions().filter((entry) => entry.mission.category === 'daily'));

  protected readonly event = computed(() => {
    const view = this.store.regions().find((entry) => entry.region.id === EVENT_REGION.id);
    const unlock = EVENT_REGION.unlock;
    const endsAt = unlock.kind === 'event' ? unlock.endsAt : this.season.endsAt;

    return {
      status: view?.status ?? 'locked',
      hint: view?.hint ?? '',
      timeLeft: formatCountdown(timeUntil(endsAt, this.store.now())),
    };
  });

  constructor() {
    this.audio.playMusic('lobby');
  }

  protected play(): void {
    this.audio.play('button');
    void this.router.navigate(['/pedro-aventura/fase', this.suggested().id]);
  }
}
