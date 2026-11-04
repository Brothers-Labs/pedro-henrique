import { isDarkColor } from '../components/sprunk-figure/sprunk-figure';
import { isSprunkAccessory, isSprunkCostume, isSprunkEyes } from './sprunk-parts.data';
import { SPRUNK_ROSTER } from './sprunk-roster.data';

const CLASSIC_ROSTER = SPRUNK_ROSTER.filter((character) => character.shape === 'classic');

describe('Banda do Pedro Sprunks', () => {
  it('veste só peças do catálogo do criador', () => {
    for (const character of SPRUNK_ROSTER) {
      expect(isSprunkAccessory(character.accessory)).withContext(character.id).toBeTrue();
      expect(isSprunkCostume(character.costume)).withContext(character.id).toBeTrue();
      expect(isSprunkEyes(character.eyes)).withContext(character.id).toBeTrue();
    }
  });

  it('fantasia todos os bonecos de molde, deixando a bola de ferro como é', () => {
    expect(CLASSIC_ROSTER.every((character) => character.costume !== 'none')).toBeTrue();
    expect(SPRUNK_ROSTER.find((character) => character.shape === 'iron-ball')?.costume).toBe('none');
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
