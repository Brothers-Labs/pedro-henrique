import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';

import type { PetStageId } from '../../../../core/models/pet.model';
import { scaleTransformFor } from './artwork';

/** O que muda no robô a cada estágio. */
interface RobotLook {
  readonly scale: number;
  readonly bodyX: number;
  readonly bodyWidth: number;
  /** Como ele se apoia no chão — e, no fim, como deixa de precisar do chão. */
  readonly base: 'roda' | 'pernas' | 'flutua';
  readonly hasArms: boolean;
  readonly hasShoulders: boolean;
  readonly hasChestPanel: boolean;
  readonly hasAura: boolean;
}

/**
 * A evolução monta o robô peça por peça.
 *
 * O bebê é um tronco sobre uma roda. O jovem ganha braços e pernas, o adulto
 * ganha ombreiras e o painel no peito, e o lendário troca as pernas por dois
 * arcos de energia — ele passa a flutuar.
 */
const LOOKS: Readonly<Record<PetStageId, RobotLook>> = {
  bebe: {
    scale: 0.82,
    bodyX: 42,
    bodyWidth: 36,
    base: 'roda',
    hasArms: false,
    hasShoulders: false,
    hasChestPanel: false,
    hasAura: false,
  },
  jovem: {
    scale: 0.92,
    bodyX: 39,
    bodyWidth: 42,
    base: 'pernas',
    hasArms: true,
    hasShoulders: false,
    hasChestPanel: false,
    hasAura: false,
  },
  adulto: {
    scale: 1,
    bodyX: 38,
    bodyWidth: 44,
    base: 'pernas',
    hasArms: true,
    hasShoulders: true,
    hasChestPanel: true,
    hasAura: false,
  },
  lendario: {
    scale: 1.04,
    bodyX: 38,
    bodyWidth: 44,
    base: 'flutua',
    hasArms: true,
    hasShoulders: true,
    hasChestPanel: true,
    hasAura: true,
  },
};

@Component({
  selector: 'app-robot-artwork',
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './robot-artwork.html',
  styleUrl: './artwork.scss',
})
export class RobotArtwork {
  readonly stage = input.required<PetStageId>();

  protected readonly traits = computed(() => LOOKS[this.stage()]);
  protected readonly scaleTransform = computed(() => scaleTransformFor(this.traits().scale));
}
