import { describeCountdown, formatCountdown, formatNumber, formatStopwatch } from './format';

describe('format', () => {
  it('formata números no padrão brasileiro', () => {
    expect(formatNumber(125600)).toBe('125.600');
  });

  it('formata o cronômetro com centésimos', () => {
    expect(formatStopwatch(84_350)).toBe('01:24.35');
    expect(formatStopwatch(0)).toBe('00:00.00');
  });

  it('formata a contagem regressiva curta e por extenso', () => {
    expect(formatCountdown({ days: 50, hours: 3, minutes: 12 })).toBe('50d 3h 12m');
    expect(formatCountdown({ days: 0, hours: 2, minutes: 5 })).toBe('2h 5m');
    expect(describeCountdown({ days: 1, hours: 2, minutes: 1 })).toBe('1 dia, 2 horas, 1 minuto');
  });
});
