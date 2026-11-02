import type { SprunkDraft } from '../models/sprunk.model';
import { isValidDraft, MAX_SPRUNK_NAME_LENGTH, normalizeSprunkName, parseStoredSprunks } from './my-sprunks.service';

const VALID_DRAFT: SprunkDraft = {
  name: 'Trovão',
  color: '#2f5fd0',
  accessory: 'crown',
  eyes: 'star',
  action: 'spin',
  soundId: 'sino',
};

describe('Meus personagens do Pedro Sprunks', () => {
  it('aceita um rascunho completo', () => {
    expect(isValidDraft(VALID_DRAFT)).toBeTrue();
  });

  it('recusa nome vazio, cor inválida, som inexistente e a ação exclusiva da bola de ferro', () => {
    expect(isValidDraft({ ...VALID_DRAFT, name: '   ' })).toBeFalse();
    expect(isValidDraft({ ...VALID_DRAFT, color: 'red' })).toBeFalse();
    expect(isValidDraft({ ...VALID_DRAFT, soundId: 'nao-existe' })).toBeFalse();
    expect(isValidDraft({ ...VALID_DRAFT, action: 'lunge' })).toBeFalse();
  });

  it('limpa espaços e corta nomes longos', () => {
    expect(normalizeSprunkName('  Super   Trovão  ')).toBe('Super Trovão');
    expect(normalizeSprunkName('x'.repeat(40)).length).toBe(MAX_SPRUNK_NAME_LENGTH);
  });

  it('lê os bonecos guardados e descarta os estragados', () => {
    const raw = JSON.stringify([
      { ...VALID_DRAFT, id: 'meu-1' },
      { ...VALID_DRAFT, id: 'meu-2', accessory: 'capa-invisivel' },
      { id: 'meu-3' },
      'texto solto',
      null,
    ]);

    const characters = parseStoredSprunks(raw);

    expect(characters.map((character) => character.id)).toEqual(['meu-1']);
    expect(characters[0].isCustom).toBeTrue();
    expect(characters[0].shape).toBe('classic');
  });

  it('devolve lista vazia para storage ausente ou corrompido', () => {
    expect(parseStoredSprunks(null)).toEqual([]);
    expect(parseStoredSprunks('{não é json')).toEqual([]);
    expect(parseStoredSprunks('{"id":"sozinho"}')).toEqual([]);
  });
});
