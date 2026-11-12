import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { map } from 'rxjs';

import { PedrereGameHost } from '../../components/pedrere-game-host/pedrere-game-host';
import { PedrerePageFrame } from '../../components/pedrere-page-frame/pedrere-page-frame';
import { PedrereResultPanel } from '../../components/pedrere-result-panel/pedrere-result-panel';
import { createAdventureScene } from '../../engine/adventure-scene';
import type { PedrereScene } from '../../engine/scene';
import { adventureLevel } from '../../levels/adventure-levels';
import type { PedrereLevel } from '../../models/level.model';
import type { AdventureResult, SceneResult } from '../../models/scene.model';
import { PedrereLevelsService } from '../../services/pedrere-levels.service';
import { PedrereProgressService } from '../../services/pedrere-progress.service';

interface FinishedAdventure {
  readonly result: AdventureResult;
  readonly isNewRecord: boolean;
}

/** O que dizer no fim da fase; perder as vidas nunca soa como fracasso. */
function finishMessage(result: AdventureResult): string {
  if (!result.isVictory) {
    return 'As vidas acabaram, mas faltou pouquinho! Bora tentar de novo? 💪';
  }

  return `Você chegou na bandeira com ${result.coins} de ${result.totalCoins} moedas!`;
}

/**
 * Uma fase de aventura: a pronta ou a criada no modo maker, pelo id da rota.
 *
 * Quando a fase termina, o anfitrião sai de cena e o painel de resultado
 * entra. "Jogar de novo" troca o painel por um anfitrião novinho.
 */
@Component({
  selector: 'app-pedrere-play-page',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [RouterLink, PedrerePageFrame, PedrereGameHost, PedrereResultPanel],
  templateUrl: './pedrere-play-page.html',
})
export class PedrerePlayPage {
  private readonly router = inject(Router);
  private readonly progress = inject(PedrereProgressService);
  private readonly levels = inject(PedrereLevelsService);
  private readonly levelId = toSignal(
    inject(ActivatedRoute).paramMap.pipe(map((params) => params.get('levelId') ?? '')),
    { initialValue: '' },
  );

  protected readonly level = computed<PedrereLevel | null>(() => {
    const id = this.levelId();

    return adventureLevel(id) ?? this.levels.find(id);
  });
  protected readonly isCustomLevel = computed(() => adventureLevel(this.levelId()) === null);
  protected readonly finished = signal<FinishedAdventure | null>(null);
  protected readonly finishMessage = finishMessage;

  protected readonly createScene = computed<(() => PedrereScene) | null>(() => {
    const level = this.level();
    const look = this.progress.look();

    return level ? () => createAdventureScene(level, { look }) : null;
  });

  protected onFinished(result: SceneResult): void {
    const level = this.level();

    if (result.mode !== 'aventura' || !level) {
      return;
    }

    const outcome = this.progress.recordAdventure(level.id, result);

    this.finished.set({ result, isNewRecord: outcome.isNewRecord });
  }

  protected replay(): void {
    this.finished.set(null);
  }

  protected exit(): void {
    void this.router.navigate(['/jogos/pedro-pedrere/aventuras']);
  }
}
