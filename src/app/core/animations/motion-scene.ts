/**
 * Cenas de movimento do site.
 *
 * Cada cena é uma função pura que recebe a instância do GSAP e devolve uma
 * timeline pausada; quem decide quando tocar é a diretiva `appMotionScene`.
 * Nenhum componente de tela conhece o GSAP: eles apenas aplicam a diretiva e
 * marcam os elementos participantes com `data-motion`.
 *
 * `data-motion` existe para que a animação não dependa de classe de estilo —
 * renomear uma classe no SCSS não pode quebrar silenciosamente uma cena.
 *
 * Toda cena usa `from()`: o estado final é sempre a página como ela já é hoje,
 * então desligar o movimento nunca esconde conteúdo.
 */

export type GsapStatic = (typeof import('gsap'))['gsap'];
export type GsapContext = ReturnType<GsapStatic['context']>;
export type MotionTimeline = ReturnType<GsapStatic['timeline']>;

export type MotionSceneName = 'hero' | 'powers' | 'explore';

/** `immediate` toca assim que a cena monta; `viewport`, quando ela aparece na tela. */
export type MotionTrigger = 'immediate' | 'viewport';

export interface MotionSceneContext {
  readonly gsap: GsapStatic;
  readonly root: HTMLElement;
}

interface MotionSceneDefinition {
  readonly trigger: MotionTrigger;
  readonly build: (context: MotionSceneContext) => MotionTimeline;
}

/** Abertura da home: o dono do site entra, e o texto vem atrás dele. */
const heroScene: MotionSceneDefinition = {
  trigger: 'immediate',
  build: ({ gsap }) =>
    gsap
      .timeline({ paused: true, defaults: { duration: 0.6, ease: 'power2.out' } })
      .from('[data-motion="hero-avatar"]', {
        autoAlpha: 0,
        scale: 0.72,
        duration: 0.7,
        ease: 'back.out(1.5)',
      })
      .from('[data-motion="hero-line"]', { autoAlpha: 0, y: 24, stagger: 0.08 }, '-=0.35')
      .from(
        '[data-motion="hero-fact"]',
        { autoAlpha: 0, y: 16, duration: 0.45, stagger: 0.06 },
        '-=0.2',
      ),
};

/**
 * Barras de superpoder enchendo quando entram na tela.
 *
 * A largura final continua sendo a do dado (`[style.width.%]`); o que anima é
 * `scaleX`, que roda no compositor e não dispara layout a cada frame.
 */
const powersScene: MotionSceneDefinition = {
  trigger: 'viewport',
  build: ({ gsap }) =>
    gsap.timeline({ paused: true }).from('[data-motion="power-meter"]', {
      scaleX: 0,
      transformOrigin: 'left center',
      duration: 0.8,
      ease: 'power2.out',
      stagger: 0.08,
      clearProps: 'transform',
    }),
};

/** Cartões de exploração entrando em cascata: são as portas do site. */
const exploreScene: MotionSceneDefinition = {
  trigger: 'viewport',
  build: ({ gsap }) =>
    gsap.timeline({ paused: true }).from('[data-motion="explore-card"]', {
      autoAlpha: 0,
      y: 28,
      duration: 0.55,
      ease: 'power2.out',
      stagger: 0.07,
      clearProps: 'transform,opacity,visibility',
    }),
};

const MOTION_SCENES: Readonly<Record<MotionSceneName, MotionSceneDefinition>> = {
  hero: heroScene,
  powers: powersScene,
  explore: exploreScene,
};

export function resolveMotionScene(name: MotionSceneName): MotionSceneDefinition {
  return MOTION_SCENES[name];
}
