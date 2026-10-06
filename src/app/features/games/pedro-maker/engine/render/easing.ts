/**
 * Curvas de animação, de 0 a 1.
 *
 * Todas recebem o progresso (0 no começo, 1 no fim) e devolvem quanto do
 * caminho já foi feito.
 */

/** Cresce passando um pouquinho do tamanho final e volta: o "pulo" de quem aparece. */
export function backOut(progress: number): number {
  if (progress >= 1) {
    return 1;
  }

  const clamped = Math.max(0, progress);
  const overshoot = 1.70158;
  const shifted = clamped - 1;

  return 1 + (overshoot + 1) * shifted ** 3 + overshoot * shifted ** 2;
}

/** Quique ao cair no chão, como uma bola que perde força. */
export function bounceOut(progress: number): number {
  const clamped = Math.min(1, Math.max(0, progress));
  const strength = 7.5625;
  const width = 2.75;

  if (clamped < 1 / width) {
    return strength * clamped * clamped;
  }

  if (clamped < 2 / width) {
    const shifted = clamped - 1.5 / width;

    return strength * shifted * shifted + 0.75;
  }

  if (clamped < 2.5 / width) {
    const shifted = clamped - 2.25 / width;

    return strength * shifted * shifted + 0.9375;
  }

  const shifted = clamped - 2.625 / width;

  return strength * shifted * shifted + 0.984375;
}

/** Sobe e desce em `durationMs`: 0 no começo, 1 no meio, 0 no fim e fora dele. */
export function pulse(elapsedMs: number, durationMs: number): number {
  if (elapsedMs < 0 || elapsedMs > durationMs) {
    return 0;
  }

  return Math.sin((elapsedMs / durationMs) * Math.PI);
}
