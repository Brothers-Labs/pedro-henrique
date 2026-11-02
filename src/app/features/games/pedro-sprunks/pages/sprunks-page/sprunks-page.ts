import { ChangeDetectionStrategy, Component, computed, DestroyRef, effect, inject, signal, untracked } from '@angular/core';
import { RouterLink } from '@angular/router';

import { GameProgressService } from '../../../../../core/services/game-progress.service';
import { shuffle } from '../../../../../core/utils/shuffle';
import { SprunkCreator } from '../../components/sprunk-creator/sprunk-creator';
import { SprunkFigure } from '../../components/sprunk-figure/sprunk-figure';
import { SPRUNK_ROSTER } from '../../data/sprunk-roster.data';
import { SPRUNK_CATEGORY_LABELS, sprunkSound } from '../../data/sprunk-sounds.data';
import {
  emptyStage,
  isStageEmpty,
  isStageFull,
  removeFromStage,
  STAGE_SIZE,
  type StageSlots,
  toggleOnStage,
} from '../../engine/sprunk-stage';
import type { SprunkCategory, SprunkCharacter } from '../../models/sprunk.model';
import { MySprunksService } from '../../services/my-sprunks.service';
import { SPRUNK_BEAT_SECONDS, SprunkAudioService } from '../../services/sprunk-audio.service';

/** Quanto dura a ação especial de um boneco, igual à animação no CSS. */
const ACTION_DURATION_MS = 700;

/** Silhueta cinza dos lugares vazios: mostra onde o próximo boneco vai entrar. */
const EMPTY_SLOT: SprunkCharacter = {
  id: 'vazio',
  name: 'Lugar vazio',
  color: '#c3c7cf',
  shape: 'classic',
  accessory: 'none',
  eyes: 'sleepy',
  action: 'jump',
  soundId: 'bumbo',
  isCustom: false,
};

interface StageEntry {
  readonly index: number;
  readonly character: SprunkCharacter | null;
}

/**
 * O Pedro Sprunks: monte a banda tocando nos bonecos.
 *
 * Tocar num boneco da paleta põe ele no palco, e ele começa a cantar no tempo
 * dos outros; tocar de novo tira. No palco, tocar no boneco faz a ação
 * especial dele. Cada banda completa e diferente conta como um desafio da
 * jornada de jogos.
 */
@Component({
  selector: 'app-sprunks-page',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [RouterLink, SprunkFigure, SprunkCreator],
  providers: [SprunkAudioService],
  templateUrl: './sprunks-page.html',
  styleUrl: './sprunks-page.scss',
})
export class SprunksPage {
  private readonly audio = inject(SprunkAudioService);
  private readonly progress = inject(GameProgressService);
  private readonly mySprunks = inject(MySprunksService);
  /** Bandas completas já premiadas nesta visita, para tirar e pôr o mesmo boneco não render pontos. */
  private readonly rewardedBands = new Set<string>();
  private actingTimeout: ReturnType<typeof setTimeout> | null = null;

  protected readonly emptySlot = EMPTY_SLOT;
  protected readonly categoryLabels = SPRUNK_CATEGORY_LABELS;
  protected readonly beatDuration = `${SPRUNK_BEAT_SECONDS}s`;
  protected readonly volume = this.audio.volume;
  protected readonly isAudible = this.audio.isAudible;

  protected readonly stage = signal<StageSlots>(emptyStage());
  protected readonly isPaused = signal(false);
  protected readonly actingSlot = signal<number | null>(null);
  protected readonly message = signal('Toque num boneco para ele entrar na banda!');
  protected readonly isCreatorOpen = signal(false);

  protected readonly palette = computed<readonly SprunkCharacter[]>(() => [
    ...SPRUNK_ROSTER,
    ...this.mySprunks.characters(),
  ]);

  private readonly charactersById = computed(
    () => new Map(this.palette().map((character) => [character.id, character])),
  );

  protected readonly stageEntries = computed<readonly StageEntry[]>(() => {
    const byId = this.charactersById();

    return this.stage().map((id, index) => ({ index, character: id === null ? null : (byId.get(id) ?? null) }));
  });

