import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';

import type { PetStageId } from '../../../../core/models/pet.model';
import { scaleTransformFor } from './artwork';

/** O que muda no dinossauro a cada estágio. */
interface DinoLook {
  readonly scale: number;
  readonly bodyRx: number;
  readonly headRx: number;
  readonly headRy: number;
  /** A cauda cresce e se levanta conforme ele ganha porte. */
  readonly tail: string;
  readonly hasArms: boolean;
  readonly hasPlates: boolean;
  /** As placas do lendário brilham; as dos outros seguem a cor do corpo. */
  readonly plateClass: string;
  readonly hasAura: boolean;
}

/**
 * A evolução alonga o dinossauro.
 *
 * O filhote é redondo, de cabeçorra e rabo curtinho. O jovem estica a cauda e
 * ganha bracinhos; o adulto ganha as placas nas costas; o lendário acende as
 * placas e a aura.
 */
const LOOKS: Readonly<Record<PetStageId, DinoLook>> = {
  bebe: {
    scale: 0.82,
    bodyRx: 24,
    headRx: 19,
    headRy: 16,
    tail: 'M82 86 q14 2 16 -6',
    hasArms: false,
    hasPlates: false,
    plateClass: 'art__shape',
    hasAura: false,
  },
  jovem: {
    scale: 0.92,
    bodyRx: 25,
    headRx: 18,
    headRy: 15,
    tail: 'M82 84 q18 2 22 -12',
    hasArms: true,
    hasPlates: false,
    plateClass: 'art__shape',
    hasAura: false,
  },
  adulto: {
    scale: 1,
    bodyRx: 27,
    headRx: 18,
    headRy: 15,
    tail: 'M84 82 q22 0 26 -20',
    hasArms: true,
    hasPlates: true,
    plateClass: 'art__soft',
    hasAura: false,
  },
  lendario: {
    scale: 1.04,
    bodyRx: 27,
    headRx: 18,
    headRy: 15,
    tail: 'M84 82 q22 0 26 -20',
    hasArms: true,
    hasPlates: true,
    plateClass: 'art__sparkle',
    hasAura: true,
  },
};

@Component({
  selector: 'app-dino-artwork',
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './dino-artwork.html',
  styleUrl: './artwork.scss',
})
export class DinoArtwork {
  readonly stage = input.required<PetStageId>();

  protected readonly traits = computed(() => LOOKS[this.stage()]);
  protected readonly scaleTransform = computed(() => scaleTransformFor(this.traits().scale));
}
