import { FirstStepsGuide } from './first-steps';

describe('Guia do primeiro minuto do PedroCraft', () => {
  it('avança só quando a criança faz o gesto da vez', () => {
    const guide = new FirstStepsGuide();

    expect(guide.current).toBe('move');
    expect(guide.jump()).toBeFalse();
    expect(guide.walk(1)).toBeFalse();
    expect(guide.walk(2.5)).toBeTrue();
    expect(guide.current).toBe('look');
    expect(guide.look(-0.6)).toBeFalse();
    expect(guide.look(0.6)).toBeTrue();
    expect(guide.jump()).toBeTrue();
    expect(guide.breakBlock()).toBeTrue();
    expect(guide.isDone).toBeTrue();
  });

  it('pular o guia termina na hora', () => {
    const guide = new FirstStepsGuide();

    guide.skip();

    expect(guide.current).toBeNull();
  });
});
