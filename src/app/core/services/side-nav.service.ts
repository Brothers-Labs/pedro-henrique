import { computed, DestroyRef, inject, Injectable, signal } from '@angular/core';

const STORAGE_KEY = 'pedro-henrique:side-nav';
const COLLAPSED_VALUE = 'collapsed';
const EXPANDED_VALUE = 'expanded';

/**
 * A partir daqui o menu fica fixo ao lado do conteúdo. É o mesmo ponto em que
 * a barra inferior sai de cena (`$breakpoint-xl` e `--bottom-nav-height`).
 */
const DOCKED_MEDIA_QUERY = '(min-width: 80rem)';

/**
 * Estado do menu lateral, compartilhado pelo botão do cabeçalho, pela barra
 * inferior e pelo próprio menu.
 *
 * O menu tem duas formas, e o mesmo botão comanda as duas:
 * - no toque, é uma gaveta que abre por cima da página;
 * - no desktop, fica fixo e pode ser recolhido até virar um trilho de ícones.
 *   Essa escolha é guardada no aparelho.
 */
@Injectable({ providedIn: 'root' })
export class SideNavService {
  private readonly dockedState = signal(matchesDockedLayout());
  private readonly collapsedState = signal(readCollapsedPreference());
  private readonly drawerOpenState = signal(false);

  readonly isDocked = this.dockedState.asReadonly();
  readonly isCollapsed = this.collapsedState.asReadonly();
  readonly isDrawerOpen = this.drawerOpenState.asReadonly();

  /** Se os nomes das seções estão à vista, qualquer que seja a forma do menu. */
  readonly isExpanded = computed(() =>
    this.dockedState() ? !this.collapsedState() : this.drawerOpenState(),
  );

  constructor() {
    this.watchLayout();
  }

  toggle(): void {
    if (this.dockedState()) {
      this.setCollapsed(!this.collapsedState());
      return;
    }

    this.drawerOpenState.update((isOpen) => !isOpen);
  }

  openDrawer(): void {
    if (!this.dockedState()) {
      this.drawerOpenState.set(true);
    }
  }

  closeDrawer(): void {
    this.drawerOpenState.set(false);
  }

  private setCollapsed(isCollapsed: boolean): void {
    this.collapsedState.set(isCollapsed);

    try {
      localStorage.setItem(STORAGE_KEY, isCollapsed ? COLLAPSED_VALUE : EXPANDED_VALUE);
    } catch {
      // Navegador em modo privado: a escolha vale só para a sessão atual.
    }
  }

  /** Girar o tablet ou redimensionar a janela troca a forma do menu na hora. */
  private watchLayout(): void {
    if (typeof matchMedia !== 'function') {
      return;
    }

    const query = matchMedia(DOCKED_MEDIA_QUERY);
    const handleChange = (event: MediaQueryListEvent): void => {
      this.dockedState.set(event.matches);

      // Uma gaveta aberta não pode sobrar por cima do menu fixo.
      if (event.matches) {
        this.closeDrawer();
      }
    };

    query.addEventListener('change', handleChange);
    inject(DestroyRef).onDestroy(() => query.removeEventListener('change', handleChange));
  }
}

function matchesDockedLayout(): boolean {
  return typeof matchMedia === 'function' && matchMedia(DOCKED_MEDIA_QUERY).matches;
}

function readCollapsedPreference(): boolean {
  try {
    return localStorage.getItem(STORAGE_KEY) === COLLAPSED_VALUE;
  } catch {
    return false;
  }
}
