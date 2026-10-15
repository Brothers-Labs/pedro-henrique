import type { TimeRemaining } from '../rules/calendar';

const NUMBER_FORMAT = new Intl.NumberFormat('pt-BR');

/** 125600 → "125.600". */
export function formatNumber(value: number): string {
  return NUMBER_FORMAT.format(value);
}

/** Cronômetro da fase: 84350 ms → "01:24.35". */
export function formatStopwatch(milliseconds: number): string {
  const totalCentiseconds = Math.floor(milliseconds / 10);
  const minutes = Math.floor(totalCentiseconds / 6000);
  const seconds = Math.floor((totalCentiseconds % 6000) / 100);
  const centiseconds = totalCentiseconds % 100;

  return `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}.${String(centiseconds).padStart(2, '0')}`;
}

/** Contagem regressiva: "50d 14h 12m"; sem dias, "14h 12m". */
export function formatCountdown(time: TimeRemaining): string {
  const parts = time.days > 0 ? [`${time.days}d`, `${time.hours}h`, `${time.minutes}m`] : [`${time.hours}h`, `${time.minutes}m`];

  return parts.join(' ');
}

/** Contagem regressiva por extenso, para leitores de tela. */
export function describeCountdown(time: TimeRemaining): string {
  const plural = (value: number, singular: string, many: string) => `${value} ${value === 1 ? singular : many}`;

  return [plural(time.days, 'dia', 'dias'), plural(time.hours, 'hora', 'horas'), plural(time.minutes, 'minuto', 'minutos')].join(', ');
}
