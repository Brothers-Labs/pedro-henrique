import type { SeededRandom } from '../../pedro-maker/levels/seeded-random';
import { pointAt, signedGap, type Circuit } from './circuit';
import { clamp, type DriveInput, type Kart } from './kart';

/** Quanto à frente o piloto mira, além do que a velocidade pede. */
const BASE_LOOKAHEAD = 6;
const LOOKAHEAD_PER_SPEED = 0.42;
const STEER_GAIN = 2.4;

/** Chance, por passo, de usar turbo ou estrela assim que tem um. */
const BOOST_ITEM_CHANCE = 0.02;
/** Distância, atrás do adversário, em que vale a pena largar a casca. */
const PEEL_TARGET_GAP = 14;

/**
 * O piloto automático dos adversários.
 *
 * Mira num ponto à frente na própria faixa da pista e vira o volante na
 * direção dele — é o suficiente para fazer curva bonito sem cortar caminho.
 */
export class RivalDriver {
  constructor(
    private readonly circuit: Circuit,
    private readonly lane: number,
    private readonly random: SeededRandom,
    private readonly canDropPeels = true,
  ) {}

  decide(kart: Kart, everyone: readonly Kart[]): DriveInput {
    return {
      steer: this.steerToward(kart, this.lane),
      brake: false,
      useItem: this.wantsToUseItem(kart, everyone),
    };
  }

  /** Volante, de -1 a 1, que leva o kart para a faixa pedida acompanhando a curva. */
  steerToward(kart: Kart, lane: number): number {
    const lookahead = BASE_LOOKAHEAD + Math.max(0, kart.speed) * LOOKAHEAD_PER_SPEED;
    const target = pointAt(this.circuit, kart.along + lookahead);
    const targetX = target.x - target.tangentZ * lane;
    const targetZ = target.z + target.tangentX * lane;
    const desiredHeading = Math.atan2(targetX - kart.x, targetZ - kart.z);
    const turn = wrapAngle(desiredHeading - kart.heading);

    // O volante para a direita diminui o ângulo; por isso o sinal invertido.
    return clamp(-turn * STEER_GAIN, -1, 1);
  }

  private wantsToUseItem(kart: Kart, everyone: readonly Kart[]): boolean {
    switch (kart.item) {
      case null:
        return false;
      case 'turbo':
      case 'estrela':
        return this.random.chance(BOOST_ITEM_CHANCE);
      case 'casca':
        // Sem permissão para cascas, o adversário guarda a que pegou: ela ocupa
        // o lugar de um turbo ou de uma estrela, e isso também o deixa mais lento.
        return this.canDropPeels && everyone.some((other) => {
          const gap = signedGap(this.circuit, other.along, kart.along);

          return other !== kart && gap > 0 && gap < PEEL_TARGET_GAP;
        });
    }
  }
}

export function wrapAngle(angle: number): number {
  return Math.atan2(Math.sin(angle), Math.cos(angle));
}
