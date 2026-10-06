/** Tempo de corrida no jeito do cronômetro: `1:05.3`. */
export function formatRaceTime(milliseconds: number): string {
  const tenths = Math.floor(Math.max(0, milliseconds) / 100);
  const minutes = Math.floor(tenths / 600);
  const seconds = Math.floor((tenths % 600) / 10);

  return `${minutes}:${String(seconds).padStart(2, '0')}.${tenths % 10}`;
}

/** Colocação por extenso curto: `1º`, `2º`. */
export function formatPlacement(placement: number): string {
  return `${placement}º`;
}
