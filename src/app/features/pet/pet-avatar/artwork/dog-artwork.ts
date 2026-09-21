import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';

import type { PetStageId } from '../../../../core/models/pet.model';
import { scaleTransformFor } from './artwork';

/** O que muda no cachorro a cada estágio. */
interface DogLook {
  readonly scale: number;
  readonly headRadius: number;
  /** Orelha caída é filhote; orelha em pé é cachorro crescido. */
  readonly ears: 'caidas' | 'empe';
  readonly tail: string;
  readonly hasCollar: boolean;
  readonly hasAura: boolean;
}

/**
 * A evolução levanta o cachorro.
 *
 * O filhote tem orelhas caídas, cabeça grande e rabinho baixo. O jovem levanta
 * as orelhas e o rabo; o adulto ganha a coleira com plaquinha; o lendário
 * troca a plaquinha por uma estrela e ganha a aura.
 */
const LOOKS: Readonly<Record<PetStageId, DogLook>> = {
  bebe: {
    scale: 0.82,
    headRadius: 26,
    ears: 'caidas',
    tail: 'M86 88 q12 4 14 -4',
    hasCollar: false,
    hasAura: false,
  },
  jovem: {
    scale: 0.92,
    headRadius: 24,
    ears: 'empe',
    tail: 'M86 82 q14 -2 12 -16',
    hasCollar: false,
    hasAura: false,
  },
  adulto: {
    scale: 1,
    headRadius: 23,
    ears: 'empe',
    tail: 'M86 80 q18 -4 14 -22',
    hasCollar: true,
    hasAura: false,
  },
  lendario: {
    scale: 1.04,
    headRadius: 23,
    ears: 'empe',
    tail: 'M86 80 q18 -4 14 -22',
    hasCollar: true,
    hasAura: true,
  },
};

@Component({
  selector: 'app-dog-artwork',
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './dog-artwork.html',
  styleUrl: './artwork.scss',
})
export class DogArtwork {
  readonly stage = input.required<PetStageId>();

  protected readonly traits = computed(() => LOOKS[this.stage()]);
  protected readonly scaleTransform = computed(() => scaleTransformFor(this.traits().scale));
}
