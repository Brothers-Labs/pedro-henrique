import { emptyStage, isStageEmpty, isStageFull, removeFromStage, STAGE_SIZE, toggleOnStage } from './sprunk-stage';

describe('Palco do Pedro Sprunks', () => {
  it('começa com todos os lugares vazios', () => {
    const stage = emptyStage();

    expect(stage.length).toBe(STAGE_SIZE);
    expect(isStageEmpty(stage)).toBeTrue();
  });

  it('põe o boneco no primeiro lugar livre', () => {
    const first = toggleOnStage(emptyStage(), 'pipoca');
    const second = toggleOnStage(first.stage, 'tomate');

    expect(first.result).toBe('added');
    expect(second.stage.slice(0, 2)).toEqual(['pipoca', 'tomate']);
  });

  it('tira o boneco que já está no palco sem mover os outros', () => {
    const withTwo = toggleOnStage(toggleOnStage(emptyStage(), 'pipoca').stage, 'tomate').stage;
    const toggled = toggleOnStage(withTwo, 'pipoca');

    expect(toggled.result).toBe('removed');
    expect(toggled.stage.slice(0, 2)).toEqual([null, 'tomate']);
  });

  it('reaproveita o lugar que ficou vazio', () => {
    const withTwo = toggleOnStage(toggleOnStage(emptyStage(), 'pipoca').stage, 'tomate').stage;
    const refilled = toggleOnStage(removeFromStage(withTwo, 'pipoca'), 'safira');

    expect(refilled.stage[0]).toBe('safira');
  });

  it('avisa que o palco está cheio e não muda nada', () => {
    const full = Array.from({ length: STAGE_SIZE }, (_, index) => `boneco-${index}`);
    const toggled = toggleOnStage(full, 'extra');

    expect(isStageFull(full)).toBeTrue();
    expect(toggled.result).toBe('full');
    expect(toggled.stage).toBe(full);
  });
});
