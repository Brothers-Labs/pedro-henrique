import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { Router } from '@angular/router';

import { PedrereGameHost } from '../../components/pedrere-game-host/pedrere-game-host';
import { PedrerePageFrame } from '../../components/pedrere-page-frame/pedrere-page-frame';
import { PedrereResultPanel } from '../../components/pedrere-result-panel/pedrere-result-panel';
import { createBounceScene } from '../../engine/bounce-scene';
import { type PedrereScene, randomSeed } from '../../engine/scene';
import type { BounceResult, SceneResult } from '../../models/scene.model';
import { BOUNCE_GOAL_METERS, PedrereProgressService } from '../../services/pedrere-progress.service';

interface FinishedBounce {
  readonly result: BounceResult;
  readonly isNewRecord: boolean;
}

/** Recado do fim do pula-pula: comemora a meta e, abaixo dela, mostra quanto falta. */
function finishMessage(result: BounceResult): string {
  if (result.heightMeters >= BOUNCE_GOAL_METERS) {
    return `Você subiu ${result.heightMeters} metros! Que pulo! 🚀`;
  }

  return `Você subiu ${result.heightMeters} metros. Chegue a ${BOUNCE_GOAL_METERS} para bater a meta!`;
}

/** Pula-pula: subir quicando o mais alto que conseguir. */
@Component({
  selector: 'app-pedrere-bounce-page',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [PedrerePageFrame, PedrereGameHost, PedrereResultPanel],
  template: `
    @if (finished(); as done) {
      <app-pedrere-page-frame heading="Pula-pula" emoji="🤸">
        <app-pedrere-result-panel
          heading="Fim do pula-pula"
          [message]="finishMessage(done.result)"
          [isNewRecord]="done.isNewRecord"
          (replay)="replay()"
        />
      </app-pedrere-page-frame>
    } @else {
      <app-pedrere-game-host [createScene]="createScene()" (finished)="onFinished($event)" (exited)="exit()" />
    }
  `,
})
export class PedrereBouncePage {
  private readonly router = inject(Router);
  private readonly progress = inject(PedrereProgressService);

  protected readonly finished = signal<FinishedBounce | null>(null);
  protected readonly finishMessage = finishMessage;
  /** Cada anfitrião novo chama a fábrica uma vez, e cada chamada sorteia camas novas. */
  protected readonly createScene = computed<() => PedrereScene>(() => {
    const look = this.progress.look();

    return () => createBounceScene({ look, seed: randomSeed() });
  });

  protected onFinished(result: SceneResult): void {
    if (result.mode !== 'pula-pula') {
      return;
    }

    this.finished.set({ result, isNewRecord: this.progress.recordBounce(result).isNewRecord });
  }

  protected replay(): void {
    this.finished.set(null);
  }

  protected exit(): void {
    void this.router.navigate(['/jogos/pedro-pedrere']);
  }
}
