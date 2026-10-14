import { traceRoute } from '../../pedro-kart/tracks/default-tracks';
import { DEFAULT_RUNNER_SETUP } from '../config/runner.config';
import type { RunResult } from '../simulation/run-simulation';
import { sanitizeCustomCourse } from './flash-course.service';
import { reconcileFlashProgress, starsFor } from './flash-progress.service';

const BASE_RESULT: RunResult = {
  mode: 'aventura',
  placement: 1,
  racers: 1,
  timeMs: 20_000,
  raios: 0,
  totalRaios: 50,
  enemiesDefeated: 0,
  hitsTaken: 0,
  parTimeMs: 25_000,
  bossDefeated: false,
};

describe('Progresso guardado do Pedro Flash', () => {
  it('recomeça do padrão quando não há nada legível', () => {
    expect(reconcileFlashProgress(null)).toEqual(jasmine.objectContaining({ setup: DEFAULT_RUNNER_SETUP, runs: 0 }));
    expect(reconcileFlashProgress('lixo').difficulty).toBe('facil');
  });

  it('conserta só o campo estranho, sem perder os recordes', () => {
    const progress = reconcileFlashProgress({
      setup: { shoe: 'patins', trail: 'rosa' },
      difficulty: 'impossivel',
      records: {
        'aventura:avenida-neon': { bestTimeMs: 18_200, bestStars: 9, bestRaios: 40 },
        quebrado: { bestTimeMs: -1 },
      },
      runs: 4.7,
      bossesDefeated: 'muitos',
    });

    expect(progress.setup).toEqual({ shoe: DEFAULT_RUNNER_SETUP.shoe, trail: 'rosa' });
    expect(progress.difficulty).toBe('facil');
    expect(progress.records).toEqual({ 'aventura:avenida-neon': { bestTimeMs: 18_200, bestStars: 3, bestRaios: 40 } });
    expect(progress.runs).toBe(4);
    expect(progress.bossesDefeated).toBe(0);
  });

  it('dá estrelas na aventura pelo tempo de ouro e pelos raios', () => {
    expect(starsFor({ ...BASE_RESULT, timeMs: 30_000 })).toBe(1);
    expect(starsFor(BASE_RESULT)).toBe(2);
    expect(starsFor({ ...BASE_RESULT, raios: 30 })).toBe(3);
  });

  it('dá estrelas na corrida pela colocação e na batalha pelos machucados', () => {
    expect(starsFor({ ...BASE_RESULT, mode: 'corrida', placement: 1 })).toBe(3);
    expect(starsFor({ ...BASE_RESULT, mode: 'corrida', placement: 2 })).toBe(2);
    expect(starsFor({ ...BASE_RESULT, mode: 'corrida', placement: 4 })).toBe(1);
    expect(starsFor({ ...BASE_RESULT, mode: 'batalha', bossDefeated: true, hitsTaken: 0 })).toBe(3);
    expect(starsFor({ ...BASE_RESULT, mode: 'batalha', bossDefeated: true, hitsTaken: 2 })).toBe(2);
    expect(starsFor({ ...BASE_RESULT, mode: 'batalha', bossDefeated: true, hitsTaken: 8 })).toBe(1);
  });

  it('aceita fase guardada sem data e descarta a que ficou curta demais', () => {
    const path = traceRoute({ column: 0, row: 4 }, 'R11');
    const stored = { id: 'fase-1', name: 'Reta', theme: 'praia', path, pieces: [{ cell: 3, kind: 'mola', lane: 0 }] };

    expect(sanitizeCustomCourse(stored)?.createdAt).toBe(new Date(0).toISOString());
    expect(sanitizeCustomCourse(stored)?.pieces).toEqual([{ cell: 3, kind: 'mola', lane: 0 }]);
    expect(sanitizeCustomCourse({ ...stored, path: path.slice(0, 5) })).toBeNull();
  });
});
