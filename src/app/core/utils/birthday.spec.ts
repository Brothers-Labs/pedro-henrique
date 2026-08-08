import { calculateAgeInYears, calculateBirthdayCountdown } from './birthday';

const BIRTH_DATE = '2019-04-12';

describe('calculateAgeInYears', () => {
  it('conta apenas os anos já completados', () => {
    expect(calculateAgeInYears(BIRTH_DATE, new Date(2026, 7, 7))).toBe(7);
  });

  it('não adianta a idade no dia anterior ao aniversário', () => {
    expect(calculateAgeInYears(BIRTH_DATE, new Date(2026, 3, 11))).toBe(6);
  });

  it('conta o ano novo já no dia do aniversário', () => {
    expect(calculateAgeInYears(BIRTH_DATE, new Date(2026, 3, 12))).toBe(7);
  });
});

describe('calculateBirthdayCountdown', () => {
  it('conta os dias que faltam dentro do mesmo ano', () => {
    const countdown = calculateBirthdayCountdown(BIRTH_DATE, new Date(2026, 3, 2));

    expect(countdown.daysRemaining).toBe(10);
    expect(countdown.ageOnNextBirthday).toBe(7);
    expect(countdown.isToday).toBeFalse();
  });

  it('aponta para o ano seguinte quando o aniversário já passou', () => {
    const countdown = calculateBirthdayCountdown(BIRTH_DATE, new Date(2026, 7, 7));

    expect(countdown.nextBirthday.getUTCFullYear()).toBe(2027);
    expect(countdown.ageOnNextBirthday).toBe(8);
  });

  it('reconhece o próprio dia do aniversário', () => {
    const countdown = calculateBirthdayCountdown(BIRTH_DATE, new Date(2026, 3, 12));

    expect(countdown.isToday).toBeTrue();
    expect(countdown.daysRemaining).toBe(0);
    expect(countdown.ageOnNextBirthday).toBe(7);
  });
});
