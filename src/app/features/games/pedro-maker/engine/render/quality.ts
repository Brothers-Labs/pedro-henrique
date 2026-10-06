export type QualityTier = 'alta' | 'media' | 'baixa';

export interface QualitySettings {
  /** Teto da densidade de pixels: tela de celular com 3x não precisa de 3x no jogo. */
  readonly pixelRatio: number;
  readonly shadows: boolean;
  readonly shadowMapSize: number;
  /** O terreno também projeta sombra nele mesmo (quinas, túneis). */
  readonly terrainShadows: boolean;
  readonly maxParticles: number;
}

export const QUALITY: Readonly<Record<QualityTier, QualitySettings>> = {
  alta: { pixelRatio: 2, shadows: true, shadowMapSize: 2048, terrainShadows: true, maxParticles: 420 },
  media: { pixelRatio: 1.5, shadows: true, shadowMapSize: 1024, terrainShadows: false, maxParticles: 260 },
  baixa: { pixelRatio: 1, shadows: false, shadowMapSize: 512, terrainShadows: false, maxParticles: 140 },
};

const DOWNGRADE: Readonly<Record<QualityTier, QualityTier | null>> = {
  alta: 'media',
  media: 'baixa',
  baixa: null,
};

/**
 * Qualidade inicial pelo aparelho.
 *
 * Toque como ponteiro principal quase sempre é celular ou tablet: começa na
 * média. Aparelho com poucos núcleos começa na baixa. O monitor de quadros
 * ajusta depois, com o jogo rodando.
 */
export function initialQualityTier(): QualityTier {
  const cores = typeof navigator === 'undefined' ? 8 : (navigator.hardwareConcurrency ?? 8);
  const isTouchFirst = typeof matchMedia === 'function' && matchMedia('(pointer: coarse)').matches;

  if (cores <= 4) {
    return 'baixa';
  }

  return isTouchFirst ? 'media' : 'alta';
}

/** Janela de quadros observada antes de decidir baixar a qualidade. */
const SAMPLE_FRAMES = 120;

/** Média acima disso (menos de ~40 quadros por segundo) pede qualidade menor. */
const SLOW_FRAME_MS = 25;

/**
 * Observa o tempo dos quadros e pede qualidade menor quando o jogo engasga.
 *
 * Só desce, nunca sobe: subir e descer em sequência faria a imagem piscar
 * entre dois jeitos, o que incomoda mais que uma sombra a menos.
 */
export class FrameBudgetMonitor {
  private frames = 0;
  private totalMs = 0;

  constructor(private tier: QualityTier) {}

  /** Devolve a nova qualidade quando é hora de baixar; `null` se está tudo bem. */
  sample(frameMs: number): QualityTier | null {
    this.frames += 1;
    this.totalMs += frameMs;

    if (this.frames < SAMPLE_FRAMES) {
      return null;
    }

    const average = this.totalMs / this.frames;
    this.frames = 0;
    this.totalMs = 0;

    const lower = DOWNGRADE[this.tier];

    if (average <= SLOW_FRAME_MS || !lower) {
      return null;
    }

    this.tier = lower;

    return lower;
  }

  /** Recomeça a contagem: depois de uma pausa, o primeiro quadro é sempre lento. */
  reset(): void {
    this.frames = 0;
    this.totalMs = 0;
  }
}
