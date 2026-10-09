import { ChangeDetectionStrategy, Component, computed, inject, input, output } from '@angular/core';
import { RouterLink } from '@angular/router';

import { petAccessory } from '../../../../core/data/pet.data';
import { PROFILE } from '../../../../core/data/profile.data';
import { MotionPreferenceService } from '../../../../core/services/motion-preference.service';
import { PetService } from '../../../../core/services/pet.service';
import { CelebrationEffects } from '../../../../shared/components/celebration-effects/celebration-effects';
import { fillLine } from '../../config/companion-lines.config';
import type { AdventureLevel, AdventureWorld, LevelCompletion, LevelRecord } from '../../models/adventure.model';
import { MapCompanion } from '../map-companion/map-companion';
import { StarRating } from '../star-rating/star-rating';

/** Quanto subiu de verdade durante a partida, medido nos próprios serviços. */
export interface RunGains {
  readonly points: number;
  readonly petXp: number;
}

/**
 * Tela de conclusão da fase.
 *
 * Mostra só o que aconteceu nesta partida: estrelas, acertos, o que subiu e
 * os prêmios que caíram agora. Quem rejoga vê o melhor resultado guardado —
 * as estrelas antigas nunca somem por causa de uma partida pior.
 */
@Component({
  selector: 'app-level-result',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [RouterLink, CelebrationEffects, MapCompanion, StarRating],
  templateUrl: './level-result.html',
  styleUrl: './level-result.scss',
})
export class LevelResult {
  readonly world = input.required<AdventureWorld>();
  readonly level = input.required<AdventureLevel>();
  readonly completion = input.required<LevelCompletion>();
  readonly record = input.required<LevelRecord | null>();
  readonly correct = input.required<number>();
  readonly total = input.required<number>();
  readonly gains = input.required<RunGains>();
  readonly nextLevel = input<AdventureLevel | null>(null);
  readonly companionLine = input.required<string>();

  readonly replayed = output<void>();
  readonly returnedToMap = output<void>();

  private readonly motion = inject(MotionPreferenceService);

  protected readonly childName = PROFILE.firstName;
  protected readonly pet = inject(PetService).pet;
  protected readonly isMotionAllowed = this.motion.isAllowed;

  protected readonly headline = computed(() => {
    const finishedWorld = this.completion().completedWorld;

    return finishedWorld ? finishedWorld.completionMessage : 'Fase concluída!';
  });

  protected readonly completionMessage = computed(() =>
    fillLine(this.level().completionMessage, { nome: this.pet()?.name ?? 'seu mascote', crianca: this.childName }),
  );

  protected readonly isNewRecord = computed(() => {
    const { isFirstCompletion, stars, previousBestStars } = this.completion();

    return !isFirstCompletion && stars > previousBestStars;
  });

  protected readonly accessory = computed(() => {
    const accessoryId = this.completion().completedWorld?.rewardAccessoryId;

    return accessoryId ? petAccessory(accessoryId) : null;
  });

  protected readonly curiosityText = computed(() => {
    const curiosity = this.completion().unlockedCuriosity;
    const name = this.pet()?.name ?? 'seu mascote';

    return curiosity ? { ...curiosity, title: fillLine(curiosity.title, { nome: name }), text: fillLine(curiosity.text, { nome: name }) } : null;
  });

  /** Prêmios que merecem linha própria: checkpoint, baú, medalha e mundo novo. */
  protected readonly hasSpecialRewards = computed(() => {
    const completion = this.completion();

    return (
      completion.reachedCheckpoint ||
      completion.openedChest !== null ||
      completion.completedWorld !== null ||
      completion.unlockedWorld !== null
    );
  });

  /** Rejogou sem estrela nova: nada a pagar, e a tela diz isso com carinho. */
  protected readonly isPlainReplay = computed(() => {
    const { isFirstCompletion, stars, previousBestStars } = this.completion();

    return !isFirstCompletion && stars <= previousBestStars;
  });
}
