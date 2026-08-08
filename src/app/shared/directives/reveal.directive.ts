import {
  DestroyRef,
  Directive,
  ElementRef,
  inject,
  input,
  numberAttribute,
  OnInit,
  signal,
} from '@angular/core';

const OBSERVER_OPTIONS: IntersectionObserverInit = {
  threshold: 0.15,
  rootMargin: '0px 0px -60px 0px',
};

/**
 * Revela o elemento com uma animação suave quando ele entra na viewport.
 *
 * O estado é exposto como `data-reveal`, e a animação em si vive no CSS global,
 * que já desliga o efeito para quem prefere menos movimento.
 */
@Directive({
  selector: '[appReveal]',
  host: {
    '[attr.data-reveal]': 'state()',
    '[style.transition-delay.ms]': 'delayInMs()',
  },
})
export class RevealDirective implements OnInit {
  /**
   * Atraso em milissegundos, útil para escalonar itens de uma lista.
   * Usar a diretiva sem valor (`appReveal`) entrega string vazia, por isso o
   * `numberAttribute` recebe 0 como padrão em vez de `NaN`.
   */
  readonly delayInMs = input(0, {
    alias: 'appReveal',
    transform: (value: unknown) => numberAttribute(value, 0),
  });

  private readonly element = inject<ElementRef<HTMLElement>>(ElementRef);
  private readonly destroyRef = inject(DestroyRef);
  protected readonly state = signal<'hidden' | 'visible'>('hidden');

  ngOnInit(): void {
    if (typeof IntersectionObserver === 'undefined') {
      this.state.set('visible');
      return;
    }

    const observer = new IntersectionObserver((entries) => {
      if (entries.some((entry) => entry.isIntersecting)) {
        this.state.set('visible');
        observer.disconnect();
      }
    }, OBSERVER_OPTIONS);

    observer.observe(this.element.nativeElement);
    this.destroyRef.onDestroy(() => observer.disconnect());
  }
}
