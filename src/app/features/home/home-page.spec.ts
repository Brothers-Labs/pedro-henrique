import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';

import { HomePage } from './home-page';

describe('HomePage', () => {
  let fixture: ComponentFixture<HomePage>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [HomePage],
      providers: [provideRouter([])],
    }).compileComponents();
    fixture = TestBed.createComponent(HomePage);
    fixture.detectChanges();
  });

  it('renderiza todas as seções da landing page', () => {
    const element: HTMLElement = fixture.nativeElement;

    expect(element.querySelector('app-hero-section')).not.toBeNull();
    expect(element.querySelector('app-about-section')).not.toBeNull();
    expect(element.querySelector('app-powers-section')).not.toBeNull();
    expect(element.querySelector('app-explore-section')).not.toBeNull();
    expect(element.querySelector('app-favorites-section')).not.toBeNull();
    expect(element.querySelector('app-achievements-section')).not.toBeNull();
    expect(element.querySelector('app-birthday-section')).not.toBeNull();
    expect(element.querySelector('app-guestbook-section')).not.toBeNull();
  });

  it('usa um único h1 e liga cada seção ao seu título', () => {
    const element: HTMLElement = fixture.nativeElement;

    expect(element.querySelectorAll('h1').length).toBe(1);

    for (const section of Array.from(element.querySelectorAll('[aria-labelledby]'))) {
      const titleId = section.getAttribute('aria-labelledby');
      expect(element.querySelector(`#${titleId}`))
        .withContext(`título ausente para aria-labelledby="${titleId}"`)
        .not.toBeNull();
    }
  });
});
