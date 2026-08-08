const MILLISECONDS_PER_DAY = 24 * 60 * 60 * 1000;

export interface BirthdayCountdown {
  readonly nextBirthday: Date;
  readonly daysRemaining: number;
  readonly ageOnNextBirthday: number;
  readonly isToday: boolean;
}

/** Idade em anos completos na data de referência. */
export function calculateAgeInYears(birthDate: string, reference: Date = new Date()): number {
  const birth = parseIsoDate(birthDate);
  const today = toUtcMidnight(reference);

  let age = today.getUTCFullYear() - birth.getUTCFullYear();
  const hasHadBirthdayThisYear =
    today.getUTCMonth() > birth.getUTCMonth() ||
    (today.getUTCMonth() === birth.getUTCMonth() && today.getUTCDate() >= birth.getUTCDate());

  if (!hasHadBirthdayThisYear) {
    age -= 1;
  }

  return Math.max(age, 0);
}

/**
 * Calcula quantos dias faltam para o próximo aniversário.
 *
 * Todo o cálculo acontece em UTC à meia-noite para que o resultado não mude
 * conforme o fuso horário de quem acessa o site.
 */
export function calculateBirthdayCountdown(
  birthDate: string,
  reference: Date = new Date(),
): BirthdayCountdown {
  const birth = parseIsoDate(birthDate);
  const today = toUtcMidnight(reference);

  const birthdayThisYear = new Date(
    Date.UTC(today.getUTCFullYear(), birth.getUTCMonth(), birth.getUTCDate()),
  );
  const isToday = birthdayThisYear.getTime() === today.getTime();

  const nextBirthday = isToday || birthdayThisYear > today
    ? birthdayThisYear
    : new Date(Date.UTC(today.getUTCFullYear() + 1, birth.getUTCMonth(), birth.getUTCDate()));

  return {
    nextBirthday,
    daysRemaining: Math.round((nextBirthday.getTime() - today.getTime()) / MILLISECONDS_PER_DAY),
    ageOnNextBirthday: nextBirthday.getUTCFullYear() - birth.getUTCFullYear(),
    isToday,
  };
}

function parseIsoDate(value: string): Date {
  const [year, month, day] = value.split('-').map(Number);
  return new Date(Date.UTC(year, month - 1, day));
}

function toUtcMidnight(date: Date): Date {
  return new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
}
