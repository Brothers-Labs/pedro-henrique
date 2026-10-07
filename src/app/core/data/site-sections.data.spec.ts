import { NAVIGATION_GROUPS, SITE_SECTIONS } from './site-sections.data';

describe('NAVIGATION_GROUPS', () => {
  it('leva ao menu lateral todas as seções do site, cada uma uma única vez', () => {
    const groupedIds = NAVIGATION_GROUPS.flatMap((group) => group.sections.map((section) => section.id));

    expect([...groupedIds].sort()).toEqual(SITE_SECTIONS.map((section) => section.id).sort());
  });

  it('não tem grupo vazio', () => {
    expect(NAVIGATION_GROUPS.every((group) => group.sections.length > 0)).toBeTrue();
  });
});
