import { isDarkColor } from '../components/sprunk-figure/sprunk-figure';
import { isSprunkAccessory, isSprunkCostume, isSprunkEyes } from './sprunk-parts.data';
import { SPRUNK_ROSTER } from './sprunk-roster.data';
import { SPRUNK_CATEGORY_LABELS, sprunkSound } from './sprunk-sounds.data';

const CLASSIC_ROSTER = SPRUNK_ROSTER.filter((character) => character.shape === 'classic');

describe('Banda do Pedro Sprunks', () => {
  it('veste só peças do catálogo do criador', () => {
    for (const character of SPRUNK_ROSTER) {
      expect(isSprunkAccessory(character.accessory)).withContext(character.id).toBeTrue();
      expect(isSprunkCostume(character.costume)).withContext(character.id).toBeTrue();
      expect(isSprunkEyes(character.eyes)).withContext(character.id).toBeTrue();
    }
  });

  it('fantasia todos os bonecos de molde e deixa sem fantasia quem não tem corpo de pino', () => {
    const withoutPinBody = SPRUNK_ROSTER.filter((character) => character.shape !== 'classic');

    expect(CLASSIC_ROSTER.every((character) => character.costume !== 'none')).toBeTrue();
    expect(withoutPinBody.map((character) => character.shape).sort()).toEqual(['head', 'iron-ball']);
    expect(withoutPinBody.every((character) => character.costume === 'none')).toBeTrue();
  });

  it('segue a ordem da paleta: batidas, efeitos, melodias e vozes', () => {
    const categoryOrder = Object.keys(SPRUNK_CATEGORY_LABELS);
    const positions = SPRUNK_ROSTER.map((character) => categoryOrder.indexOf(sprunkSound(character.soundId).category));

    expect(positions).toEqual([...positions].sort((first, second) => first - second));
  });

  it('mistura a turma do dia com a turma da noite, de corpo escuro e olhos brilhando', () => {
    const night = CLASSIC_ROSTER.filter((character) => isDarkColor(character.color));
    const day = CLASSIC_ROSTER.filter((character) => !isDarkColor(character.color));

    expect(night.length).toBeGreaterThanOrEqual(5);
    expect(day.length).toBeGreaterThanOrEqual(5);
    expect(night.some((character) => character.eyes === 'glow')).toBeTrue();
  });

  it('põe o fone com antenas nas duas turmas', () => {
    const withAntennaHeadphones = CLASSIC_ROSTER.filter((character) => character.accessory === 'antenna-headphones');

    expect(withAntennaHeadphones.some((character) => isDarkColor(character.color))).toBeTrue();
    expect(withAntennaHeadphones.some((character) => !isDarkColor(character.color))).toBeTrue();
  });

  it('separa cor escura de cor viva pela luma', () => {
    expect(isDarkColor('#1d1b2e')).toBeTrue();
    expect(isDarkColor('#3b2f5c')).toBeTrue();
    expect(isDarkColor('#ffd23f')).toBeFalse();
    expect(isDarkColor('#2f5fd0')).toBeFalse();
  });
});
