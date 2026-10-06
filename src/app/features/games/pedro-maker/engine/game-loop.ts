/** Maior salto de tempo aceito num quadro: depois de uma aba parada, nada atravessa paredes. */
const MAX_FRAME_MS = 50;

/**
 * Chamado a cada quadro da tela.
 *
 * `steps` diz quantos passos de física cabem no tempo que passou (pode ser
 * zero numa tela de 120 Hz); `alpha`, quanto do próximo passo já se passou.
 */
export type FrameHandler = (steps: number, alpha: number, frameMs: number) => void;

/**
 * O relógio do jogo: física em passos fixos, desenho no ritmo da tela.
 *
 * Passo fixo é o que faz o pulo ter a mesma altura num celular de 60 Hz e
 * num de 120 Hz — e o que deixa o validador de fases confiar nos números.
 *
 * O tamanho do passo vem de quem cria o relógio: cada jogo tem a sua física.
 */
export class GameLoop {
  private frame: number | null = null;
  private lastTime: number | null = null;
  private accumulator = 0;

  constructor(
    private readonly onFrame: FrameHandler,
    private readonly stepMs: number,
  ) {}

  get isRunning(): boolean {
    return this.frame !== null;
  }

  start(): void {
    if (this.frame !== null) {
      return;
    }

    this.lastTime = null;
    this.frame = requestAnimationFrame(this.tick);
  }

  stop(): void {
    if (this.frame !== null) {
      cancelAnimationFrame(this.frame);
    }

    this.frame = null;
  }

  private readonly tick = (time: number): void => {
    this.frame = requestAnimationFrame(this.tick);

    const elapsed = this.lastTime === null ? this.stepMs : Math.min(MAX_FRAME_MS, time - this.lastTime);
    this.lastTime = time;
    this.accumulator += elapsed;

    let steps = 0;

    while (this.accumulator >= this.stepMs) {
      this.accumulator -= this.stepMs;
      steps += 1;
    }

    this.onFrame(steps, this.accumulator / this.stepMs, elapsed);
  };
}