  protected readonly onStageIds = computed(() => new Set(this.stage().filter((id) => id !== null)));
  protected readonly isEmpty = computed(() => isStageEmpty(this.stage()));
  protected readonly isSinging = computed(() => this.isAudible() && !this.isPaused() && !this.isEmpty());

  constructor() {
    // A música é derivada do palco: quem está lá canta, a pausa cala todos.
    effect(() => {
      const sounds = this.isPaused()
        ? []
        : this.stageEntries().flatMap((entry) => (entry.character ? [sprunkSound(entry.character.soundId)] : []));

      untracked(() => this.audio.setBand(sounds));
    });

    // Um boneco apagado em "Meus personagens" também sai do palco.
    effect(() => {
      const byId = this.charactersById();
      const stage = untracked(() => this.stage());
      const cleaned = stage.map((id) => (id !== null && byId.has(id) ? id : null));

      if (cleaned.some((id, index) => id !== stage[index])) {
        this.stage.set(cleaned);
      }
    });

    inject(DestroyRef).onDestroy(() => this.clearActingTimeout());
  }

  protected toggle(character: SprunkCharacter): void {
    const { stage, result } = toggleOnStage(this.stage(), character.id);

    if (result === 'full') {
      this.message.set(`O palco está cheio! Tire um boneco para o ${character.name} entrar.`);
      return;
    }

    this.stage.set(stage);

    if (result === 'removed') {
      this.message.set(`${character.name} saiu da banda.`);
      return;
    }

    this.message.set(`${character.name} entrou na banda!`);
    this.rewardIfComplete(stage);
  }

  protected remove(character: SprunkCharacter): void {
    this.stage.update((stage) => removeFromStage(stage, character.id));
    this.message.set(`${character.name} saiu da banda.`);
  }

  /** A ação especial: anima o boneco e toca o efeito dela por cima da música. */
  protected act(index: number, character: SprunkCharacter): void {
    this.audio.playAction(character.action);
    this.clearActingTimeout();
    this.actingSlot.set(index);
    this.actingTimeout = setTimeout(() => this.actingSlot.set(null), ACTION_DURATION_MS);
  }

  protected categoryOf(character: SprunkCharacter): SprunkCategory {
    return sprunkSound(character.soundId).category;
  }

  protected togglePause(): void {
    this.isPaused.update((isPaused) => !isPaused);
  }

  protected clearStage(): void {
    this.stage.set(emptyStage());
    this.message.set('Palco limpo. Monte uma banda nova!');
  }

  /** Sorteia uma banda inteira, para quem quer só ouvir uma mistura nova. */
  protected randomBand(): void {
    const stage = shuffle(this.palette()).slice(0, STAGE_SIZE).map((character) => character.id);

    this.stage.set(stage);
    this.isPaused.set(false);
    this.message.set('Banda surpresa no palco!');
    this.rewardIfComplete(stage);
  }

  protected changeVolume(event: Event): void {
    this.audio.setVolume(Number((event.target as HTMLInputElement).value) / 100);
  }

  protected toggleCreator(): void {
    this.isCreatorOpen.update((isOpen) => !isOpen);
  }

  /** O boneco recém-criado já entra no palco, para o Pedro ouvir a criação na banda. */
  protected onCreated(character: SprunkCharacter): void {
    this.toggle(character);
  }

  private rewardIfComplete(stage: StageSlots): void {
    if (!isStageFull(stage)) {
      return;
    }

    const bandKey = [...stage].sort().join('|');

    if (this.rewardedBands.has(bandKey)) {
      this.message.set('Banda completa! Que som!');
      return;
    }

    this.rewardedBands.add(bandKey);
    const outcome = this.progress.registerChallenge('pedro-sprunks', true);
    this.message.set(`Banda completa! Você ganhou ${outcome.earnedPoints} pontos!`);
  }

  private clearActingTimeout(): void {
    if (this.actingTimeout !== null) {
      clearTimeout(this.actingTimeout);
      this.actingTimeout = null;
    }
  }
}
