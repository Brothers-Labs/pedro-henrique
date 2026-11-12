import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { Router } from '@angular/router';

import { formatPlacement, formatRaceTime } from '../../../pedro-kart/race-format';
import { PedrereGameHost } from '../../components/pedrere-game-host/pedrere-game-host';
import { PedrerePageFrame } from '../../components/pedrere-page-frame/pedrere-page-frame';
import { PedrereResultPanel } from '../../components/pedrere-result-panel/pedrere-result-panel';
import { createRaceScene } from '../../engine/race-scene';
import { type PedrereScene, randomSeed } from '../../engine/scene';
import type { RaceResult, SceneResult } from '../../models/scene.model';
import { PODIUM_PLACEMENT, PedrereProgressService } from '../../services/pedrere-progress.service';

interface FinishedRace {
  readonly result: RaceResult;
  readonly isNewRecord: boolean;
}

/** Recado da chegada; nunca soa como derrota. */
function finishMessage(result: RaceResult): string {
  const time = formatRaceTime(result.timeMs);

  if (result.placement === 1) {
    return `Você venceu a corrida em ${time}! 🏆`;
  }

  if (result.placement <= PODIUM_PLACEMENT) {
    return `${formatPlacement(result.placement)} lugar em ${time}. Pódio! 🥳`;
  }

  return `Você cruzou a linha de chegada em ${time}! Pule os tijolos para ir mais rápido. 💪`;
}

/** Três estrelas para o primeiro lugar, duas para o pódio e uma para quem chegou. */
function raceStars(placement: number): number {
  if (placement === 1) {
    return 3;
  }

  return placement <= PODIUM_PLACEMENT ? 2 : 1;
}

/** Corrida: o Pedro contra a Lia, o Tito e a Nina até a bandeira. */
@Component({
  selector: 'app-pedrere-race-page',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [PedrerePageFrame, PedrereGameHost, PedrereResultPanel],
  template: `
    @if (finished(); as done) {
      <app-pedrere-page-frame heading="Corrida" emoji="🏁">
        <app-pedrere-result-panel
          [heading]="formatPlacement(done.result.placement) + ' lugar'"
          [message]="finishMessage(done.result)"
          [stars]="raceStars(done.result.placement)"
          [isNewRecord]="done.isNewRecord"
          (replay)="replay()"
        />
      </app-pedrere-page-frame>
    } @else {
      <app-pedrere-game-host [createScene]="createScene()" (finished)="onFinished($event)" (exited)="exit()" />
    }
  `,
})
export class PedrereRacePage {
  private readonly router = inject(Router);
  private readonly progress = inject(PedrereProgressService);

  protected readonly finished = signal<FinishedRace | null>(null);
  protected readonly finishMessage = finishMessage;
  protected readonly formatPlacement = formatPlacement;
  protected readonly raceStars = raceStars;
  /** Cada anfitrião novo chama a fábrica uma vez, e cada chamada sorteia uma pista nova. */
  protected readonly createScene = computed<() => PedrereScene>(() => {
    const look = this.progress.look();

    return () => createRaceScene({ look, seed: randomSeed() });
  });

  protected onFinished(result: SceneResult): void {
    if (result.mode !== 'corrida') {
      return;
    }

    this.finished.set({ result, isNewRecord: this.progress.recordRace(result).isNewRecord });
  }

  protected replay(): void {
    this.finished.set(null);
  }

  protected exit(): void {
    void this.router.navigate(['/jogos/pedro-pedrere']);
  }
}
