import type { GoalDefinition } from '../../models/content.model';
import { GoalTracker } from './goal-tracker';

const GOALS: readonly GoalDefinition[] = [
  { id: 'get-wood', title: 'Quebre 3 troncos', emoji: '🪵', hint: '', trigger: 'obtain', target: 'oak-log', count: 3 },
  { id: 'place-workbench', title: 'Coloque a mesa', emoji: '📦', hint: '', trigger: 'place', target: 'workbench', count: 1 },
  { id: 'sleep', title: 'Durma', emoji: '🛏️', hint: '', trigger: 'sleep', target: null, count: 1 },
];

describe('Missões do PedroCraft', () => {
  it('soma o progresso da missão da vez e passa para a próxima ao cumprir', () => {
    const tracker = new GoalTracker(GOALS);

    expect(tracker.record({ trigger: 'obtain', target: 'oak-log', count: 2 })).toBeNull();
    expect(tracker.progress).toEqual({ index: 0, amount: 2 });

    expect(tracker.record({ trigger: 'obtain', target: 'oak-log', count: 1 })?.id).toBe('get-wood');
    expect(tracker.current?.id).toBe('place-workbench');
    expect(tracker.progress.amount).toBe(0);
  });

  it('ignora o que não é da missão da vez, mesmo sendo de uma missão futura', () => {
    const tracker = new GoalTracker(GOALS);

    expect(tracker.record({ trigger: 'place', target: 'workbench', count: 1 })).toBeNull();
    expect(tracker.record({ trigger: 'obtain', target: 'stick', count: 5 })).toBeNull();
    expect(tracker.completedCount).toBe(0);
  });

  it('cumpre a missão de dormir, que não tem alvo', () => {
    const tracker = new GoalTracker(GOALS, { index: 2, amount: 0 });

    expect(tracker.record({ trigger: 'sleep', target: null, count: 1 })?.id).toBe('sleep');
    expect(tracker.current).toBeNull();
  });

  it('retoma do progresso guardado e corrige valores fora da lista', () => {
    expect(new GoalTracker(GOALS, { index: 1, amount: 0 }).current?.id).toBe('place-workbench');
    expect(new GoalTracker(GOALS, { index: 99, amount: 4 }).current).toBeNull();
    expect(new GoalTracker(GOALS, { index: -3, amount: -1 }).progress).toEqual({ index: 0, amount: 0 });
  });
});
