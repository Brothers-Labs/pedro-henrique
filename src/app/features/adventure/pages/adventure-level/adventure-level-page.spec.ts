import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { RouterTestingHarness } from '@angular/router/testing';

import { GameProgressService } from '../../../../core/services/game-progress.service';
import { ADVENTURE_ROUTES } from '../../adventure.routes';
import { ADVENTURE_RULES } from '../../config/adventure-rules.config';
import { ADVENTURE_WORLDS } from '../../config/adventure-worlds.config';
import { AdventureService } from '../../services/adventure.service';

const KEYS = [
  `pedro-henrique:adventure:v${ADVENTURE_RULES.schemaVersion}`,
  'pedro-henrique:games-progress:v1',
  'pedro-henrique:pet:v1',
];

const VILLAGE = ADVENTURE_WORLDS[0];
const [FIRST_LEVEL, SECOND_LEVEL] = VILLAGE.levels;

async function openLevel(levelId: string): Promise<RouterTestingHarness> {
  TestBed.configureTestingModule({ providers: [provideRouter([{ path: 'aventura', children: ADVENTURE_ROUTES }])] });

  const harness = await RouterTestingHarness.create();
  await harness.navigateByUrl(`/aventura/${VILLAGE.id}/${levelId}`);

  return harness;
}

function buttonWithText(root: HTMLElement, text: string): HTMLButtonElement | undefined {
  return [...root.querySelectorAll<HTMLButtonElement>('button')].find((button) => button.textContent?.includes(text));
}

describe('AdventureLevelPage', () => {
  beforeEach(() => KEYS.forEach((key) => localStorage.removeItem(key)));
  afterEach(() => KEYS.forEach((key) => localStorage.removeItem(key)));

  it('volta para o mapa quando a fase está trancada', async () => {
    const harness = await openLevel(SECOND_LEVEL.id);

    expect(TestBed.inject(AdventureService).levelView(VILLAGE.id, SECOND_LEVEL.id)?.status).toBe('locked');
    expect(harness.routeNativeElement?.textContent).not.toContain(SECOND_LEVEL.title);
  });

  it('joga a fase inteira, trava a resposta no primeiro toque e fecha a fase uma vez só', async () => {
    const harness = await openLevel(FIRST_LEVEL.id);
    const root = harness.routeNativeElement as HTMLElement;
    const games = TestBed.inject(GameProgressService);

    expect(root.textContent).toContain(FIRST_LEVEL.title);

    buttonWithText(root, 'Começar')?.click();
    harness.detectChanges();

    for (let question = 0; question < FIRST_LEVEL.activity.questionCount; question += 1) {
      const [option] = root.querySelectorAll<HTMLButtonElement>('.question__option');

      option.click();
      harness.detectChanges();
      // Um segundo toque na pergunta já respondida não conta de novo.
      option.click();
      harness.detectChanges();

      expect(games.progressOf(VILLAGE.skillGameId).totalPlayed).toBe(question + 1);

      buttonWithText(root, question + 1 === FIRST_LEVEL.activity.questionCount ? 'Ver resultado' : 'Próxima')?.click();
      harness.detectChanges();
    }

    const adventure = TestBed.inject(AdventureService);
    const record = adventure.levelView(VILLAGE.id, FIRST_LEVEL.id)?.record;

    expect(root.textContent).toContain('Fase concluída!');
    expect(record?.attempts).toBe(1);
    expect(adventure.levelView(VILLAGE.id, SECOND_LEVEL.id)?.status).toBe('current');
  });
});
