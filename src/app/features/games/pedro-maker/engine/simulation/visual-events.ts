/**
 * O que a simulação pede para a tela mostrar, sem saber como.
 *
 * A simulação só anota "explodiu poeira aqui", "treme a câmera"; quem desenha
 * lê a fila a cada quadro. É isso que deixa as regras do jogo testáveis sem
 * placa de vídeo e o desenho trocável sem mexer numa regra.
 *
 * Coordenadas em pixels do mundo, com y crescendo para baixo — as mesmas da
 * física e do validador de fases.
 */

export type BurstKind = 'dust' | 'coin' | 'crystal' | 'poof' | 'sparkle' | 'confetti';

export type ShakeIntensity = 'leve' | 'forte';

export type VisualEvent =
  | { readonly type: 'burst'; readonly kind: BurstKind; readonly x: number; readonly y: number; readonly count: number }
  | { readonly type: 'floating-text'; readonly x: number; readonly y: number; readonly text: string; readonly color: string }
  | { readonly type: 'shake'; readonly intensity: ShakeIntensity }
  | { readonly type: 'flash' }
  /** Moedas que saltam de um bloco surpresa e somem no ar. */
  | { readonly type: 'coin-fountain'; readonly x: number; readonly y: number; readonly count: number };

/** Fila de efeitos de um quadro: a simulação escreve, a tela esvazia. */
export class VisualEventQueue {
  private events: VisualEvent[] = [];

  burst(kind: BurstKind, x: number, y: number, count = 10): void {
    this.events.push({ type: 'burst', kind, x, y, count });
  }

  floatingText(x: number, y: number, text: string, color = '#ffffff'): void {
    this.events.push({ type: 'floating-text', x, y, text, color });
  }

  shake(intensity: ShakeIntensity = 'leve'): void {
    this.events.push({ type: 'shake', intensity });
  }

  flash(): void {
    this.events.push({ type: 'flash' });
  }

  coinFountain(x: number, y: number, count: number): void {
    this.events.push({ type: 'coin-fountain', x, y, count });
  }

  /** Entrega tudo o que se acumulou e recomeça vazia. */
  drain(): readonly VisualEvent[] {
    const drained = this.events;
    this.events = [];

    return drained;
  }
}
