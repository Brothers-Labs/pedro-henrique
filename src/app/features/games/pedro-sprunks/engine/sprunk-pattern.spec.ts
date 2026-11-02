import { SPRUNK_ROSTER } from '../data/sprunk-roster.data';
import { isSprunkSoundId, SPRUNK_SOUNDS } from '../data/sprunk-sounds.data';
import { SPRUNK_STEPS_PER_BAR } from '../models/sprunk.model';
import { melody, rhythm } from './sprunk-pattern';

/** Graus da pentatônica de dó: qualquer mistura dessas notas soa bem junta. */
const PENTATONIC_DEGREES = new Set([0, 2, 4, 7, 9]);

describe('Partituras do Pedro Sprunks', () => {
  it('lê ritmos com x para tocar e ponto para descansar', () => {
    expect(rhythm('x...x...x...x...').filter((step) => step !== null).length).toBe(4);
  });

  it('lê melodias em semitons, com ponto para silêncio', () => {
    const steps = melody('0 . 4 . 7 . . . -12 . . . . . . .');

    expect(steps.slice(0, 3)).toEqual([0, null, 4]);
    expect(steps[8]).toBe(-12);
  });

  it('recusa compassos com tamanho errado', () => {
    expect(() => rhythm('x...')).toThrowError(/16/);
    expect(() => melody('0 4 7')).toThrowError(/16/);
  });

  it('recusa símbolos desconhecidos', () => {
    expect(() => rhythm('x...o...x...x...')).toThrowError(/inválido/);
    expect(() => melody('0 . a . . . . . . . . . . . . .')).toThrowError(/inválida/);
  });

  it('escreve todos os sons em compassos completos e na pentatônica', () => {
    for (const sound of SPRUNK_SOUNDS) {
      expect(sound.steps.length).withContext(sound.id).toBe(SPRUNK_STEPS_PER_BAR);

      for (const step of sound.steps) {
        if (step !== null) {
          const degree = ((step % 12) + 12) % 12;
          expect(PENTATONIC_DEGREES.has(degree)).withContext(`${sound.id}: ${step}`).toBeTrue();
        }
      }
    }
  });

  it('dá um som existente e único a cada boneco da banda', () => {
    const soundIds = SPRUNK_ROSTER.map((character) => character.soundId);

    expect(soundIds.every(isSprunkSoundId)).toBeTrue();
    expect(new Set(soundIds).size).toBe(soundIds.length);
    expect(new Set(SPRUNK_ROSTER.map((character) => character.id)).size).toBe(SPRUNK_ROSTER.length);
  });
});
