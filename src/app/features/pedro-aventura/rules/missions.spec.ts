import { MISSIONS } from '../config/missions.config';
import { SEASON } from '../config/season.config';
import type { MissionDefinition } from '../models/economy.model';
import { weekKey } from './calendar';
import { advanceMissions, markMissionClaimed, missionStatus } from './missions';

const MONDAY = new Date('2026-10-19T10:00:00-03:00');
const TUESDAY = new Date('2026-10-20T10:00:00-03:00');
const NEXT_MONDAY = new Date('2026-10-26T10:00:00-03:00');

function mission(id: string): MissionDefinition {
  const found = MISSIONS.find((candidate) => candidate.id === id);

  if (!found) {
    throw new Error(`Missão ${id} não existe.`);
  }

  return found;
}

describe('missions', () => {
  const daily = mission('diaria-completar-fase');
  const weekly = mission('semanal-dez-fases');

  it('anda com os eventos da partida e completa ao chegar na meta', () => {
    const records = advanceMissions({}, MISSIONS, { 'levels-completed': 1 }, SEASON, MONDAY);

    expect(missionStatus(records, daily, SEASON, MONDAY).state).toBe('completed');
    expect(missionStatus(records, weekly, SEASON, MONDAY)).toEqual(jasmine.objectContaining({ progress: 1, state: 'in-progress' }));
  });

  it('recomeça a diária no dia seguinte e a semanal na segunda-feira', () => {
    const records = advanceMissions({}, MISSIONS, { 'levels-completed': 1 }, SEASON, MONDAY);

    expect(missionStatus(records, daily, SEASON, TUESDAY).progress).toBe(0);
    expect(missionStatus(records, weekly, SEASON, TUESDAY).progress).toBe(1);
    expect(missionStatus(records, weekly, SEASON, NEXT_MONDAY).progress).toBe(0);
    expect(weekKey(MONDAY)).toBe(weekKey(TUESDAY));
  });

  it('resgata uma vez só e não anda mais depois do resgate', () => {
    const completed = advanceMissions({}, MISSIONS, { 'levels-completed': 1 }, SEASON, MONDAY);
    const claimed = markMissionClaimed(completed, daily, SEASON, MONDAY);

    expect(claimed && missionStatus(claimed, daily, SEASON, MONDAY).state).toBe('claimed');
    expect(claimed && markMissionClaimed(claimed, daily, SEASON, MONDAY)).toBeNull();
    expect(markMissionClaimed({}, daily, SEASON, MONDAY)).toBeNull();
  });

  it('não passa da meta', () => {
    const records = advanceMissions({}, MISSIONS, { 'coins-collected': 999 }, SEASON, MONDAY);

    expect(missionStatus(records, mission('diaria-moedas'), SEASON, MONDAY).progress).toBe(100);
  });
});
