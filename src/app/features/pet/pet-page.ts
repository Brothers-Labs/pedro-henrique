import {
  ChangeDetectionStrategy,
  Component,
  computed,
  DestroyRef,
  inject,
  signal,
} from '@angular/core';

import { PET_CONFIG } from '../../core/data/pet.data';
import { PROFILE } from '../../core/data/profile.data';
import type { PetAccessoryId, PetInteractionId } from '../../core/models/pet.model';
import { sanitizePetName } from '../../core/pet/pet-progress';
import { PetService } from '../../core/services/pet.service';
import { SoundService } from '../../core/services/sound.service';
import { PageIntro } from '../../shared/components/page-intro/page-intro';
import type { PetMood } from './pet-avatar/pet-avatar';
import { PetAccessories } from './pet-accessories/pet-accessories';
import { PetAchievements } from './pet-achievements/pet-achievements';
import { PetActions } from './pet-actions/pet-actions';
import { PetAvatar } from './pet-avatar/pet-avatar';
import { PetCelebrations } from './pet-celebrations/pet-celebrations';
import { PetCollection } from './pet-collection/pet-collection';
import { PetNextEvolution } from './pet-next-evolution/pet-next-evolution';
import type { PetAdoption } from './pet-onboarding/pet-onboarding';
import { PetOnboarding } from './pet-onboarding/pet-onboarding';
import { PetStatus } from './pet-status/pet-status';
import { PetTimeline } from './pet-timeline/pet-timeline';
import { PetXpBar } from './pet-xp-bar/pet-xp-bar';

/** Quanto tempo o mascote continua comemorando depois de uma brincadeira. */
const REACTION_IN_MS = 1600;

/**
 * A casa do mascote.
 *
 * Tem dois estados bem diferentes: sem companheiro, é a escolha do primeiro
 * amigo; com companheiro, é a casa dele. A página coordena — quem guarda o
 * estado é o serviço e quem sabe as regras é `core/pet/pet-progress`.
 *
 * A ordem dos blocos é a do celular: o mascote grande primeiro, porque é ele
 * que a criança vem ver, e o resto embaixo, em blocos que ela pode ignorar.
 */
@Component({
  selector: 'app-pet-page',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    PageIntro,
    PetOnboarding,
    PetAvatar,
    PetXpBar,
    PetStatus,
    PetActions,
    PetNextEvolution,
    PetAccessories,
    PetAchievements,
    PetCollection,
    PetTimeline,
    PetCelebrations,
  ],
  templateUrl: './pet-page.html',
  styleUrl: './pet-page.scss',
})
export class PetPage {
  private readonly petService = inject(PetService);
  protected readonly sound = inject(SoundService);

  private reactionTimeout: ReturnType<typeof setTimeout> | null = null;

  protected readonly childName = PROFILE.firstName;
  protected readonly maxNameLength = PET_CONFIG.maxNameLength;

  /**
   * Mascote, ficha do tipo e estágio resolvidos de uma vez.
   *
   * Vêm juntos porque, para a tela, ou existe companheiro — e aí existem os
   * três — ou é a hora de escolher o primeiro. Um único `@if` no template
   * separa os dois mundos, sem asserção de tipo em lugar nenhum.
   */
  protected readonly companion = computed(() => {
    const pet = this.petService.pet();
    const type = this.petService.type();
    const stage = this.petService.stage();

    return pet && type && stage ? { pet, type, stage } : null;
  });

  protected readonly achievements = computed(() => this.petService.achievements());
  protected readonly timeline = computed(() => this.petService.timeline());

  protected readonly mood = signal<PetMood>('parado');

  protected readonly isRenaming = signal(false);
  protected readonly draftName = signal('');
  protected readonly canRename = computed(() => sanitizePetName(this.draftName()).length > 0);

  constructor() {
    inject(DestroyRef).onDestroy(() => this.clearReaction());
  }

  protected adopt(adoption: PetAdoption): void {
    this.petService.choose(adoption.type, adoption.name);
    this.sound.play('conquista');
    this.celebrate('comemorando');
  }

  protected play(id: PetInteractionId): void {
    this.petService.interact(id);
    this.sound.play('carinho');
    this.celebrate('feliz');
  }

  protected equip(id: PetAccessoryId | null): void {
    this.petService.equip(id);

    if (id) {
      this.sound.play('item');
      this.celebrate('feliz');
    }
  }

  protected startRenaming(): void {
    this.draftName.set(this.companion()?.pet.name ?? '');
    this.isRenaming.set(true);
  }

  protected cancelRenaming(): void {
    this.isRenaming.set(false);
  }

  protected confirmRenaming(): void {
    if (!this.canRename()) {
      return;
    }

    this.petService.rename(this.draftName());
    this.isRenaming.set(false);
  }

  /** Deixa o mascote animado por um instante e devolve ele ao repouso. */
  private celebrate(mood: PetMood): void {
    this.mood.set(mood);
    this.clearReaction();
    this.reactionTimeout = setTimeout(() => this.mood.set('parado'), REACTION_IN_MS);
  }

  private clearReaction(): void {
    if (this.reactionTimeout !== null) {
      clearTimeout(this.reactionTimeout);
      this.reactionTimeout = null;
    }
  }
}
