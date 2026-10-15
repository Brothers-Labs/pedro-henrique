const MILLISECONDS_PER_MINUTE = 60_000;
const MINUTES_PER_HOUR = 60;
const MINUTES_PER_DAY = 24 * MINUTES_PER_HOUR;
const DAYS_PER_WEEK = 7;

export interface TimeRemaining {
  readonly days: number;
  readonly hours: number;
  readonly minutes: number;
}

/** Dia local do aparelho, no formato `aaaa-mm-dd`. */
export function dayKey(moment: Date): string {
  const month = String(moment.getMonth() + 1).padStart(2, '0');
  const day = String(moment.getDate()).padStart(2, '0');

  return `${moment.getFullYear()}-${month}-${day}`;
}

/** Começo (meia-noite local) do dia seguinte. */
export function startOfNextDay(moment: Date): Date {
  return new Date(moment.getFullYear(), moment.getMonth(), moment.getDate() + 1);
}

/** Segunda-feira, meia-noite local, da semana do instante. */
export function startOfWeek(moment: Date): Date {
  const daysSinceMonday = (moment.getDay() + DAYS_PER_WEEK - 1) % DAYS_PER_WEEK;

  return new Date(moment.getFullYear(), moment.getMonth(), moment.getDate() - daysSinceMonday);
}

/** Semana local identificada pela segunda-feira em que começa. */
export function weekKey(moment: Date): string {
  return `semana-${dayKey(startOfWeek(moment))}`;
}

export function startOfNextWeek(moment: Date): Date {
  const monday = startOfWeek(moment);

  return new Date(monday.getFullYear(), monday.getMonth(), monday.getDate() + DAYS_PER_WEEK);
}

/** Tempo até o instante pedido, arredondado para baixo no minuto. Nunca negativo. */
export function timeUntil(target: string | Date, now: Date): TimeRemaining {
  const end = typeof target === 'string' ? Date.parse(target) : target.getTime();
  const totalMinutes = Math.max(0, Math.floor((end - now.getTime()) / MILLISECONDS_PER_MINUTE));

  return {
    days: Math.floor(totalMinutes / MINUTES_PER_DAY),
    hours: Math.floor((totalMinutes % MINUTES_PER_DAY) / MINUTES_PER_HOUR),
    minutes: totalMinutes % MINUTES_PER_HOUR,
  };
}

/** Verdadeiro quando `now` está dentro da janela: começo incluído, fim excluído. */
export function isWithin(startsAt: string, endsAt: string, now: Date): boolean {
  const time = now.getTime();

  return time >= Date.parse(startsAt) && time < Date.parse(endsAt);
}
