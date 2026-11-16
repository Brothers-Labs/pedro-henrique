import type { ChoiceChip } from '../components/choice-chips/choice-chips';
import { COLOR_CHOICES, EMOJI_CHOICES, FRAME_OPTIONS, MOTION_OPTIONS, OVERLAY_OPTIONS, STICKER_OPTIONS } from './tube-effects.data';

/** As listas do PedroTube já no formato dos botões de escolha do estúdio. */
export const EMOJI_CHIPS: readonly ChoiceChip[] = EMOJI_CHOICES.map((emoji) => ({ value: emoji, label: emoji, emoji }));

export const COLOR_CHIPS: readonly ChoiceChip[] = COLOR_CHOICES.map((color) => ({ ...color, color: color.value }));

export const OVERLAY_CHIPS: readonly ChoiceChip[] = OVERLAY_OPTIONS;

export const FRAME_CHIPS: readonly ChoiceChip[] = FRAME_OPTIONS;

export const MOTION_CHIPS: readonly ChoiceChip[] = MOTION_OPTIONS;

export const STICKER_CHIPS: readonly ChoiceChip[] = STICKER_OPTIONS.map((sticker) =>
  sticker ? { value: sticker, label: sticker, emoji: sticker } : { value: '', label: 'Sem figurinha', emoji: '🚫' },
);
