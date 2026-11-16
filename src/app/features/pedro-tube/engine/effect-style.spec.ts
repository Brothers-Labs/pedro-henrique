import { NEUTRAL_FILTER, OVERLAY_OPTIONS, PRESET_EFFECTS } from '../data/tube-effects.data';
import { readableTextColor } from './colors';
import { filterToCss, overlayFlow, particlesFor } from './effect-style';

describe('Efeitos do PedroTube', () => {
  it('o filtro neutro não muda nada na imagem', () => {
    expect(filterToCss(NEUTRAL_FILTER)).toBe('none');
  });

  it('só os ajustes mexidos entram no CSS, na ordem certa', () => {
    expect(filterToCss({ ...NEUTRAL_FILTER, brightness: 120, grayscale: 100, blur: 2 })).toBe('brightness(120%) grayscale(100%) blur(2px)');
    expect(filterToCss({ ...NEUTRAL_FILTER, hue: 360 })).withContext('uma volta inteira é o mesmo que nada').toBe('none');
    expect(filterToCss({ ...NEUTRAL_FILTER, hue: 90, sepia: 40, invert: 100, contrast: 80, saturation: 0 })).toBe(
      'contrast(80%) saturate(0%) hue-rotate(90deg) sepia(40%) invert(100%)',
    );
  });

  it('cada tipo de partícula tem um jeito de se mexer; "nada" não tem partícula', () => {
    expect(overlayFlow('nenhum')).toBeNull();
    expect(particlesFor('nenhum')).toEqual([]);
    expect(overlayFlow('neve')).toBe('cai');
    expect(overlayFlow('coracoes')).toBe('sobe');
    expect(overlayFlow('raios')).toBe('pisca');

    for (const option of OVERLAY_OPTIONS.filter((candidate) => candidate.value !== 'nenhum')) {
      expect(particlesFor(option.value).length).withContext(option.label).toBeGreaterThan(5);
    }
  });

  it('as partículas ficam dentro da tela e saem sempre no mesmo lugar', () => {
    const particles = particlesFor('confete');

    expect(particlesFor('confete')).toEqual(particles);
    expect(particles.every((particle) => particle.left >= 0 && particle.left <= 100 && particle.top >= 0 && particle.top <= 100)).toBeTrue();
    expect(particles.every((particle) => particle.duration > 0 && particle.delay >= 0 && particle.size > 0)).toBeTrue();
    expect(new Set(particles.map((particle) => particle.left)).size).withContext('espalhadas, não empilhadas').toBeGreaterThan(10);
  });

  it('os efeitos prontos têm nomes e ids únicos, e o primeiro é o normal', () => {
    expect(PRESET_EFFECTS[0].id).toBe('normal');
    expect(filterToCss(PRESET_EFFECTS[0].filter)).toBe('none');
    expect(new Set(PRESET_EFFECTS.map((effect) => effect.id)).size).toBe(PRESET_EFFECTS.length);
    expect(new Set(PRESET_EFFECTS.map((effect) => effect.name)).size).toBe(PRESET_EFFECTS.length);
  });

  it('o texto da cena fica escuro no fundo claro e branco no escuro', () => {
    expect(readableTextColor('#ffb703')).toBe('#1b1530');
    expect(readableTextColor('#d5f0ff')).toBe('#1b1530');
    expect(readableTextColor('#2a2350')).toBe('#ffffff');
    expect(readableTextColor('#e5243b')).toBe('#ffffff');
    expect(readableTextColor('vermelho')).withContext('cor estranha cai no branco').toBe('#ffffff');
  });
});
