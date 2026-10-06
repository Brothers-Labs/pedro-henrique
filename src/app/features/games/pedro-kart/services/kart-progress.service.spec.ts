import { DEFAULT_KART_SETUP } from '../config/kart.config';
import { sanitizeCustomTrack } from './kart-track.service';
import { reconcileKartProgress, starsFor } from './kart-progress.service';

describe('Garagem guardada do Pedro Kart', () => {
  it('recomeça do padrão quando não há nada legível', () => {
    expect(reconcileKartProgress(null)).toEqual(jasmine.objectContaining({ setup: DEFAULT_KART_SETUP, races: 0 }));
    expect(reconcileKartProgress('lixo').difficulty).toBe('facil');
  });

  it('conserta só o campo estranho, sem perder os recordes', () => {
    const progress = reconcileKartProgress({
      setup: { body: 'nave', color: 'rosa' },
      difficulty: 'impossivel',
      records: {
        'praia-do-sol': { bestTimeMs: 61_500, bestPlacement: 2 },
        quebrado: { bestTimeMs: -1, bestPlacement: 0 },
      },
      races: 4.7,
      wins: 'muitas',
    });

    expect(progress.setup).toEqual({ body: DEFAULT_KART_SETUP.body, color: 'rosa' });
    expect(progress.difficulty).toBe('facil');
    expect(progress.records).toEqual({ 'praia-do-sol': { bestTimeMs: 61_500, bestPlacement: 2 } });
    expect(progress.races).toBe(4);
    expect(progress.wins).toBe(0);
  });

  it('dá três estrelas para o primeiro, duas para o pódio e uma para quem chegou', () => {
    expect(starsFor(1)).toBe(3);
    expect(starsFor(3)).toBe(2);
    expect(starsFor(6)).toBe(1);
  });

  it('aceita pista guardada sem data e descarta a que não fecha', () => {
    const path = [
      { column: 1, row: 1 },
      { column: 2, row: 1 },
      { column: 3, row: 1 },
      { column: 3, row: 2 },
      { column: 3, row: 3 },
      { column: 2, row: 3 },
      { column: 1, row: 3 },
      { column: 1, row: 2 },
    ];
    const stored = { id: 'pista-1', name: 'Oito', theme: 'gelo', laps: 2, path, boostCells: [], itemCells: [] };

    expect(sanitizeCustomTrack(stored)?.createdAt).toBe(new Date(0).toISOString());
    expect(sanitizeCustomTrack({ ...stored, path: path.slice(0, 7) })).toBeNull();
  });
});
