/** Os gestos do primeiro minuto, na ordem em que a criança aprende. */
export const FIRST_STEPS = ['move', 'look', 'jump', 'break'] as const;

export type FirstStep = (typeof FIRST_STEPS)[number];

/** Blocos andados para "andar" contar: o bastante para não ser um toque sem querer. */
const WALK_DISTANCE = 3;

/** Giro do olhar, em radianos, para "olhar em volta" contar. */
const LOOK_RADIANS = 1;

/**
 * O guia do primeiro minuto: um gesto de cada vez.
 *
 * O passo só avança quando a criança faz o gesto de verdade — andou, olhou,
 * pulou, quebrou um bloco —, e não quando ela toca em "próximo". Assim ela
 * termina o guia sabendo jogar.
 */
export class FirstStepsGuide {
  private index = 0;
  private walked = 0;
  private looked = 0;

  /** O gesto da vez; `null` quando o guia acabou. */
  get current(): FirstStep | null {
    return FIRST_STEPS[this.index] ?? null;
  }

  get isDone(): boolean {
    return this.current === null;
  }

  /** Cada um destes devolve se o guia avançou, para a tela redesenhar. */
  walk(distance: number): boolean {
    this.walked += distance;

    return this.current === 'move' && this.walked >= WALK_DISTANCE && this.advance();
  }

  look(radians: number): boolean {
    this.looked += Math.abs(radians);

    return this.current === 'look' && this.looked >= LOOK_RADIANS && this.advance();
  }

  jump(): boolean {
    return this.current === 'jump' && this.advance();
  }

  breakBlock(): boolean {
    return this.current === 'break' && this.advance();
  }

  skip(): void {
    this.index = FIRST_STEPS.length;
  }

  private advance(): boolean {
    this.index += 1;

    return true;
  }
}
