import {
  afterNextRender,
  DestroyRef,
  Directive,
  effect,
  ElementRef,
  inject,
  input,
  NgZone,
  untracked,
} from '@angular/core';
import { gsap } from 'gsap';

import {
  type GsapContext,
  type MotionSceneName,
  type MotionTimeline,
  resolveMotionScene,
} from '../../core/animations/motion-scene';
import { MotionPreferenceService } from '../../core/services/motion-preference.service';

const OBSERVER_OPTIONS: IntersectionObserverInit = {
  threshold: 0.2,
  rootMargin: '0px 0px -40px 0px',
};

/**
 * Toca uma cena do GSAP no elemento hospedeiro.
 *
 * Três garantias, nesta ordem de importância:
 *
 * 1. **Escopo.** A cena roda dentro de um `gsap.context()` preso ao host, então
 *    os seletores nunca vazam para o resto da página e o `revert()` devolve o
 *    elemento exatamente ao estado em que ele estava.
 * 2. **Reversibilidade.** Ligar o modo calmo no meio da página reverte a cena
 *    imediatamente, porque a permissão de movimento é um signal.
 * 3. **Zona.** A coreografia roda fora da zona do Angular: um tween a 60 fps
 *    não pode disparar detecção de mudanças a cada frame.
 *
 * O gatilho de viewport usa `IntersectionObserver`, que o navegador já traz —
 * puxar o ScrollTrigger só para isso custaria ~15 kB por nada.
 */
@Directive({ selector: '[appMotionScene]' })
export class MotionSceneDirective {
  readonly scene = input.required<MotionSceneName>({ alias: 'appMotionScene' });

  private readonly host = inject<ElementRef<HTMLElement>>(ElementRef);
  private readonly zone = inject(NgZone);
  private readonly motion = inject(MotionPreferenceService);

  /**
   * Trava de uma via: só marca que o DOM já existe. Não é signal porque nunca
   * volta atrás e ninguém precisa reagir a ela — quem é reativo aqui é a
   * permissão de movimento.
   */
  private isRendered = false;
  private context: GsapContext | null = null;
  private observer: IntersectionObserver | null = null;

  constructor() {
    // O DOM da cena só existe depois da primeira renderização.
    afterNextRender(() => {
      this.isRendered = true;
      this.sync(this.scene(), this.motion.isAllowed());
    });

    // Reage à troca de permissão: ligar o modo calmo reverte a cena na hora.
    effect(() => {
      const scene = this.scene();
      const isMotionAllowed = this.motion.isAllowed();

      untracked(() => this.sync(scene, isMotionAllowed));
    });

    inject(DestroyRef).onDestroy(() => this.dispose());
  }

  private sync(scene: MotionSceneName, isMotionAllowed: boolean): void {
    if (this.isRendered && isMotionAllowed) {
      this.play(scene);
      return;
    }

    this.dispose();
  }

  private play(name: MotionSceneName): void {
    if (this.context) {
      return;
    }

    const root = this.host.nativeElement;
    const scene = resolveMotionScene(name);

    this.zone.runOutsideAngular(() => {
      this.context = gsap.context(() => {
        const timeline = scene.build({ gsap, root });

        if (scene.trigger === 'immediate') {
          timeline.play();
          return;
        }

        this.playWhenVisible(timeline, root);
      }, root);
    });
  }

  private playWhenVisible(timeline: MotionTimeline, root: HTMLElement): void {
    if (typeof IntersectionObserver === 'undefined') {
      timeline.play();
      return;
    }

    this.observer = new IntersectionObserver((entries) => {
      if (!entries.some((entry) => entry.isIntersecting)) {
        return;
      }

      timeline.play();
      this.stopObserving();
    }, OBSERVER_OPTIONS);

    this.observer.observe(root);
  }

  private dispose(): void {
    this.stopObserving();
    this.context?.revert();
    this.context = null;
  }

  private stopObserving(): void {
    this.observer?.disconnect();
    this.observer = null;
  }
}
