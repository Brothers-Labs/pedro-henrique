import { SPRUNK_STEPS_PER_BAR, type SprunkStep } from '../models/sprunk.model';

const HIT = 'x';
const REST = '.';

/**
 * Lê um ritmo escrito como texto: `x` toca, `.` descansa.
 *
 * `'x...x...x...x...'` é um bumbo em cada tempo. Escrever assim deixa a
 * partitura legível no próprio catálogo, sem arrays de dezesseis posições.
 */
export function rhythm(pattern: string): readonly SprunkStep[] {
  const steps = [...pattern].map((symbol): SprunkStep => {
    if (symbol === HIT) {
      return 0;
    }

    if (symbol === REST) {
      return null;
    }

    throw new Error(`Símbolo "${symbol}" inválido no ritmo "${pattern}".`);
  });

  return assertBarLength(steps, pattern);
}

/**
 * Lê uma melodia escrita como texto: semitons separados por espaço, a partir
 * do dó central, e `.` para silêncio.
 *
 * `'0 . 4 . 7 . . .'` é dó, mi e sol.
 */
export function melody(pattern: string): readonly SprunkStep[] {
  const steps = pattern
    .trim()
    .split(/\s+/)
    .map((token): SprunkStep => {
      if (token === REST) {
        return null;
      }

      const semitones = Number(token);

      if (!Number.isInteger(semitones)) {
        throw new Error(`Nota "${token}" inválida na melodia "${pattern}".`);
      }

      return semitones;
    });

  return assertBarLength(steps, pattern);
}

function assertBarLength(steps: readonly SprunkStep[], pattern: string): readonly SprunkStep[] {
  if (steps.length !== SPRUNK_STEPS_PER_BAR) {
    throw new Error(
      `O compasso "${pattern}" tem ${steps.length} passos; são esperados ${SPRUNK_STEPS_PER_BAR}.`,
    );
  }

  return steps;
}
