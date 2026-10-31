import { paintCharacterIcon } from '../../../art/texture-catalog';
import { DEFAULT_LOOK, paletteFor } from '../../../config/character.config';
import { characterParts } from './character-parts';

describe('Visual do Wario', () => {
  const palette = paletteFor(DEFAULT_LOOK, 'wario');

  it('tem silhueta larga própria, sem mudar os outros heróis de macacão', () => {
    const wario = characterParts(palette);
    const mario = characterParts(paletteFor(DEFAULT_LOOK, 'mario'));
    expect(wario.shoulderX).toBeGreaterThan(mario.shoulderX);
    expect(wario.hipX).toBeGreaterThan(mario.hipX);
    expect(wario.upperBody.some((part) => part.width > 0.55)).toBeTrue();
    expect(wario.leg.some((part) => part.color === '#22894b')).toBeTrue();
    expect(wario.arm.some((part) => part.color === '#ffffff')).toBeTrue();
  });

  it('mostra nariz rosa e emblema azul na frente do boné em 3D', () => {
    const parts = characterParts(palette);
    expect(parts.upperBody.some((part) => part.color === '#ed8caa' && part.z > 0.25)).toBeTrue();
    const emblem = parts.upperBody.filter((part) => part.color === '#2456a6');
    expect(emblem.length).toBeGreaterThan(4);
    expect(emblem.every((part) => part.z > 0.25)).toBeTrue();
  });

  it('desenha retrato próprio com nariz rosa, luvas brancas e sapatos verdes sem cortar o quadro', () => {
    const canvas = paintCharacterIcon(palette);
    const context = canvas.getContext('2d');
    if (!context) throw new Error('Canvas indisponível');
    const pixels = context.getImageData(0, 0, canvas.width, canvas.height).data;
    const hasColor = (red: number, green: number, blue: number): boolean => {
      for (let index = 0; index < pixels.length; index += 4) {
        if (pixels[index] === red && pixels[index + 1] === green && pixels[index + 2] === blue && pixels[index + 3] === 255) return true;
      }
      return false;
    };
    expect(hasColor(237, 140, 170)).toBeTrue();
    expect(hasColor(34, 137, 75)).toBeTrue();
    expect(hasColor(36, 86, 166)).toBeTrue();
    for (let x = 0; x < canvas.width; x += 1) {
      expect(pixels[x * 4 + 3]).toBe(0);
      expect(pixels[((canvas.height - 1) * canvas.width + x) * 4 + 3]).toBe(0);
    }
  });
});
