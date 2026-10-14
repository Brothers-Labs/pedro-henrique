import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { RouterLink } from '@angular/router';

import { formatRaceTime } from '../../../pedro-kart/race-format';
import { CourseThumbnail } from '../../components/course-thumbnail/course-thumbnail';
import { FlashDifficultyPicker } from '../../components/flash-difficulty-picker/flash-difficulty-picker';
import { FlashPageFrame } from '../../components/flash-page-frame/flash-page-frame';
import { bossProfile, type BossProfile } from '../../config/boss.config';
import { ARENAS, type ArenaDefinition } from '../../course/default-courses';
import { FlashProgressService } from '../../services/flash-progress.service';

interface ArenaView {
  readonly arena: ArenaDefinition;
  readonly boss: BossProfile;
}

const STAR_SLOTS = [1, 2, 3] as const;

/**
 * As arenas dos chefões do Doutor Apagão.
 *
 * Em ordem: cada chefão ensina um jeito de desviar, e o último cobra os
 * dois. Todas ficam abertas desde o começo — ninguém fica de fora de uma
 * batalha por não ter vencido a anterior.
 */
@Component({
  selector: 'app-flash-battle-page',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [RouterLink, FlashPageFrame, FlashDifficultyPicker, CourseThumbnail],
  templateUrl: './flash-battle-page.html',
  styleUrl: '../flash-courses/flash-courses-page.scss',
})
export class FlashBattlePage {
  private readonly progressService = inject(FlashProgressService);

  protected readonly starSlots = STAR_SLOTS;
  protected readonly arenas: readonly ArenaView[] = ARENAS.map((arena) => ({ arena, boss: bossProfile(arena.boss) }));

  protected starsOf(arena: ArenaDefinition): number {
    return this.progressService.recordOf('batalha', arena.id)?.bestStars ?? 0;
  }

  protected recordLabel(arena: ArenaDefinition): string | null {
    const record = this.progressService.recordOf('batalha', arena.id);

    return record ? `Vencido em ${formatRaceTime(record.bestTimeMs)}` : null;
  }
}
