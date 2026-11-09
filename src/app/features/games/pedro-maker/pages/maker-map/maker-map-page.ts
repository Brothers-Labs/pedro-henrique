import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { map } from 'rxjs';

import { MakerPageFrame } from '../../components/maker-page-frame/maker-page-frame';
import { levelsOfWorld } from '../../levels/campaign';
import { WORLDS } from '../../levels/worlds.data';
import type { CampaignLevel, World, WorldId } from '../../models/campaign.model';
import { isWorldUnlocked } from '../../progress/maker-progression';
import { MakerProgressService } from '../../services/maker-progress.service';

interface WorldCard {
  readonly world: World;
  readonly isUnlocked: boolean;
  readonly stars: number;
  readonly maxStars: number;
}

interface LevelNode {
  readonly level: CampaignLevel;
  readonly isUnlocked: boolean;
  readonly isCompleted: boolean;
  readonly stars: number;
  readonly isNext: boolean;
}

/**
 * Mapa da aventura: os seis mundos e a trilha de fases do mundo escolhido.
 *
 * O mundo vem da URL (`?mundo=2`), para que o botão JOGAR abra direto onde a
 * aventura parou e o "voltar" do navegador funcione como a criança espera.
 */
@Component({
  selector: 'app-maker-map-page',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [RouterLink, MakerPageFrame],
  templateUrl: './maker-map-page.html',
  styleUrl: './maker-map-page.scss',
})
export class MakerMapPage {
  private readonly progress = inject(MakerProgressService);
  private readonly router = inject(Router);

  private readonly requestedWorld = toSignal(
    inject(ActivatedRoute).queryParamMap.pipe(map((params) => Number(params.get('mundo')))),
    { initialValue: Number.NaN },
  );

  protected readonly selectedWorldId = computed<WorldId>(() => {
    const requested = this.requestedWorld();
    const world = WORLDS.find((candidate) => candidate.id === requested);

    return world && isWorldUnlocked(this.progress.progress(), world.id) ? world.id : this.progress.nextLevel().worldId;
  });

  protected readonly selectedWorld = computed(
    () => WORLDS.find((world) => world.id === this.selectedWorldId()) ?? WORLDS[0],
  );

  protected readonly worlds = computed<readonly WorldCard[]>(() => {
    const progress = this.progress.progress();

    return WORLDS.map((world) => {
      const levels = levelsOfWorld(world.id).filter((level) => level.kind !== 'secret');

      return {
        world,
        isUnlocked: isWorldUnlocked(progress, world.id),
        stars: levels.reduce((total, level) => total + (progress.levels[level.id]?.stars ?? 0), 0),
        maxStars: levels.length * 3,
      };
    });
  });

  protected readonly nodes = computed<readonly LevelNode[]>(() => {
    const progress = this.progress.progress();
    const nextId = this.progress.nextLevel().id;

    return levelsOfWorld(this.selectedWorldId()).map((level) => ({
      level,
      isUnlocked: this.progress.isUnlocked(level),
      isCompleted: progress.levels[level.id]?.completed ?? false,
      stars: progress.levels[level.id]?.stars ?? 0,
      isNext: level.id === nextId,
    }));
  });

  protected selectWorld(card: WorldCard): void {
    if (card.isUnlocked) {
      void this.router.navigate([], { queryParams: { mundo: card.world.id }, replaceUrl: true });
    }
  }

  protected starsOf(count: number): readonly boolean[] {
    return [1, 2, 3].map((position) => position <= count);
  }
}
