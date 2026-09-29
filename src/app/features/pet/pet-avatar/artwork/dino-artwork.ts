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
  readonly hasTeeth: boolean;
  /** As placas do lendário brilham; as dos outros seguem o tom claro do corpo. */
  readonly plateClass: string;
  readonly hasAura: boolean;
}

/**
 * A evolução vai enchendo o dinossauro.
 *
 * O filhote é redondo, de cabeçorra, rabinho curto e nenhum dente à mostra. O
 * jovem estica a cauda e ganha bracinhos; o adulto ganha as placas das costas
 * e os dentinhos; o lendário acende as placas e a aura.
 */
const LOOKS: Readonly<Record<PetStageId, DinoLook>> = {
  bebe: {
    scale: 0.82,
    bodyRx: 24,
    headRx: 25,
    headRy: 22,
    tail: 'M82 88 q14 3 16 -5',
    hasArms: false,
    hasPlates: false,
    hasTeeth: false,
    plateClass: 'art__soft',
    hasAura: false,
  },
  jovem: {
    scale: 0.92,
    bodyRx: 25,
    headRx: 24,
    headRy: 21,
    tail: 'M84 86 q18 2 18 -12',
    hasArms: true,
    hasPlates: false,
    hasTeeth: true,
    plateClass: 'art__soft',
    hasAura: false,
  },
  adulto: {
    scale: 1,
    bodyRx: 26,
    headRx: 23,
    headRy: 20,
    tail: 'M86 84 q22 0 24 -18',
    hasArms: true,
    hasPlates: true,
    hasTeeth: true,
    plateClass: 'art__soft',
    hasAura: false,
  },
  lendario: {
    scale: 1.04,
    bodyRx: 26,
    headRx: 23,
    headRy: 20,
    tail: 'M86 84 q22 0 24 -18',
    hasArms: true,
    hasPlates: true,
    hasTeeth: true,
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
