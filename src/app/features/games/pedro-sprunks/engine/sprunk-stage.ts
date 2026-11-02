/** Quantos bonecos cabem no palco ao mesmo tempo. */
export const STAGE_SIZE = 7;

/** Cada lugar do palco guarda o id do boneco ou `null` quando está vazio. */
export type StageSlots = readonly (string | null)[];

export type StageToggleResult = 'added' | 'removed' | 'full';

export interface StageToggle {
  readonly stage: StageSlots;
  readonly result: StageToggleResult;
}

export function emptyStage(): StageSlots {
  return Array.from({ length: STAGE_SIZE }, () => null);
}

/**
 * Tocar num boneco da paleta liga ou desliga esse boneco.
 *
 * Quem já está no palco sai e deixa o lugar vazio, sem empurrar os outros —
 * a banda não muda de posição só porque alguém saiu. Quem chega ocupa o
 * primeiro lugar livre.
 */
export function toggleOnStage(stage: StageSlots, characterId: string): StageToggle {
  if (stage.includes(characterId)) {
    return { stage: removeFromStage(stage, characterId), result: 'removed' };
  }

  const freeIndex = stage.indexOf(null);

  if (freeIndex === -1) {
    return { stage, result: 'full' };
  }

  return {
    stage: stage.map((slot, index) => (index === freeIndex ? characterId : slot)),
    result: 'added',
  };
}

export function removeFromStage(stage: StageSlots, characterId: string): StageSlots {
  return stage.map((slot) => (slot === characterId ? null : slot));
}

export function isStageFull(stage: StageSlots): boolean {
  return stage.every((slot) => slot !== null);
}

export function isStageEmpty(stage: StageSlots): boolean {
  return stage.every((slot) => slot === null);
}
