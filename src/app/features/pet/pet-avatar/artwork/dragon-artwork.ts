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
  /** Crista das costas: cresce com ele e já existe no filhote. */
  readonly crest: string;
  readonly tail: string;
  readonly tailTip: string;
  readonly hasAura: boolean;
}

/**
 * A evolução não é o mesmo desenho ampliado.
 *
 * O filhote é quase só cabeça, com uma crista miúda e nenhuma asa. O jovem
 * ganha asas curtas e chifres, o adulto abre asas grandes e a cauda inteira, e
 * o lendário acrescenta a aura — a silhueta muda em cada degrau.
 */
const LOOKS: Readonly<Record<PetStageId, DragonLook>> = {
  bebe: {
    scale: 0.82,
    bodyY: 84,
    headRadius: 26,
    wings: 'nenhuma',
    horns: 'nenhum',
    crest: 'M49 23 l5 -9 l6 9 l5 -9 l5 9 z',
    tail: 'M80 88 q14 4 16 -5',
    tailTip: 'M93 78 l9 2 l-5 8 z',
    hasAura: false,
  },
  jovem: {
    scale: 0.92,
    bodyY: 82,
    headRadius: 24,
    wings: 'pequenas',
    horns: 'pequenos',
    crest: 'M47 25 l6 -12 l7 12 l6 -12 l6 12 z',
    tail: 'M82 88 q16 5 19 -3',
    tailTip: 'M97 79 l10 3 l-5 9 z',
    hasAura: false,
  },
  adulto: {
    scale: 1,
    bodyY: 82,
    headRadius: 23,
    wings: 'grandes',
    horns: 'grandes',
    crest: 'M45 26 l7 -14 l8 14 l7 -14 l7 14 z',
    tail: 'M84 88 q22 6 25 -4',
    tailTip: 'M104 78 l11 4 l-6 9 z',
    hasAura: false,
  },
  lendario: {
    scale: 1.05,
    bodyY: 82,
    headRadius: 23,
    wings: 'grandes',
    horns: 'grandes',
    crest: 'M45 26 l7 -14 l8 14 l7 -14 l7 14 z',
    tail: 'M84 88 q22 6 25 -4',
    tailTip: 'M104 78 l11 4 l-6 9 z',
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
