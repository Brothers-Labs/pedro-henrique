import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';

import type { PetStageId } from '../../../../core/models/pet.model';
import { scaleTransformFor } from './artwork';

/** O que muda no dragão a cada estágio. */
interface DragonLook {
  readonly scale: number;
  readonly bodyY: number;
  readonly headRadius: number;
  readonly wings: 'nenhuma' | 'pequenas' | 'grandes';
  readonly horns: 'nenhum' | 'pequenos' | 'grandes';
  readonly hasSpikes: boolean;
  readonly hasAura: boolean;
}

/**
 * A evolução não é o mesmo desenho ampliado.
 *
 * O filhote é quase só cabeça, sem asa nem chifre. O jovem ganha asas curtas e
 * chifres pequenos, o adulto abre asas grandes com espinhos na cauda e o
 * lendário acrescenta a aura — a silhueta muda em cada degrau.
 */
const LOOKS: Readonly<Record<PetStageId, DragonLook>> = {
  bebe: {
    scale: 0.82,
    bodyY: 84,
    headRadius: 26,
    wings: 'nenhuma',
    horns: 'nenhum',
    hasSpikes: false,
    hasAura: false,
  },
  jovem: {
    scale: 0.92,
    bodyY: 82,
    headRadius: 24,
    wings: 'pequenas',
    horns: 'pequenos',
    hasSpikes: false,
    hasAura: false,
  },
  adulto: {
    scale: 1,
    bodyY: 80,
    headRadius: 23,
    wings: 'grandes',
    horns: 'grandes',
    hasSpikes: true,
    hasAura: false,
  },
  lendario: {
    scale: 1.05,
    bodyY: 80,
    headRadius: 23,
    wings: 'grandes',
    horns: 'grandes',
    hasSpikes: true,
    hasAura: true,
  },
};

@Component({
  selector: 'app-dragon-artwork',
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './dragon-artwork.html',
  styleUrl: './artwork.scss',
})
export class DragonArtwork {
  readonly stage = input.required<PetStageId>();

  protected readonly traits = computed(() => LOOKS[this.stage()]);
  protected readonly scaleTransform = computed(() => scaleTransformFor(this.traits().scale));
}
