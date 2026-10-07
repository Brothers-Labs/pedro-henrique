import { TestBed } from '@angular/core/testing';

import { SideNavService } from './side-nav.service';

const STORAGE_KEY = 'pedro-henrique:side-nav';

describe('SideNavService', () => {
  function createService(isDesktop: boolean): SideNavService {
    spyOn(window, 'matchMedia').and.returnValue({
      matches: isDesktop,
      addEventListener: () => undefined,
      removeEventListener: () => undefined,
    } as unknown as MediaQueryList);

    return TestBed.inject(SideNavService);
  }

  beforeEach(() => localStorage.removeItem(STORAGE_KEY));
  afterEach(() => localStorage.removeItem(STORAGE_KEY));

  describe('no toque', () => {
    it('abre e fecha a gaveta pelo botão do menu', () => {
      const service = createService(false);

      service.toggle();
      expect(service.isDrawerOpen()).toBeTrue();
      expect(service.isExpanded()).toBeTrue();

      service.toggle();
      expect(service.isDrawerOpen()).toBeFalse();
    });

    it('não mexe na preferência do trilho do desktop', () => {
      const service = createService(false);

      service.toggle();

      expect(service.isCollapsed()).toBeFalse();
      expect(localStorage.getItem(STORAGE_KEY)).toBeNull();
    });
  });

  describe('no desktop', () => {
    it('recolhe e expande o trilho e guarda a escolha', () => {
      const service = createService(true);

      service.toggle();
      expect(service.isCollapsed()).toBeTrue();
      expect(service.isExpanded()).toBeFalse();
      expect(localStorage.getItem(STORAGE_KEY)).toBe('collapsed');

      service.toggle();
      expect(service.isCollapsed()).toBeFalse();
      expect(localStorage.getItem(STORAGE_KEY)).toBe('expanded');
    });

    it('lembra o trilho recolhido na próxima visita', () => {
      localStorage.setItem(STORAGE_KEY, 'collapsed');

      expect(createService(true).isCollapsed()).toBeTrue();
    });

    it('nunca abre a gaveta por cima do menu fixo', () => {
      const service = createService(true);

      service.openDrawer();

      expect(service.isDrawerOpen()).toBeFalse();
    });
  });
});
