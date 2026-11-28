import { melody, rhythm } from '../engine/sprunk-pattern';
import type { SprunkCategory, SprunkSound } from '../models/sprunk.model';

/**
 * Os sons da banda, todos compostos para o Pedro Sprunks.
 *
 * Cada som ocupa um compasso de dezesseis passos e as notas saem só da escala
 * pentatônica de dó (dó, ré, mi, sol, lá): qualquer mistura de bonecos soa
 * bem, então não existe combinação "errada" no palco.
 */
export const SPRUNK_SOUNDS: readonly SprunkSound[] = [
  { id: 'bumbo', label: 'Bumbo', category: 'batida', voice: 'kick', steps: rhythm('x...x...x..x.x..') },
  { id: 'caixa', label: 'Caixa', category: 'batida', voice: 'snare', steps: rhythm('....x.......x..x') },
  { id: 'chimbal', label: 'Chimbal', category: 'batida', voice: 'hat', steps: rhythm('x.x.x.x.x.x.x.xx') },
  { id: 'palmas', label: 'Palmas', category: 'batida', voice: 'clap', steps: rhythm('....x..x....x...') },
  { id: 'tambor', label: 'Tambor', category: 'batida', voice: 'tom', steps: rhythm('..x...x.x.x....x') },
  { id: 'chocalho', label: 'Chocalho', category: 'batida', voice: 'shaker', steps: rhythm('.xx.xx.x.xx.xx.x') },
  { id: 'bumbo-duplo', label: 'Bumbo duplo', category: 'batida', voice: 'kick', steps: rhythm('x.x.....x.x..x..') },
  { id: 'caixa-rapida', label: 'Caixa rápida', category: 'batida', voice: 'snare', steps: rhythm('..x...x...x.x.x.') },
  { id: 'prato', label: 'Prato batendo', category: 'batida', voice: 'cymbal', steps: rhythm('x.......x.......') },
  { id: 'batucada', label: 'Batucada', category: 'batida', voice: 'tom', steps: rhythm('x..x.xx...x..x.x') },
  { id: 'palminhas', label: 'Palminhas', category: 'batida', voice: 'clap', steps: rhythm('..x...x...x...xx') },
  { id: 'chiado', label: 'Chiado', category: 'batida', voice: 'shaker', steps: rhythm('xxxx....xxxx....') },
  { id: 'toc-toc', label: 'Toc-toc', category: 'batida', voice: 'tom', steps: rhythm('....x.x.....x.x.') },
  { id: 'corrente', label: 'Corrente', category: 'efeito', voice: 'chain', steps: rhythm('x..x......x.x...') },
  { id: 'bip', label: 'Bip de robô', category: 'efeito', voice: 'blip', steps: melody('12 . 19 . . 12 . . 24 . 19 . . . 12 .') },
  { id: 'boing', label: 'Boing', category: 'efeito', voice: 'boing', steps: rhythm('......x.......x.') },
  { id: 'assobio', label: 'Assobio', category: 'efeito', voice: 'whistle', steps: melody('. . . . 24 . . . . . 21 . 19 . . .') },
  { id: 'lata', label: 'Lata', category: 'efeito', voice: 'chain', steps: rhythm('....x.....x..x..') },
  { id: 'robo', label: 'Voz de robô', category: 'efeito', voice: 'blip', steps: melody('0 0 . . 7 . 7 . . . 12 . . . . .') },
  { id: 'sinal', label: 'Sinal', category: 'efeito', voice: 'blip', steps: melody('24 . . . . . . . 24 . 24 . . . . .') },
  { id: 'fiu-fiu', label: 'Fiu-fiu', category: 'efeito', voice: 'whistle', steps: melody('19 . 24 . . . . . 19 . 24 . . . . .') },
  { id: 'sirene', label: 'Sirene', category: 'efeito', voice: 'whistle', steps: melody('24 . . . 19 . . . 24 . . . 19 . . .') },
  { id: 'pim', label: 'Pim!', category: 'efeito', voice: 'bell', steps: melody('. . . . . . . . . . . . 28 . 28 .') },
  { id: 'baixo', label: 'Baixo', category: 'melodia', voice: 'bass', steps: melody('-24 . . -24 . . -17 . -15 . . -15 . -17 . .') },
  { id: 'baixo-grave', label: 'Baixo grave', category: 'melodia', voice: 'bass', steps: melody('-36 . . . . . . . -29 . . . -32 . . .') },
  { id: 'dedilhado', label: 'Dedilhado', category: 'melodia', voice: 'pluck', steps: melody('0 . 4 . 7 . 12 . 9 . 7 . 4 . 2 .') },
  { id: 'teclado', label: 'Teclado', category: 'melodia', voice: 'lead', steps: melody('12 . . 14 . . 16 . 19 . 16 . 14 . 12 .') },
  { id: 'sino', label: 'Sino', category: 'melodia', voice: 'bell', steps: melody('24 . . . . . 19 . . . 21 . . . . .') },
  { id: 'nuvem', label: 'Nuvem', category: 'melodia', voice: 'pad', steps: melody('0 . . . . . . . -3 . . . . . . .') },
  { id: 'flauta', label: 'Flauta', category: 'melodia', voice: 'flute', steps: melody('. . 16 . 19 . 21 . . . 19 . 16 . 14 .') },
  { id: 'raio-de-sol', label: 'Raio de sol', category: 'melodia', voice: 'lead', steps: melody('24 . 21 . 19 . 16 . 19 . 21 . 24 . . .') },
  { id: 'baixo-pulante', label: 'Baixo pulante', category: 'melodia', voice: 'bass', steps: melody('-24 . -12 . -24 . -12 . -20 . -8 . -17 . -5 .') },
  { id: 'madeira', label: 'Madeira', category: 'melodia', voice: 'pluck', steps: melody('-12 . . -5 . . -3 . -12 . . -5 . . 0 .') },
  { id: 'sininho', label: 'Sininho', category: 'melodia', voice: 'bell', steps: melody('. . 31 . . . 28 . . . 26 . . . . .') },
  { id: 'neblina', label: 'Neblina', category: 'melodia', voice: 'pad', steps: melody('-5 . . . . . . . -8 . . . . . . .') },
  { id: 'gelinho', label: 'Gelinho', category: 'melodia', voice: 'pluck', steps: melody('36 . 31 . 28 . 31 . 36 . . . 33 . . .') },
  { id: 'flautinha', label: 'Flautinha', category: 'melodia', voice: 'flute', steps: melody('12 . 14 . 16 . . . 21 . 19 . . . . .') },
  { id: 'picole', label: 'Picolé', category: 'melodia', voice: 'flute', steps: melody('. . . . 24 . 21 . 19 . . . 16 . . .') },
  { id: 'pulinho', label: 'Pulinho', category: 'melodia', voice: 'lead', steps: melody('7 . 12 . 16 . 19 . 24 . . . 19 . . .') },
  { id: 'coro', label: 'Coro "aaah"', category: 'voz', voice: 'choir-ah', steps: melody('0 . . . 4 . . . 7 . . . 4 . . .') },
  { id: 'uuh', label: 'Coro "uuuh"', category: 'voz', voice: 'choir-oo', steps: melody('-5 . . . . . . . -3 . . . -8 . . .') },
  { id: 'la-la', label: 'Lá-lá-lá', category: 'voz', voice: 'choir-ah', steps: melody('12 . 12 . 16 . . . 14 . 12 . 9 . . .') },
  { id: 'bate-papo', label: 'Bate-papo', category: 'voz', voice: 'choir-oo', steps: melody('7 . 9 . 7 . . . 4 . 2 . . . . .') },
  { id: 'miau', label: 'Miau', category: 'voz', voice: 'choir-ah', steps: melody('. . . . 16 . 12 . . . . . 16 . 12 .') },
  { id: 'uh-uh', label: 'Uh-uh', category: 'voz', voice: 'choir-oo', steps: melody('0 . . . -3 . . . 0 . . . 2 . . .') },
];

export const SPRUNK_CATEGORY_LABELS: Readonly<Record<SprunkCategory, string>> = {
  batida: 'Batida',
  efeito: 'Efeito',
  melodia: 'Melodia',
  voz: 'Voz',
};

const SOUNDS_BY_ID = new Map(SPRUNK_SOUNDS.map((sound) => [sound.id, sound]));

export function isSprunkSoundId(soundId: string): boolean {
  return SOUNDS_BY_ID.has(soundId);
}

/** Som do catálogo. Falha alto: um id fora do catálogo é erro de programação. */
export function sprunkSound(soundId: string): SprunkSound {
  const sound = SOUNDS_BY_ID.get(soundId);

  if (!sound) {
    throw new Error(`Som "${soundId}" não existe no catálogo do Pedro Sprunks.`);
  }

  return sound;
}
